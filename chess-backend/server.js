const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const GameManager = require('./gameManager');

const app = express();
const server = http.createServer(app);

// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL, "https://choker-game.vercel.app", "https://*.vercel.app"]
      : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const gameManager = new GameManager();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL, "https://choker-game.vercel.app", "https://*.vercel.app"]
    : ["http://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// REST API Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Chess Game Server', 
    timestamp: new Date().toISOString(),
    games: gameManager.games.size,
    players: gameManager.playerSockets.size
  });
});

// Get all waiting games
app.get('/api/games', (req, res) => {
  try {
    const waitingGames = gameManager.getWaitingGames();
    res.json(waitingGames);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific game info
app.get('/api/games/:gameId', (req, res) => {
  try {
    const game = gameManager.getGame(req.params.gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    res.json({
      id: game.id,
      status: game.status,
      playerCount: Object.keys(game.players).length,
      createdAt: game.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new game
  socket.on('create_game', (data) => {
    try {
      const { playerName } = data;
      const game = gameManager.createGame(socket.id, playerName || 'Anonymous');
      
      socket.join(game.id);
      
      const gameState = gameManager.getGameState(game.id, socket.id);
      
      socket.emit('game_created', {
        gameId: game.id,
        gameState: gameState
      });

      // Also emit game_joined for consistency
      socket.emit('game_joined', {
        gameId: game.id,
        gameState: gameState
      });

      // Broadcast updated game list to all clients
      io.emit('games_updated', gameManager.getWaitingGames());
      
      console.log(`Game created: ${game.id} by ${playerName} (status: ${game.status})`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Join an existing game
  socket.on('join_game', (data) => {
    try {
      const { gameId, playerName } = data;
      const game = gameManager.joinGame(gameId, socket.id, playerName || 'Anonymous');
      
      socket.join(gameId);
      
      // Send game state to each player individually with their perspective
      Object.keys(game.players).forEach(playerId => {
        const playerGameState = gameManager.getGameState(gameId, playerId);
        io.to(playerId).emit('game_joined', {
          gameId: gameId,
          gameState: playerGameState
        });
      });

      // Broadcast updated game list to all clients
      io.emit('games_updated', gameManager.getWaitingGames());
      
      console.log(`Player ${playerName} joined game: ${gameId}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Make a move
  socket.on('make_move', (data) => {
    try {
      const { from, to } = data;
      const result = gameManager.makeGameMove(socket.id, from, to);
      
      // Send updated game state to each player individually with their perspective
      Object.keys(result.game.players).forEach(playerId => {
        const playerGameState = gameManager.getGameState(result.game.id, playerId);
        io.to(playerId).emit('move_made', {
          move: result.move,
          gameState: playerGameState
        });
      });
      
      console.log(`Move made in game ${result.game.id}: ${JSON.stringify(result.move)}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get current game state
  socket.on('get_game_state', (data) => {
    try {
      const { gameId } = data;
      const gameState = gameManager.getGameState(gameId, socket.id);
      if (gameState) {
        socket.emit('game_state', gameState);
      } else {
        socket.emit('error', { message: 'Game not found' });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get list of waiting games
  socket.on('get_waiting_games', () => {
    try {
      const waitingGames = gameManager.getWaitingGames();
      socket.emit('waiting_games', waitingGames);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    try {
      const result = gameManager.removePlayer(socket.id);
      
      if (result && !result.gameDeleted && result.game) {
        // Notify remaining players
        io.to(result.game.id).emit('player_disconnected', {
          gameState: gameManager.getGameState(result.game.id, socket.id)
        });
      }

      // Broadcast updated game list
      io.emit('games_updated', gameManager.getWaitingGames());
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Cleanup old games every hour
setInterval(() => {
  gameManager.cleanupOldGames();
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Chess game server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});