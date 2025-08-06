const { v4: uuidv4 } = require('uuid');
const { 
  MatchStatus, 
  GameType, 
  TeamColor, 
  GameSlot,
  PlayerRole,
  getTeamFromRole,
  getGameSlotFromRole,
  createPlayerRole
} = require('./matchTypes');
const { PieceColor, CONTROL_ZONES } = require('./types');
const { createInitialBoard, makeMove, isValidMove, calculateAllControlZoneStatuses } = require('./gameLogic');
const UpgradeManager = require('./upgradeManager');
const { PokerGameState } = require('./pokerGameState');
const { canAffordPiece, getPiecePrice } = require('./pieceDefinitions');
const { checkGameStatus } = require('./winConditions');

class MatchManager {
  constructor() {
    this.matches = new Map();
    this.playerSockets = new Map(); // Maps socketId to { matchId, role }
  }

  // Create a new match
  createMatch(creatorSocketId, creatorName, preferredTeam = null, preferredGameSlot = null) {
    const matchId = uuidv4();
    const upgradeManager = new UpgradeManager();
    const upgradeState = upgradeManager.getUpgradeState();
    
    const match = {
      id: matchId,
      status: MatchStatus.WAITING,
      teams: {
        [TeamColor.WHITE]: {
          economy: upgradeState.economy.white,
          upgrades: upgradeState.upgrades.white,
          barracks: [], // Array of pieces waiting to be placed
          players: {
            [GameSlot.A]: null,
            [GameSlot.B]: null
          }
        },
        [TeamColor.BLACK]: {
          economy: upgradeState.economy.black,
          upgrades: upgradeState.upgrades.black,
          barracks: [], // Array of pieces waiting to be placed
          players: {
            [GameSlot.A]: null,
            [GameSlot.B]: null
          }
        }
      },
      games: {
        [GameSlot.A]: {
          type: GameType.CHESS,
          board: createInitialBoard(),
          currentPlayer: PieceColor.WHITE,
          moveHistory: [],
          controlZones: CONTROL_ZONES,
          gameSpecificState: {}
        },
        [GameSlot.B]: {
          type: GameType.GAME_B,
          state: new PokerGameState(),
          currentPlayer: PieceColor.WHITE
        }
      },
      sharedState: {
        upgradeManager: upgradeManager,
        winCondition: null, // null | TeamColor.WHITE | TeamColor.BLACK
        winReason: null
      },
      createdAt: new Date(),
      lastActivity: new Date()
    };

    // Assign creator to their preferred slot or first available
    const assignedRole = this._assignPlayerToMatch(
      match, 
      creatorSocketId, 
      creatorName, 
      preferredTeam, 
      preferredGameSlot
    );

    this.matches.set(matchId, match);
    this.playerSockets.set(creatorSocketId, { matchId, role: assignedRole });
    
    return { match, assignedRole };
  }

  // Join an existing match
  joinMatch(matchId, joinerSocketId, joinerName, preferredTeam = null, preferredGameSlot = null) {
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (match.status !== MatchStatus.WAITING) {
      throw new Error('Match is not accepting new players');
    }
    
    // Check if match is full
    const playerCount = this._getPlayerCount(match);
    if (playerCount >= 4) {
      throw new Error('Match is full');
    }

    // Assign player to slot
    const assignedRole = this._assignPlayerToMatch(
      match, 
      joinerSocketId, 
      joinerName, 
      preferredTeam, 
      preferredGameSlot
    );

    this.playerSockets.set(joinerSocketId, { matchId, role: assignedRole });

    // Check if match should start (all 4 players joined)
    if (this._getPlayerCount(match) === 4) {
      match.status = MatchStatus.ACTIVE;
      match.lastActivity = new Date();
      
      // Start poker game if both poker players are present
      const pokerGame = match.games[GameSlot.B].state;
      if (pokerGame.players.size === 2) {
        try {
          // Get team economies for blind payment
          const teamEconomies = {
            white: { liquid: match.teams.white.economy },
            black: { liquid: match.teams.black.economy }
          };
          
          pokerGame.startNewHand(teamEconomies);
          
          // Deduct blinds from team economies
          const dealerPlayer = pokerGame.getDealerPlayer();
          const bigBlindPlayer = pokerGame.getBigBlindPlayer();
          
          match.teams[dealerPlayer.team].economy -= pokerGame.smallBlind;
          match.teams[bigBlindPlayer.team].economy -= pokerGame.bigBlind;
          
          // Track blind payments so we don't double-deduct
          match.teams[dealerPlayer.team].lastBetAmount = pokerGame.smallBlind;
          match.teams[bigBlindPlayer.team].lastBetAmount = pokerGame.bigBlind;
          
          pokerGame.dealHoleCards();
          console.log('Started poker game automatically with blinds paid');
          console.log('Pot after blinds:', pokerGame.pot);
        } catch (error) {
          console.error('Error starting poker game:', error);
        }
      }
    }
    
    return { match, assignedRole };
  }

  // Make a move in a specific game
  makeGameMove(socketId, gameSlot, from, to) {
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) {
      throw new Error('Player not found');
    }

    const { matchId, role } = playerInfo;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    if (match.status !== MatchStatus.ACTIVE) {
      throw new Error('Match is not active');
    }

    // Check if player is in the correct game
    const playerGameSlot = getGameSlotFromRole(role);
    if (playerGameSlot !== gameSlot) {
      throw new Error('Player is not in this game');
    }

    const playerTeam = getTeamFromRole(role);
    const game = match.games[gameSlot];

    // For now, only handle chess moves
    if (game.type !== GameType.CHESS) {
      throw new Error('Game B moves not yet implemented');
    }

    if (playerTeam !== game.currentPlayer) {
      throw new Error('Not your turn');
    }

    if (!isValidMove(game.board, from, to, playerTeam, match.teams[playerTeam].upgrades, match.sharedState.upgradeManager)) {
      throw new Error('Invalid move');
    }

    // Make the move
    const piece = game.board[from.row][from.col];
    const capturedPiece = game.board[to.row][to.col];
    
    game.board = makeMove(game.board, from, to);
    
    // Award capture income if a piece was captured
    if (capturedPiece) {
      match.sharedState.upgradeManager.awardCaptureIncome(playerTeam);
      // Update team economy
      const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
      match.teams[playerTeam].economy = upgradeState.economy[playerTeam];
    }
    
    // Add to move history
    const move = {
      from,
      to,
      piece,
      capturedPiece,
      player: playerTeam,
      timestamp: new Date()
    };
    game.moveHistory.push(move);

    // Process turn end for the current player
    const controlledZones = this._countControlledZones(game, playerTeam);
    match.sharedState.upgradeManager.processTurnEnd(playerTeam, controlledZones);
    
    // Update control zone upgrades
    match.sharedState.upgradeManager.activateControlZoneUpgrades(game.controlZones, game.board);
    
    // Update match state with latest upgrade/economy info
    const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
    match.teams[TeamColor.WHITE].upgrades = upgradeState.upgrades.white;
    match.teams[TeamColor.WHITE].economy = upgradeState.economy.white;
    match.teams[TeamColor.BLACK].upgrades = upgradeState.upgrades.black;
    match.teams[TeamColor.BLACK].economy = upgradeState.economy.black;

    // Check for win conditions after the move
    const gameStatus = checkGameStatus(game.board);
    if (gameStatus !== 'playing') {
      // Game has ended
      match.status = MatchStatus.COMPLETED;
      if (gameStatus === 'white_wins') {
        match.sharedState.winCondition = TeamColor.WHITE;
        match.sharedState.winReason = 'all_kings_captured';
        console.log('White team wins - all black kings captured!');
      } else if (gameStatus === 'black_wins') {
        match.sharedState.winCondition = TeamColor.BLACK;
        match.sharedState.winReason = 'all_kings_captured';
        console.log('Black team wins - all white kings captured!');
      }
    }

    // Switch turns (only if game is still active)
    if (match.status === MatchStatus.ACTIVE) {
      game.currentPlayer = game.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    }
    
    match.lastActivity = new Date();

    return {
      match,
      move,
      gameStatus: gameStatus,
      winCondition: match.sharedState.winCondition,
      winReason: match.sharedState.winReason
    };
  }

  // Make a poker action
  makePokerAction(socketId, action, amount = 0) {
    console.log('makePokerAction called:', { socketId, action, amount });
    
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) {
      throw new Error('Player not found');
    }

    const { matchId, role } = playerInfo;
    console.log('Player info:', { matchId, role });
    
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    const playerTeam = getTeamFromRole(role);
    console.log('Player team:', playerTeam);
    
    const playerGameSlot = getGameSlotFromRole(role);
    console.log('Player game slot:', playerGameSlot);
    
    if (playerGameSlot !== GameSlot.B) {
      throw new Error('Player is not in poker game');
    }
    
    const pokerGame = match.games[GameSlot.B].state;
    
    // Get team economy
    const teamEconomy = {
      liquid: match.teams[playerTeam].economy
    };
    
    try {
      // Process the action
      const result = pokerGame.processBettingAction(playerTeam, action, amount, teamEconomy);
      
      // Update team economy based on betting
      const player = pokerGame.players.get(playerTeam);
      const previousBet = match.teams[playerTeam].lastBetAmount || 0;
      
      // Only deduct money for non-fold actions (fold doesn't cost anything)
      let economyChange = 0;
      if (action !== 'fold') {
        economyChange = player.totalBetThisRound - previousBet;
        match.teams[playerTeam].economy -= economyChange;
        match.teams[playerTeam].lastBetAmount = player.totalBetThisRound;
      }
      
      console.log(`${playerTeam} ${action}: totalBetThisRound=${player.totalBetThisRound}, previousBet=${previousBet}, economyChange=${economyChange}`);
      
      // Check if we just entered showdown phase
      if (result.enteredShowdown || pokerGame.phase === 'showdown') {
        console.log('Entered showdown phase, completing hand...');
        this.completePokerHand(match);
      }
      // Also check if only one player remains (everyone else folded)
      else if (pokerGame.isHandComplete()) {
        console.log('Hand complete (player folded), completing hand...');
        this.completePokerHand(match);
      }
      
      match.lastActivity = new Date();
      
      return {
        success: true,
        result: result,
        match: match
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  completePokerHand(match) {
    const pokerGame = match.games[GameSlot.B].state;
    
    let winners = [];
    let showdownResult = null;
    
    // Check if we're at showdown or if only one player remains
    const activePlayers = [];
    pokerGame.players.forEach((player, team) => {
      if (!player.folded) {
        activePlayers.push(team);
      }
    });
    
    if (activePlayers.length === 1) {
      // Only one player remains, they win by default
      winners = activePlayers;
      console.log(`${winners[0]} team wins by default (opponent folded)`);
      
      // Create a fold result similar to showdown result
      showdownResult = {
        winners: winners,
        winningHand: null,
        playerHands: {},
        winReason: 'fold'
      };
    } else if (pokerGame.phase === 'showdown') {
      // Evaluate hands at showdown
      try {
        showdownResult = pokerGame.evaluateShowdown();
        winners = showdownResult.winners;
        console.log(`Showdown winners: ${winners.join(', ')}`);
        if (showdownResult.winningHand) {
          console.log(`Winning hand: ${showdownResult.winningHand.description}`);
        }
      } catch (error) {
        console.error('Error evaluating showdown:', error);
        // Fall back to giving pot to remaining players
        winners = activePlayers;
      }
    }
    
    if (winners.length > 0) {
      // Split pot among winners
      console.log(`Pot size: ${pokerGame.pot}, Winners: ${winners.join(', ')}`);
      const potShare = Math.floor(pokerGame.pot / winners.length);
      winners.forEach(winner => {
        const beforeEconomy = match.teams[winner].economy;
        match.teams[winner].economy += potShare;
        console.log(`${winner} team wins ${potShare} chips (economy: ${beforeEconomy} -> ${match.teams[winner].economy})`);
      });
      
      // Reset last bet amounts
      match.teams.white.lastBetAmount = 0;
      match.teams.black.lastBetAmount = 0;
      
      // Store showdown result for display
      if (showdownResult) {
        pokerGame.lastShowdownResult = showdownResult;
      }
      
      // Complete the hand and wait for players to be ready
      pokerGame.completeHand(showdownResult);
      console.log('Poker hand completed, phase is now:', pokerGame.phase);
    }
  }

  // Handle player ready for next poker hand
  setPokerPlayerReady(socketId, isReady = true) {
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) {
      throw new Error('Player not found');
    }

    const { matchId, role } = playerInfo;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    const playerTeam = getTeamFromRole(role);
    const gameSlot = getGameSlotFromRole(role);
    
    // Only poker players can signal ready
    if (gameSlot !== GameSlot.B) {
      throw new Error('Only poker players can signal ready for next hand');
    }
    
    const pokerGame = match.games[GameSlot.B].state;
    
    // Check if we're in the right phase
    if (pokerGame.phase !== 'waiting_for_ready') {
      throw new Error('Not waiting for players to be ready');
    }
    
    // Set the player's ready state
    const allReady = pokerGame.setPlayerReady(playerTeam, isReady);
    
    // If all players are ready, start the new hand
    if (allReady) {
      console.log('Both players ready, starting new hand');
      
      // Clear ready states first
      pokerGame.resetReadyStates();
      
      // Start the new hand (this will rotate positions once)
      const teamEconomies = {
        white: { liquid: match.teams.white.economy },
        black: { liquid: match.teams.black.economy }
      };
      
      pokerGame.startNewHand(teamEconomies);
      
      // Deduct blinds from team economies (payBlinds only adds to pot)
      const dealerPlayer = pokerGame.getDealerPlayer();
      const bigBlindPlayer = pokerGame.getBigBlindPlayer();
      
      match.teams[dealerPlayer.team].economy -= pokerGame.smallBlind;
      match.teams[bigBlindPlayer.team].economy -= pokerGame.bigBlind;
      
      // Track blind payments so we don't double-deduct
      match.teams[dealerPlayer.team].lastBetAmount = pokerGame.smallBlind;
      match.teams[bigBlindPlayer.team].lastBetAmount = pokerGame.bigBlind;
      
      pokerGame.dealHoleCards();
      
      console.log(`All players ready - started new poker hand with dealer: ${dealerPlayer.team}`);
      console.log(`Blinds paid - ${dealerPlayer.team}: -${pokerGame.smallBlind}, ${bigBlindPlayer.team}: -${pokerGame.bigBlind}`);
    }
    
    return {
      success: true,
      allReady,
      playersReady: Array.from(pokerGame.playersReady.entries())
    };
  }

  // Purchase an upgrade for a team
  purchaseUpgrade(socketId, upgradeId) {
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) {
      throw new Error('Player not found');
    }

    const { matchId, role } = playerInfo;
    const match = this.matches.get(matchId);
    
    if (!match) {
      throw new Error('Match not found');
    }
    
    const playerTeam = getTeamFromRole(role);
    
    try {
      match.sharedState.upgradeManager.purchaseUpgrade(playerTeam, upgradeId);
      
      // Update match state with latest upgrade/economy info
      const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
      match.teams[TeamColor.WHITE].upgrades = upgradeState.upgrades.white;
      match.teams[TeamColor.WHITE].economy = upgradeState.economy.white;
      match.teams[TeamColor.BLACK].upgrades = upgradeState.upgrades.black;
      match.teams[TeamColor.BLACK].economy = upgradeState.economy.black;
      
      console.log(`Upgrade purchased: ${upgradeId} for ${playerTeam} team`);
      
      return {
        success: true,
        upgrades: upgradeState.upgrades,
        economy: upgradeState.economy
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get match state for a specific player
  getMatchState(matchId, socketId) {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo || playerInfo.matchId !== matchId) {
      // If player is not in the match yet, return a limited view
      return this.getPublicMatchState(matchId);
    }

    const { role } = playerInfo;
    const playerTeam = getTeamFromRole(role);
    const playerGameSlot = getGameSlotFromRole(role);

    // Build state for the player's specific game
    const game = match.games[playerGameSlot];
    let gameState = null;

    if (game.type === GameType.CHESS) {
      const controlZoneStatuses = calculateAllControlZoneStatuses(game.board);
      gameState = {
        type: game.type,
        board: game.board,
        currentPlayer: game.currentPlayer,
        moveHistory: game.moveHistory,
        controlZones: game.controlZones,
        controlZoneStatuses,
        isPlayerTurn: playerTeam === game.currentPlayer
      };
    } else {
      // Game B (Poker) state
      const pokerState = game.state;
      const pokerPlayerState = pokerState.getPlayerGameState(playerTeam);
      
      // Include ready state if in waiting_for_ready phase
      const playersReady = pokerState.phase === 'waiting_for_ready' 
        ? Array.from(pokerState.playersReady.entries())
        : null;
      
      gameState = {
        type: game.type,
        pokerState: pokerPlayerState,
        isPlayerTurn: pokerPlayerState ? pokerPlayerState.currentTurn === playerTeam : false,
        playersReady: playersReady
      };
    }

    // Always include chess game info for all players
    const chessGame = match.games[GameSlot.A];
    const controlZoneStatuses = calculateAllControlZoneStatuses(chessGame.board);
    const chessGameInfo = {
      moveHistory: chessGame.moveHistory || [],
      currentPlayer: chessGame.currentPlayer,
      board: chessGame.board,
      controlZones: chessGame.controlZones || [],
      controlZoneStatuses: controlZoneStatuses
    };
    
    console.log(`Sending match state to ${role}, chess move history length: ${chessGameInfo.moveHistory.length}`);

    return {
      id: match.id,
      status: match.status,
      playerRole: role,
      playerTeam: playerTeam,
      playerGameSlot: playerGameSlot,
      teams: {
        [TeamColor.WHITE]: {
          economy: match.teams[TeamColor.WHITE].economy,
          upgrades: match.teams[TeamColor.WHITE].upgrades,
          barracks: match.teams[TeamColor.WHITE].barracks || [],
          players: this._getTeamPlayers(match, TeamColor.WHITE)
        },
        [TeamColor.BLACK]: {
          economy: match.teams[TeamColor.BLACK].economy,
          upgrades: match.teams[TeamColor.BLACK].upgrades,
          barracks: match.teams[TeamColor.BLACK].barracks || [],
          players: this._getTeamPlayers(match, TeamColor.BLACK)
        }
      },
      currentGame: gameState,
      chessGameInfo: chessGameInfo,
      winCondition: match.sharedState.winCondition,
      winReason: match.sharedState.winReason
    };
  }

  // Get all waiting matches
  getWaitingMatches() {
    return Array.from(this.matches.values())
      .filter(match => match.status === MatchStatus.WAITING)
      .map(match => ({
        id: match.id,
        status: match.status,
        playerCount: this._getPlayerCount(match),
        createdAt: match.createdAt,
        availableSlots: this._getAvailableSlots(match)
      }));
  }

  // Purchase a piece for the barracks
  purchasePiece(matchId, socketId, pieceType) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo || playerInfo.matchId !== matchId) {
      throw new Error('Player not in this match');
    }

    const team = getTeamFromRole(playerInfo.role);
    const teamData = match.teams[team];
    
    // Check if team can afford the piece
    if (!canAffordPiece(pieceType, teamData.economy)) {
      throw new Error(`Cannot afford ${pieceType}. Price: ${getPiecePrice(pieceType)}, Balance: ${teamData.economy}`);
    }

    // Deduct the cost
    const price = getPiecePrice(pieceType);
    teamData.economy -= price;

    // Add piece to barracks
    teamData.barracks.push({
      type: pieceType,
      color: team === TeamColor.WHITE ? PieceColor.WHITE : PieceColor.BLACK,
      purchasedAt: new Date(),
      purchasedBy: socketId
    });

    match.lastActivity = new Date();
    
    return {
      success: true,
      piece: pieceType,
      price: price,
      newBalance: teamData.economy,
      barracks: teamData.barracks
    };
  }

  // Place a piece from barracks onto the board
  placePieceFromBarracks(matchId, socketId, pieceIndex, targetPosition) {
    const match = this.matches.get(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo || playerInfo.matchId !== matchId) {
      throw new Error('Player not in this match');
    }

    const team = getTeamFromRole(playerInfo.role);
    const teamData = match.teams[team];
    const chessGame = match.games[GameSlot.A];

    // Check if piece exists in barracks
    if (pieceIndex < 0 || pieceIndex >= teamData.barracks.length) {
      throw new Error('Invalid piece index in barracks');
    }

    const piece = teamData.barracks[pieceIndex];
    
    // Validate target position is on back row
    const backRow = team === TeamColor.WHITE ? 9 : 0;
    if (targetPosition.row !== backRow) {
      throw new Error(`Pieces can only be placed on your back row (row ${backRow})`);
    }

    // Check if target square is empty
    if (chessGame.board[targetPosition.row][targetPosition.col]) {
      throw new Error('Target square is occupied');
    }

    // Place the piece on the board
    chessGame.board[targetPosition.row][targetPosition.col] = {
      type: piece.type,
      color: piece.color
    };

    // Remove piece from barracks
    teamData.barracks.splice(pieceIndex, 1);

    // Check for win conditions after placing the piece (in case it's a king that changes the game)
    const gameStatus = checkGameStatus(chessGame.board);
    if (gameStatus !== 'playing') {
      // Game has ended
      match.status = MatchStatus.COMPLETED;
      if (gameStatus === 'white_wins') {
        match.sharedState.winCondition = TeamColor.WHITE;
        match.sharedState.winReason = 'all_kings_captured';
        console.log('White team wins - all black kings captured!');
      } else if (gameStatus === 'black_wins') {
        match.sharedState.winCondition = TeamColor.BLACK;
        match.sharedState.winReason = 'all_kings_captured';
        console.log('Black team wins - all white kings captured!');
      }
    }

    match.lastActivity = new Date();

    return {
      success: true,
      piece: piece,
      position: targetPosition,
      barracks: teamData.barracks,
      board: chessGame.board,
      gameStatus: gameStatus,
      winCondition: match.sharedState.winCondition,
      winReason: match.sharedState.winReason
    };
  }

  // Remove player from match
  removePlayer(socketId) {
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) return null;

    const { matchId, role } = playerInfo;
    const match = this.matches.get(matchId);
    if (!match) return null;

    // Remove player from their slot
    const team = getTeamFromRole(role);
    const gameSlot = getGameSlotFromRole(role);
    match.teams[team].players[gameSlot] = null;
    
    // If player was in poker game, remove them
    if (gameSlot === GameSlot.B) {
      const pokerGame = match.games[GameSlot.B].state;
      pokerGame.removePlayer(team);
    }
    
    this.playerSockets.delete(socketId);

    // If no players left, delete the match
    if (this._getPlayerCount(match) === 0) {
      this.matches.delete(matchId);
      return { matchDeleted: true, match: null };
    }

    // If match was active and a player left, pause or end the match
    if (match.status === MatchStatus.ACTIVE) {
      // For now, end the match - could implement pause/reconnect later
      match.status = MatchStatus.COMPLETED;
      match.sharedState.winCondition = team === TeamColor.WHITE ? TeamColor.BLACK : TeamColor.WHITE;
      match.sharedState.winReason = 'opponent_disconnected';
    }

    return { matchDeleted: false, match };
  }

  // Helper methods
  _assignPlayerToMatch(match, socketId, playerName, preferredTeam, preferredGameSlot) {
    let assignedTeam = null;
    let assignedSlot = null;
    
    // Try preferred slot first
    if (preferredTeam && preferredGameSlot) {
      if (!match.teams[preferredTeam].players[preferredGameSlot]) {
        match.teams[preferredTeam].players[preferredGameSlot] = {
          socketId,
          name: playerName,
          ready: false
        };
        assignedTeam = preferredTeam;
        assignedSlot = preferredGameSlot;
      }
    }

    // Try any slot in preferred team
    if (!assignedTeam && preferredTeam) {
      for (const slot of [GameSlot.A, GameSlot.B]) {
        if (!match.teams[preferredTeam].players[slot]) {
          match.teams[preferredTeam].players[slot] = {
            socketId,
            name: playerName,
            ready: false
          };
          assignedTeam = preferredTeam;
          assignedSlot = slot;
          break;
        }
      }
    }

    // Try preferred game slot in any team
    if (!assignedTeam && preferredGameSlot) {
      for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
        if (!match.teams[team].players[preferredGameSlot]) {
          match.teams[team].players[preferredGameSlot] = {
            socketId,
            name: playerName,
            ready: false
          };
          assignedTeam = team;
          assignedSlot = preferredGameSlot;
          break;
        }
      }
    }

    // Assign to first available slot
    if (!assignedTeam) {
      for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
        for (const slot of [GameSlot.A, GameSlot.B]) {
          if (!match.teams[team].players[slot]) {
            match.teams[team].players[slot] = {
              socketId,
              name: playerName,
              ready: false
            };
            assignedTeam = team;
            assignedSlot = slot;
            break;
          }
        }
        if (assignedTeam) break;
      }
    }

    if (!assignedTeam || !assignedSlot) {
      throw new Error('No available slots in match');
    }

    // If assigned to poker game (slot B), add to poker game state
    if (assignedSlot === GameSlot.B) {
      const pokerGame = match.games[GameSlot.B].state;
      pokerGame.addPlayer(assignedTeam, socketId, playerName);
    }

    return createPlayerRole(assignedTeam, assignedSlot);
  }

  _getPlayerCount(match) {
    let count = 0;
    for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
      for (const slot of [GameSlot.A, GameSlot.B]) {
        if (match.teams[team].players[slot]) {
          count++;
        }
      }
    }
    return count;
  }

  _getAvailableSlots(match) {
    const slots = [];
    for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
      for (const slot of [GameSlot.A, GameSlot.B]) {
        if (!match.teams[team].players[slot]) {
          slots.push({ team, gameSlot: slot });
        }
      }
    }
    return slots;
  }

  _getTeamPlayers(match, team) {
    const players = {};
    for (const slot of [GameSlot.A, GameSlot.B]) {
      const player = match.teams[team].players[slot];
      if (player) {
        players[slot] = {
          name: player.name,
          ready: player.ready
        };
      }
    }
    return players;
  }

  _countControlledZones(game, team) {
    if (game.type !== GameType.CHESS) {
      return 0;
    }
    
    const zoneControl = game.upgradeManager ? 
      game.upgradeManager.calculateZoneControl(game.controlZones, game.board) :
      {};
    return Object.values(zoneControl).filter(controller => controller === team).length;
  }

  // Get public match state (for players not yet in the match)
  getPublicMatchState(matchId) {
    const match = this.matches.get(matchId);
    if (!match) {
      return null;
    }

    return {
      id: match.id,
      status: match.status,
      teams: {
        [TeamColor.WHITE]: {
          economy: match.teams[TeamColor.WHITE].economy,
          upgrades: match.teams[TeamColor.WHITE].upgrades,
          players: this._getTeamPlayers(match, TeamColor.WHITE)
        },
        [TeamColor.BLACK]: {
          economy: match.teams[TeamColor.BLACK].economy,
          upgrades: match.teams[TeamColor.BLACK].upgrades,
          players: this._getTeamPlayers(match, TeamColor.BLACK)
        }
      }
    };
  }

  // Clean up old matches (call periodically)
  cleanupOldMatches() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [matchId, match] of this.matches.entries()) {
      if (now - match.lastActivity > maxAge) {
        // Remove all players from this match
        for (const [socketId, playerInfo] of this.playerSockets.entries()) {
          if (playerInfo.matchId === matchId) {
            this.playerSockets.delete(socketId);
          }
        }
        this.matches.delete(matchId);
      }
    }
  }
}

module.exports = MatchManager;