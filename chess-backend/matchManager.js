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
          players: {
            [GameSlot.A]: null,
            [GameSlot.B]: null
          }
        },
        [TeamColor.BLACK]: {
          economy: upgradeState.economy.black,
          upgrades: upgradeState.upgrades.black,
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
          currentPlayer: PieceColor.WHITE,
          gameSpecificState: {
            // Placeholder for Game B state
          }
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

    // Check for win conditions (checkmate, etc.)
    // TODO: Implement win condition checking

    // Switch turns
    game.currentPlayer = game.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    match.lastActivity = new Date();

    return {
      match,
      move
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
      // Game B state
      gameState = {
        type: game.type,
        currentPlayer: game.currentPlayer,
        gameSpecificState: game.gameSpecificState,
        isPlayerTurn: playerTeam === game.currentPlayer
      };
    }

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
          players: this._getTeamPlayers(match, TeamColor.WHITE)
        },
        [TeamColor.BLACK]: {
          economy: match.teams[TeamColor.BLACK].economy,
          upgrades: match.teams[TeamColor.BLACK].upgrades,
          players: this._getTeamPlayers(match, TeamColor.BLACK)
        }
      },
      currentGame: gameState,
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
    // Try preferred slot first
    if (preferredTeam && preferredGameSlot) {
      if (!match.teams[preferredTeam].players[preferredGameSlot]) {
        match.teams[preferredTeam].players[preferredGameSlot] = {
          socketId,
          name: playerName,
          ready: false
        };
        return createPlayerRole(preferredTeam, preferredGameSlot);
      }
    }

    // Try any slot in preferred team
    if (preferredTeam) {
      for (const slot of [GameSlot.A, GameSlot.B]) {
        if (!match.teams[preferredTeam].players[slot]) {
          match.teams[preferredTeam].players[slot] = {
            socketId,
            name: playerName,
            ready: false
          };
          return createPlayerRole(preferredTeam, slot);
        }
      }
    }

    // Try preferred game slot in any team
    if (preferredGameSlot) {
      for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
        if (!match.teams[team].players[preferredGameSlot]) {
          match.teams[team].players[preferredGameSlot] = {
            socketId,
            name: playerName,
            ready: false
          };
          return createPlayerRole(team, preferredGameSlot);
        }
      }
    }

    // Assign to first available slot
    for (const team of [TeamColor.WHITE, TeamColor.BLACK]) {
      for (const slot of [GameSlot.A, GameSlot.B]) {
        if (!match.teams[team].players[slot]) {
          match.teams[team].players[slot] = {
            socketId,
            name: playerName,
            ready: false
          };
          return createPlayerRole(team, slot);
        }
      }
    }

    throw new Error('No available slots in match');
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