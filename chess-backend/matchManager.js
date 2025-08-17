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
const { PieceColor, PieceType, CONTROL_ZONES } = require('./types');
const { createInitialBoard, makeMove, isValidMove, calculateAllControlZoneStatuses } = require('./gameLogic');
const UpgradeManager = require('./upgradeManager');
const { PokerGameState, PokerPhase } = require('./pokerGameState');
const { canAffordPiece, getPiecePrice } = require('./pieceDefinitions');
const { checkGameStatus } = require('./winConditions');
const { getPokerEffectForZone, getActivePokerEffects, POKER_EFFECT_TYPES, applyPokerEffects, CONTROL_ZONE_POKER_EFFECTS, POKER_EFFECTS } = require('./pokerEffects');

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
          unlockedPieceTypes: [], // Array of piece types that can be purchased
          players: {
            [GameSlot.A]: null,
            [GameSlot.B]: null
          }
        },
        [TeamColor.BLACK]: {
          economy: upgradeState.economy.black,
          upgrades: upgradeState.upgrades.black,
          barracks: [], // Array of pieces waiting to be placed
          unlockedPieceTypes: [], // Array of piece types that can be purchased
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
          state: new PokerGameState(1), // Initialize with blind level 1
          currentPlayer: PieceColor.WHITE
        }
      },
      sharedState: {
        upgradeManager: upgradeManager,
        controlZoneOwnership: { A: null, B: null, C: null }, // null | TeamColor.WHITE | TeamColor.BLACK
        activePokerEffects: {
          [TeamColor.WHITE]: [],
          [TeamColor.BLACK]: []
        },
        winCondition: null, // null | TeamColor.WHITE | TeamColor.BLACK
        winReason: null,
        turnNumber: 0, // Track total turns (increments when switching to white)
        incomeGivenThisTurn: false, // Track if income was given for current turn
        blindLevel: 1, // Track blind level across the match
        lastBlindIncreaseCost: 100 // Track cost for decrease calculation
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

    // Initialize control zone effects
    const chessGame = match.games[GameSlot.A];
    this._updateControlZoneEffects(match, chessGame);

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
          match.sharedState.upgradeManager.economy[dealerPlayer.team] -= pokerGame.smallBlind;
          match.teams[bigBlindPlayer.team].economy -= pokerGame.bigBlind;
          match.sharedState.upgradeManager.economy[bigBlindPlayer.team] -= pokerGame.bigBlind;
          
          // Track blind payments so we don't double-deduct
          match.teams[dealerPlayer.team].lastBetAmount = pokerGame.smallBlind;
          match.teams[bigBlindPlayer.team].lastBetAmount = pokerGame.bigBlind;
          
          // Apply poker effects when dealing
          pokerGame.dealHoleCards(match.sharedState.activePokerEffects, match.sharedState.controlZoneOwnership);
          console.log('Started poker game automatically with blinds paid');
          console.log('Active poker effects:', match.sharedState.activePokerEffects);
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

    // Create upgrades object in the format the upgrade logic expects
    const upgradesForValidation = {
      [TeamColor.WHITE]: match.teams[TeamColor.WHITE].upgrades,
      [TeamColor.BLACK]: match.teams[TeamColor.BLACK].upgrades
    };
    
    if (!isValidMove(game.board, from, to, playerTeam, upgradesForValidation, match.sharedState.upgradeManager)) {
      throw new Error('Invalid move');
    }

    // Make the move
    const piece = game.board[from.row][from.col];
    const capturedPiece = game.board[to.row][to.col];
    
    // Store the unlocked piece types BEFORE this move
    const unlockedBeforeMove = [...match.teams[playerTeam].unlockedPieceTypes];
    
    // Check for siege mode capture (rook passing through enemy piece)
    let siegeCapture = null;
    if (piece.type === PieceType.ROOK && 
        match.teams[playerTeam].upgrades[PieceType.ROOK] && 
        match.teams[playerTeam].upgrades[PieceType.ROOK].includes('rook_siege_mode')) {
      
      // Check if this is a siege move (passing through an enemy piece)
      const direction = {
        row: to.row > from.row ? 1 : (to.row < from.row ? -1 : 0),
        col: to.col > from.col ? 1 : (to.col < from.col ? -1 : 0)
      };
      
      // Check all squares between from and to
      let currentPos = { row: from.row + direction.row, col: from.col + direction.col };
      while (currentPos.row !== to.row || currentPos.col !== to.col) {
        const pieceInPath = game.board[currentPos.row][currentPos.col];
        if (pieceInPath && pieceInPath.color !== playerTeam) {
          // Enemy piece in path - this is a siege capture
          siegeCapture = pieceInPath;
          game.board[currentPos.row][currentPos.col] = null; // Remove the piece in path
          console.log(`Siege mode: Capturing piece in path at (${currentPos.row},${currentPos.col})`);
          break;
        }
        currentPos.row += direction.row;
        currentPos.col += direction.col;
      }
    }
    
    game.board = makeMove(game.board, from, to);
    
    // Award capture income for regular capture
    if (capturedPiece) {
      match.sharedState.upgradeManager.awardCaptureIncome(playerTeam);
      // Update team economy
      const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
      match.teams[playerTeam].economy = upgradeState.economy[playerTeam];
      
      // Unlock the captured piece type for the capturing team
      if (!match.teams[playerTeam].unlockedPieceTypes.includes(capturedPiece.type)) {
        match.teams[playerTeam].unlockedPieceTypes.push(capturedPiece.type);
        console.log(`${playerTeam} team unlocked ${capturedPiece.type} for purchase after capturing opponent's ${capturedPiece.type}`);
        console.log(`${playerTeam} team now has unlocked pieces:`, match.teams[playerTeam].unlockedPieceTypes);
      } else {
        console.log(`${playerTeam} team already had ${capturedPiece.type} unlocked`);
      }
    }
    
    // Award capture income for siege capture
    if (siegeCapture) {
      match.sharedState.upgradeManager.awardCaptureIncome(playerTeam);
      // Update team economy
      const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
      match.teams[playerTeam].economy = upgradeState.economy[playerTeam];
      
      // Unlock the captured piece type for the capturing team
      if (!match.teams[playerTeam].unlockedPieceTypes.includes(siegeCapture.type)) {
        match.teams[playerTeam].unlockedPieceTypes.push(siegeCapture.type);
        console.log(`${playerTeam} team unlocked ${siegeCapture.type} for purchase after siege capture of opponent's ${siegeCapture.type}`);
        console.log(`${playerTeam} team now has unlocked pieces:`, match.teams[playerTeam].unlockedPieceTypes);
      } else {
        console.log(`${playerTeam} team already had ${siegeCapture.type} unlocked`);
      }
    }
    
    // Add to move history
    const move = {
      from,
      to,
      piece,
      capturedPiece,
      siegeCapture, // Track if this was a siege mode capture
      player: playerTeam,
      timestamp: new Date()
    };
    game.moveHistory.push(move);

    // IMPORTANT: Sync current economy TO upgradeManager before processing income
    // This ensures poker bets are not overwritten
    match.sharedState.upgradeManager.economy[TeamColor.WHITE] = match.teams[TeamColor.WHITE].economy;
    match.sharedState.upgradeManager.economy[TeamColor.BLACK] = match.teams[TeamColor.BLACK].economy;
    
    // Give income to the player who just made a move
    // This encourages active play - you get rewarded for making moves
    const movingPlayerControlledZones = this._countControlledZones(game, playerTeam);
    match.sharedState.upgradeManager.processTurnEnd(playerTeam, movingPlayerControlledZones);
    
    // After processing income, sync the new economy back to match.teams
    const newEconomyState = match.sharedState.upgradeManager.getUpgradeState();
    match.teams[TeamColor.WHITE].economy = newEconomyState.economy.white;
    match.teams[TeamColor.BLACK].economy = newEconomyState.economy.black;
    
    // Update control zone ownership and poker effects
    const cardsRemoved = this._updateControlZoneEffects(match, game);
    
    // Sync only upgrades from upgradeManager (economy already handled above)
    const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
    match.teams[TeamColor.WHITE].upgrades = upgradeState.upgrades.white;
    match.teams[TeamColor.BLACK].upgrades = upgradeState.upgrades.black;

    // Check for win conditions after the move
    const isPokerActive = match.games.B && match.games.B.status === 'in_hand';
    const economy = {
      white: match.teams.white.economy,
      black: match.teams.black.economy
    };
    const gameStatusResult = checkGameStatus(game.board, economy, isPokerActive);
    if (gameStatusResult.status !== 'playing') {
      // Game has ended
      match.status = MatchStatus.COMPLETED;
      if (gameStatusResult.status === 'white_wins') {
        match.sharedState.winCondition = TeamColor.WHITE;
        match.sharedState.winReason = gameStatusResult.reason;
        console.log(`White team wins - ${gameStatusResult.reason}!`);
      } else if (gameStatusResult.status === 'black_wins') {
        match.sharedState.winCondition = TeamColor.BLACK;
        match.sharedState.winReason = gameStatusResult.reason;
        console.log(`Black team wins - ${gameStatusResult.reason}!`);
      }
    }

    // Switch turns (only if game is still active)
    if (match.status === MatchStatus.ACTIVE) {
      game.currentPlayer = game.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    }
    
    match.lastActivity = new Date();

    // Track what piece types were unlocked this move
    const unlockedPieceTypes = [];
    const unlockedAfterMove = match.teams[playerTeam].unlockedPieceTypes;
    
    // Find what was newly unlocked by comparing before and after
    for (const pieceType of unlockedAfterMove) {
      if (!unlockedBeforeMove.includes(pieceType)) {
        unlockedPieceTypes.push(pieceType);
      }
    }

    console.log(`Move completed. Unlocked piece types:`, unlockedPieceTypes);
    console.log(`Capturing team:`, playerTeam);

    return {
      match,
      move,
      gameStatus: gameStatusResult.status,
      winCondition: match.sharedState.winCondition,
      winReason: match.sharedState.winReason,
      pokerCardsRemoved: cardsRemoved,
      unlockedPieceTypes: unlockedPieceTypes,
      capturingTeam: playerTeam
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
        // Also update upgradeManager to keep in sync
        match.sharedState.upgradeManager.economy[playerTeam] -= economyChange;
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
      // Check if we should auto-progress due to all-in
      else if (pokerGame.shouldAutoProgress()) {
        console.log('Auto-progressing due to all-in situation');
        const delay = pokerGame.getAutoProgressDelay();
        
        // Schedule auto-progression
        setTimeout(() => {
          this.autoProgressPokerRound(matchId);
        }, delay);
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

  // Auto-progress poker round when players are all-in
  autoProgressPokerRound(matchId) {
    const match = this.matches.get(matchId);
    if (!match || match.status !== MatchStatus.ACTIVE) {
      return;
    }
    
    const pokerGame = match.games[GameSlot.B]?.state;
    if (!pokerGame) {
      return;
    }
    
    // Check if we still need to auto-progress
    if (!pokerGame.shouldAutoProgress()) {
      return;
    }
    
    console.log(`Auto-progressing poker round for match ${matchId}, current phase: ${pokerGame.phase}`);
    
    // Check if betting round is complete
    if (pokerGame.isBettingRoundComplete()) {
      const enteredShowdown = pokerGame.completeBettingRound();
      
      if (enteredShowdown || pokerGame.phase === 'showdown') {
        // Give a delay before showdown
        setTimeout(() => {
          this.completePokerHand(match);
        }, pokerGame.getAutoProgressDelay());
      } else {
        // Continue auto-progressing through rounds
        setTimeout(() => {
          this.autoProgressPokerRound(matchId);
        }, pokerGame.getAutoProgressDelay());
      }
      
      // Broadcast the updated state
      this.broadcastMatchState(match);
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
      let basePotShare = Math.floor(pokerGame.pot / winners.length);
      
      winners.forEach(winner => {
        let potShare = basePotShare;
        
        // Apply POT type effects for the winning team
        const teamEffects = match.sharedState.activePokerEffects[winner] || [];
        const potEffects = teamEffects.filter(e => e.type === POKER_EFFECT_TYPES.POT);
        
        if (potEffects.length > 0) {
          console.log(`Applying ${potEffects.length} POT effects for team ${winner}`);
          potEffects.forEach(effect => {
            // For now, just apply a simple percentage bonus
            if (effect.value) {
              const bonus = Math.floor(potShare * effect.value);
              potShare += bonus;
              console.log(`${effect.name}: Adding ${bonus} (${effect.value * 100}%) bonus to pot`);
            }
          });
        }
        
        const beforeEconomy = match.teams[winner].economy;
        match.teams[winner].economy += potShare;
        // Also update upgradeManager to keep in sync
        match.sharedState.upgradeManager.economy[winner] += potShare;
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
      
      // Check for economic victory now that poker round is complete
      const economy = {
        white: match.teams.white.economy,
        black: match.teams.black.economy
      };
      const gameStatusResult = checkGameStatus(match.games[GameSlot.A].board, economy, false);
      
      if (gameStatusResult.status !== 'playing') {
        // Game has ended due to economic victory
        match.status = MatchStatus.COMPLETED;
        if (gameStatusResult.status === 'white_wins') {
          match.sharedState.winCondition = TeamColor.WHITE;
          match.sharedState.winReason = gameStatusResult.reason;
          console.log(`White team wins - ${gameStatusResult.reason}!`);
        } else if (gameStatusResult.status === 'black_wins') {
          match.sharedState.winCondition = TeamColor.BLACK;
          match.sharedState.winReason = gameStatusResult.reason;
          console.log(`Black team wins - ${gameStatusResult.reason}!`);
        }
      }
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
      
      // Give income to both teams at the start of each poker hand
      const whiteControlledZones = this._countControlledZones(match.games[GameSlot.A], TeamColor.WHITE);
      match.sharedState.upgradeManager.processTurnEnd(TeamColor.WHITE, whiteControlledZones);
      
      const blackControlledZones = this._countControlledZones(match.games[GameSlot.A], TeamColor.BLACK);
      match.sharedState.upgradeManager.processTurnEnd(TeamColor.BLACK, blackControlledZones);
      
      // Update match state with new economy after income
      const upgradeState = match.sharedState.upgradeManager.getUpgradeState();
      match.teams[TeamColor.WHITE].economy = upgradeState.economy.white;
      match.teams[TeamColor.BLACK].economy = upgradeState.economy.black;
      
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
      match.sharedState.upgradeManager.economy[dealerPlayer.team] -= pokerGame.smallBlind;
      match.teams[bigBlindPlayer.team].economy -= pokerGame.bigBlind;
      match.sharedState.upgradeManager.economy[bigBlindPlayer.team] -= pokerGame.bigBlind;
      
      // Track blind payments so we don't double-deduct
      match.teams[dealerPlayer.team].lastBetAmount = pokerGame.smallBlind;
      match.teams[bigBlindPlayer.team].lastBetAmount = pokerGame.bigBlind;
      
      // Apply poker effects when dealing
      pokerGame.dealHoleCards(match.sharedState.activePokerEffects, match.sharedState.controlZoneOwnership);
      
      console.log(`All players ready - started new poker hand with dealer: ${dealerPlayer.team}`);
      console.log('Active poker effects:', match.sharedState.activePokerEffects);
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
      // Create matchState object for the new tiered system
      const matchState = {
        matchId: match.id,
        currentPlayer: playerTeam,
        economy: match.sharedState.upgradeManager.economy
      };
      
      match.sharedState.upgradeManager.purchaseUpgrade(matchState, upgradeId);
      
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

  // Purchase a modifier for a team
  purchaseModifier(socketId, modifierId) {
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
    const { MODIFIERS, getBlindAmounts } = require('./modifierDefinitions');
    
    // Check if modifier exists
    const modifier = MODIFIERS[modifierId];
    if (!modifier) {
      return {
        success: false,
        error: 'Invalid modifier'
      };
    }
    
    // Create a state object with the necessary properties for modifier calculations
    const stateForModifiers = {
      ...match.sharedState,
      teams: match.teams
    };
    
    // Check if player can purchase
    const cost = modifier.getCost(stateForModifiers);
    const teamEconomy = match.teams[playerTeam].economy;
    
    // Must have at least 1 money remaining after purchase
    if (teamEconomy <= cost) {
      return {
        success: false,
        error: 'Insufficient funds. Must retain at least 1 money.'
      };
    }
    
    // Apply the modifier (apply to sharedState, not the combined state)
    const result = modifier.apply(match.sharedState, playerTeam);
    
    if (result.success) {
      // Deduct cost from team economy
      match.teams[playerTeam].economy -= cost;
      match.sharedState.upgradeManager.economy[playerTeam] -= cost;
      
      // Update poker game blind levels
      const pokerGame = match.games[GameSlot.B].state;
      pokerGame.updateBlindLevel(match.sharedState.blindLevel);
      
      console.log(`Modifier purchased: ${modifierId} for ${playerTeam} team, new blind level: ${match.sharedState.blindLevel}`);
      
      return {
        success: true,
        message: result.message,
        blindLevel: match.sharedState.blindLevel,
        blindAmounts: getBlindAmounts(match.sharedState.blindLevel),
        economy: {
          white: match.teams[TeamColor.WHITE].economy,
          black: match.teams[TeamColor.BLACK].economy
        }
      };
    } else {
      return {
        success: false,
        error: result.message
      };
    }
  }

  // Get available modifiers for a team
  getAvailableModifiers(socketId) {
    console.log('getAvailableModifiers called for socket:', socketId);
    const playerInfo = this.playerSockets.get(socketId);
    if (!playerInfo) {
      console.error('Player not found for socket:', socketId);
      throw new Error('Player not found');
    }
    const { matchId, role } = playerInfo;
    console.log('Player info:', { matchId, role });
    
    const match = this.matches.get(matchId);
    if (!match) {
      console.error('Match not found:', matchId);
      throw new Error('Match not found');
    }
    
    const playerTeam = getTeamFromRole(role);
    console.log('Player team:', playerTeam);
    
    const { getAvailableModifiers } = require('./modifierDefinitions');
    
    // Create a state object with the necessary properties for modifier calculations
    const stateForModifiers = {
      ...match.sharedState,
      teams: match.teams
    };
    
    console.log('State for modifiers:', {
      blindLevel: stateForModifiers.blindLevel,
      teamEconomy: stateForModifiers.teams[playerTeam].economy
    });
    
    const modifiers = getAvailableModifiers(stateForModifiers, playerTeam);
    console.log('Available modifiers:', JSON.stringify(modifiers, null, 2));
    
    return modifiers;
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
      const teamEconomy = { liquid: match.teams[playerTeam].economy };
      const pokerPlayerState = pokerState.getPlayerGameState(playerTeam, teamEconomy);
      
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
      winReason: match.sharedState.winReason,
      controlZoneOwnership: match.sharedState.controlZoneOwnership,
      activePokerEffects: match.sharedState.activePokerEffects,
      blindLevel: match.sharedState.blindLevel || 1,
      blindAmounts: require('./modifierDefinitions').getBlindAmounts(match.sharedState.blindLevel || 1),
      // Include poker effect definitions for each zone
      controlZonePokerEffects: Object.entries(CONTROL_ZONE_POKER_EFFECTS).reduce((acc, [zoneId, effectId]) => {
        const effect = POKER_EFFECTS[effectId];
        if (effect) {
          acc[zoneId] = {
            id: effect.id,
            name: effect.name,
            description: effect.description,
            type: effect.type,
            icon: effect.icon
          };
        }
        return acc;
      }, {})
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
    
    // Check if the piece type is unlocked for this team
    if (!teamData.unlockedPieceTypes.includes(pieceType)) {
      throw new Error(`Cannot purchase ${pieceType}. You must first capture an opponent's ${pieceType} to unlock this piece type for purchase.`);
    }
    
    // Get base price
    let price = getPiecePrice(pieceType);
    
    // Check if team controls Zone C for discount
    if (match.sharedState.controlZoneOwnership && match.sharedState.controlZoneOwnership.C === team) {
      // Apply 50% discount for controlling Zone C
      price = Math.ceil(price * 0.5);
      console.log(`Zone C discount applied for ${team}: ${getPiecePrice(pieceType)} → ${price}`);
    }
    
    // Check if team can afford the piece (with potential discount)
    // Must have at least 1 money remaining after purchase
    if (teamData.economy <= price) {
      throw new Error(`Cannot afford ${pieceType}. Price: ${price}, Balance: ${teamData.economy}. Must retain at least 1 money.`);
    }

    // Deduct the cost from both places
    teamData.economy -= price;
    match.sharedState.upgradeManager.economy[team] -= price;

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
    const economy = {
      white: match.teams.white.economy,
      black: match.teams.black.economy
    };
    const isPokerActive = match.games.B && match.games.B.status === 'in_hand';
    const gameStatusResult = checkGameStatus(chessGame.board, economy, isPokerActive);
    if (gameStatusResult.status !== 'playing') {
      // Game has ended
      match.status = MatchStatus.COMPLETED;
      if (gameStatusResult.status === 'white_wins') {
        match.sharedState.winCondition = TeamColor.WHITE;
        match.sharedState.winReason = gameStatusResult.reason;
        console.log(`White team wins - ${gameStatusResult.reason}!`);
      } else if (gameStatusResult.status === 'black_wins') {
        match.sharedState.winCondition = TeamColor.BLACK;
        match.sharedState.winReason = gameStatusResult.reason;
        console.log(`Black team wins - ${gameStatusResult.reason}!`);
      }
    }

    match.lastActivity = new Date();

    return {
      success: true,
      piece: piece,
      position: targetPosition,
      barracks: teamData.barracks,
      board: chessGame.board,
      gameStatus: gameStatusResult.status,
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

  _updateControlZoneEffects(match, game) {
    // Calculate control zone ownership
    const controlZoneStatuses = calculateAllControlZoneStatuses(game.board, game.controlZones);
    game.controlZoneStatuses = controlZoneStatuses;
    
    // Update ownership tracking and poker effects
    const newOwnership = {};
    controlZoneStatuses.forEach(status => {
      const zoneId = status.zone.id;
      const controller = status.controlledBy === 'neutral' ? null : status.controlledBy;
      newOwnership[zoneId] = controller;
      
      // Log control zone changes (only if ownership actually changed)
      if (match.sharedState.controlZoneOwnership[zoneId] !== controller) {
        const oldOwner = match.sharedState.controlZoneOwnership[zoneId] || 'neutral';
        const newOwner = controller || 'neutral';
        console.log(`Zone ${zoneId}: ${oldOwner} → ${newOwner}`);
      }
    });
    
    // Update ownership
    match.sharedState.controlZoneOwnership = newOwnership;
    
    // Update active poker effects for each team
    match.sharedState.activePokerEffects[TeamColor.WHITE] = getActivePokerEffects(newOwnership, TeamColor.WHITE);
    match.sharedState.activePokerEffects[TeamColor.BLACK] = getActivePokerEffects(newOwnership, TeamColor.BLACK);
    
    // If there's an active poker game, update control zone effects (for third hole card removal)
    const pokerGameWrapper = match.games[GameSlot.B];
    const pokerGame = pokerGameWrapper?.state; // Get the actual PokerGameState instance
    
    let cardsRemoved = false;
    if (pokerGame && pokerGame.phase && pokerGame.phase !== 'waiting' && pokerGame.phase !== 'waiting_for_ready') {
      cardsRemoved = pokerGame.updateControlZoneEffects(newOwnership, match.sharedState.activePokerEffects);
    }
    
    return cardsRemoved;
  }
  
  _countControlledZones(game, team) {
    if (game.type !== GameType.CHESS) {
      return 0;
    }
    
    // Use the gameLogic function instead of the removed upgradeManager method
    const controlZoneStatuses = calculateAllControlZoneStatuses(game.board);
    return controlZoneStatuses.filter(status => status.controlledBy === team).length;
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

  // Broadcast match state to all players in a match
  broadcastMatchState(match) {
    // This method will be implemented to broadcast game state updates
    // For now, it's a placeholder to prevent errors
    console.log(`Broadcasting match state for match ${match.id}`);
  }

  // Notify all players in a match about a specific event
  notifyMatchPlayers(matchId, event, data) {
    const match = this.matches.get(matchId);
    if (!match) {
      console.error(`Match ${matchId} not found for notification`);
      return;
    }

    // Find all players in this match and notify them
    for (const [socketId, playerInfo] of this.playerSockets.entries()) {
      if (playerInfo.matchId === matchId) {
        // Get the socket instance from the global io object
        // This will be set up in the server.js file
        if (global.io) {
          global.io.to(socketId).emit(event, data);
        }
      }
    }
  }
}

module.exports = MatchManager;