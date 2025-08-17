const { v4: uuidv4 } = require('uuid');
const { GameStatus, PieceColor, CONTROL_ZONES } = require('./types');
const { createInitialBoard, makeMove, isValidMove, calculateAllControlZoneStatuses } = require('./gameLogic');
const UpgradeManager = require('./upgradeManager');

class GameManager {
  constructor() {
    this.games = new Map();
    this.playerSockets = new Map();
  }

  // Create a new game
  createGame(creatorSocketId, creatorName) {
    const gameId = uuidv4();
    const upgradeManager = new UpgradeManager();
    const upgradeState = upgradeManager.getUpgradeState();
    
    const game = {
      id: gameId,
      status: GameStatus.WAITING,
      players: {
        [creatorSocketId]: {
          name: creatorName,
          color: null,
          ready: false
        }
      },
      board: createInitialBoard(),
      currentPlayer: PieceColor.WHITE,
      moveHistory: [],
      controlZones: CONTROL_ZONES,
      upgrades: upgradeState.upgrades,
      economy: upgradeState.economy,
      upgradeManager: upgradeManager, // Store the manager instance
      createdAt: new Date(),
      lastActivity: new Date()
    };

    this.games.set(gameId, game);
    this.playerSockets.set(creatorSocketId, gameId);
    
    return game;
  }

  // Join an existing game
  joinGame(gameId, joinerSocketId, joinerName) {
    const game = this.games.get(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.status !== GameStatus.WAITING) {
      throw new Error('Game is not accepting new players');
    }
    
    if (Object.keys(game.players).length >= 2) {
      throw new Error('Game is full');
    }

    // Add the new player
    game.players[joinerSocketId] = {
      name: joinerName,
      color: null,
      ready: false
    };

    // Assign colors randomly
    const playerIds = Object.keys(game.players);
    const whitePlayerId = Math.random() < 0.5 ? playerIds[0] : playerIds[1];
    
    game.players[whitePlayerId].color = PieceColor.WHITE;
    game.players[playerIds.find(id => id !== whitePlayerId)].color = PieceColor.BLACK;

    // Start the game
    game.status = GameStatus.ACTIVE;
    game.lastActivity = new Date();

    this.playerSockets.set(joinerSocketId, gameId);
    
    return game;
  }

  // Make a move in a game
  makeGameMove(socketId, from, to) {
    const gameId = this.playerSockets.get(socketId);
    const game = this.games.get(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.status !== GameStatus.ACTIVE) {
      throw new Error('Game is not active');
    }

    const player = game.players[socketId];
    if (!player) {
      throw new Error('Player not in this game');
    }

    if (player.color !== game.currentPlayer) {
      throw new Error('Not your turn');
    }

    if (!isValidMove(game.board, from, to, player.color, game.upgrades, game.upgradeManager)) {
      throw new Error('Invalid move');
    }

    // Make the move
    const piece = game.board[from.row][from.col];
    const capturedPiece = game.board[to.row][to.col];
    
    game.board = makeMove(game.board, from, to);
    
    // Award capture income if a piece was captured
    if (capturedPiece) {
      game.upgradeManager.awardCaptureIncome(player.color);
    }
    
    // Add to move history
    const move = {
      from,
      to,
      piece,
      capturedPiece,
      player: player.color,
      timestamp: new Date()
    };
    game.moveHistory.push(move);

    // Process turn end for the current player
    const controlledZones = this.countControlledZones(game, player.color);
    game.upgradeManager.processTurnEnd(player.color, controlledZones);
    
    // Control zone upgrades are now handled by the tiered system
    // No need to call activateControlZoneUpgrades as it was removed
    
    // Update game state with latest upgrade/economy info
    const upgradeState = game.upgradeManager.getUpgradeState();
    game.upgrades = upgradeState.upgrades;
    game.economy = upgradeState.economy;

    // Switch turns
    game.currentPlayer = game.currentPlayer === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
    game.lastActivity = new Date();

    return {
      game,
      move
    };
  }

  // Get game by ID
  getGame(gameId) {
    return this.games.get(gameId);
  }

  // Get game by socket ID
  getGameBySocket(socketId) {
    const gameId = this.playerSockets.get(socketId);
    return gameId ? this.games.get(gameId) : null;
  }

  // Get all waiting games
  getWaitingGames() {
    return Array.from(this.games.values())
      .filter(game => game.status === GameStatus.WAITING)
      .map(game => ({
        id: game.id,
        status: game.status,
        playerCount: Object.keys(game.players).length,
        createdAt: game.createdAt,
        creatorName: Object.values(game.players)[0]?.name || 'Unknown'
      }));
  }

  // Remove player from game
  removePlayer(socketId) {
    const gameId = this.playerSockets.get(socketId);
    if (!gameId) return null;

    const game = this.games.get(gameId);
    if (!game) return null;

    delete game.players[socketId];
    this.playerSockets.delete(socketId);

    // If no players left, delete the game
    if (Object.keys(game.players).length === 0) {
      this.games.delete(gameId);
      return { gameDeleted: true, game: null };
    }

    // If game was active and one player left, end the game
    if (game.status === GameStatus.ACTIVE) {
      game.status = GameStatus.COMPLETED;
      const remainingPlayer = Object.values(game.players)[0];
      game.winner = remainingPlayer.color;
      game.endReason = 'opponent_disconnected';
    }

    return { gameDeleted: false, game };
  }

  // Get game state for client
  getGameState(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game) {
      console.log(`getGameState: Game ${gameId} not found`);
      return null;
    }

    const player = game.players[socketId];
    const controlZoneStatuses = calculateAllControlZoneStatuses(game.board);

    const gameState = {
      id: game.id,
      status: game.status,
      board: game.board,
      currentPlayer: game.currentPlayer,
      gameStatus: 'playing', // Add this field that the frontend expects
      players: Object.fromEntries(
        Object.entries(game.players).map(([id, p]) => [id, {
          name: p.name,
          color: p.color,
          ready: p.ready
        }])
      ),
      controlZones: game.controlZones,
      controlZoneStatuses,
      moveHistory: game.moveHistory,
      upgrades: game.upgrades,
      economy: game.economy,
      playerColor: player?.color || null,
      isPlayerTurn: player?.color === game.currentPlayer
    };

    console.log(`getGameState for ${socketId}: status=${game.status}, playerColor=${player?.color}, isPlayerTurn=${gameState.isPlayerTurn}`);
    return gameState;
  }

  // Clean up old games (call periodically)
  cleanupOldGames() {
    const now = new Date();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [gameId, game] of this.games.entries()) {
      if (now - game.lastActivity > maxAge) {
        // Remove all players from this game
        Object.keys(game.players).forEach(socketId => {
          this.playerSockets.delete(socketId);
        });
        this.games.delete(gameId);
      }
    }
  }

  // Count how many control zones a team controls
  countControlledZones(game, color) {
    // Use the gameLogic function instead of the removed upgradeManager method
    const { calculateAllControlZoneStatuses } = require('./gameLogic');
    const controlZoneStatuses = calculateAllControlZoneStatuses(game.board);
    return controlZoneStatuses.filter(status => status.controlledBy === color).length;
  }

  // Purchase an upgrade for a player
  purchaseUpgrade(socketId, upgradeId) {
    const gameId = this.playerSockets.get(socketId);
    const game = this.games.get(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    const player = game.players[socketId];
    if (!player) {
      throw new Error('Player not in this game');
    }
    
    try {
      // Create matchState object for the new tiered system
      const matchState = {
        matchId: gameId,
        currentPlayer: player.color,
        economy: game.upgradeManager.economy
      };
      game.upgradeManager.purchaseUpgrade(matchState, upgradeId);
      
      // Update game state with latest upgrade/economy info
      const upgradeState = game.upgradeManager.getUpgradeState();
      game.upgrades = upgradeState.upgrades;
      game.economy = upgradeState.economy;
      
      console.log(`Upgrade purchased: ${upgradeId} for ${player.color}`);
      console.log(`Updated upgrades for ${player.color}:`, game.upgrades[player.color]);
      
      return {
        success: true,
        upgrades: game.upgrades,
        economy: game.economy
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get available upgrades for a player
  getAvailableUpgrades(socketId) {
    const gameId = this.playerSockets.get(socketId);
    const game = this.games.get(gameId);
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    const player = game.players[socketId];
    if (!player) {
      throw new Error('Player not in this game');
    }
    
    // Create matchState object for the new tiered system
    const matchState = {
      matchId: gameId,
      currentPlayer: player.color,
      economy: game.upgradeManager.economy
    };
    return game.upgradeManager.getAvailableUpgrades(matchState);
  }
}

module.exports = GameManager;