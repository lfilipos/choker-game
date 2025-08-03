const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const MatchManager = require('./matchManager');
const { getPossibleMoves } = require('./gameLogic');
const { GameSlot, getTeamFromRole } = require('./matchTypes');

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

const matchManager = new MatchManager();

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
    matches: matchManager.matches.size,
    players: matchManager.playerSockets.size
  });
});

// Get all waiting matches
app.get('/api/matches', (req, res) => {
  try {
    const waitingMatches = matchManager.getWaitingMatches();
    res.json(waitingMatches);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific match info
app.get('/api/matches/:matchId', (req, res) => {
  try {
    const match = matchManager.matches.get(req.params.matchId);
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    // Calculate player count
    let playerCount = 0;
    for (const team of ['white', 'black']) {
      for (const slot of ['A', 'B']) {
        if (match.teams[team].players[slot]) {
          playerCount++;
        }
      }
    }
    
    // Calculate available slots
    const availableSlots = [];
    for (const team of ['white', 'black']) {
      for (const slot of ['A', 'B']) {
        if (!match.teams[team].players[slot]) {
          availableSlots.push({ team, gameSlot: slot });
        }
      }
    }
    
    res.json({
      id: match.id,
      status: match.status,
      playerCount: playerCount,
      availableSlots: availableSlots,
      createdAt: match.createdAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO Connection Handling
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new match
  socket.on('create_match', (data) => {
    try {
      const { playerName, preferredTeam, preferredGameSlot } = data;
      const result = matchManager.createMatch(socket.id, playerName || 'Anonymous', preferredTeam, preferredGameSlot);
      const { match, assignedRole } = result;
      
      socket.join(match.id);
      
      const matchState = matchManager.getMatchState(match.id, socket.id);
      
      socket.emit('match_created', {
        matchId: match.id,
        assignedRole: assignedRole,
        matchState: matchState
      });

      // Also emit match_joined for consistency
      socket.emit('match_joined', {
        matchId: match.id,
        assignedRole: assignedRole,
        matchState: matchState
      });

      // Broadcast updated match list to all clients
      io.emit('matches_updated', matchManager.getWaitingMatches());
      
      console.log(`Match created: ${match.id} by ${playerName} with role ${assignedRole}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Join an existing match
  socket.on('join_match', (data) => {
    try {
      const { matchId, playerName, preferredTeam, preferredGameSlot } = data;
      const result = matchManager.joinMatch(matchId, socket.id, playerName || 'Anonymous', preferredTeam, preferredGameSlot);
      const { match, assignedRole } = result;
      
      socket.join(matchId);
      
      // Send match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
          const playerMatchState = matchManager.getMatchState(matchId, socketId);
          io.to(socketId).emit('match_joined', {
            matchId: matchId,
            assignedRole: matchManager.playerSockets.get(socketId).role,
            matchState: playerMatchState
          });
        }
      }

      // Broadcast updated match list to all clients
      io.emit('matches_updated', matchManager.getWaitingMatches());
      
      console.log(`Player ${playerName} joined match: ${matchId} with role ${assignedRole}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Make a move
  socket.on('make_move', (data) => {
    try {
      const { gameSlot, from, to } = data;
      const result = matchManager.makeGameMove(socket.id, gameSlot, from, to);
      
      // Send updated match state to all players in the match
      const { match } = result;
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('move_made', {
            move: result.move,
            gameSlot: gameSlot,
            matchState: playerMatchState
          });
        }
      }
      
      console.log(`Move made in match ${match.id}, game ${gameSlot}: ${JSON.stringify(result.move)}`);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get current match state
  socket.on('get_match_state', (data) => {
    try {
      const { matchId } = data;
      const matchState = matchManager.getMatchState(matchId, socket.id);
      if (matchState) {
        socket.emit('match_state', matchState);
      } else {
        socket.emit('error', { message: 'Match not found' });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get list of waiting matches
  socket.on('get_waiting_matches', () => {
    try {
      const waitingMatches = matchManager.getWaitingMatches();
      socket.emit('waiting_matches', waitingMatches);
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get available upgrades
  socket.on('get_available_upgrades', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      const playerTeam = getTeamFromRole(playerInfo.role);
      const upgrades = match.sharedState.upgradeManager.getAvailableUpgrades(playerTeam);
      socket.emit('available_upgrades', { upgrades });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get possible moves for a piece (with upgrades applied)
  socket.on('get_possible_moves', (data) => {
    try {
      const { position, gameSlot } = data;
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const game = match.games[gameSlot || GameSlot.A];
      if (game.type !== 'chess') {
        throw new Error('Possible moves only available for chess game');
      }
      
      const piece = game.board[position.row][position.col];
      const teamUpgrades = match.teams[piece?.color]?.upgrades || {};
      
      console.log(`Getting possible moves for ${piece?.color} ${piece?.type} at (${position.row}, ${position.col})`);
      console.log(`Upgrades for ${piece?.color}:`, teamUpgrades);
      
      const upgradeState = {
        white: match.teams.white.upgrades,
        black: match.teams.black.upgrades
      };
      
      const possibleMoves = getPossibleMoves(
        game.board, 
        position, 
        upgradeState, 
        match.sharedState.upgradeManager
      );
      
      console.log(`Found ${possibleMoves.length} possible moves`);
      
      socket.emit('possible_moves', {
        position,
        moves: possibleMoves
      });
    } catch (error) {
      console.error('Error in get_possible_moves:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Purchase an upgrade
  socket.on('purchase_upgrade', (data) => {
    try {
      const { upgradeId } = data;
      const result = matchManager.purchaseUpgrade(socket.id, upgradeId);
      
      if (result.success) {
        const playerInfo = matchManager.playerSockets.get(socket.id);
        const matchId = playerInfo.matchId;
        
        // Send updated match state to all players in the match
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
          }
        }
        
        socket.emit('upgrade_purchased', {
          upgradeId,
          upgrades: result.upgrades,
          economy: result.economy
        });
      } else {
        socket.emit('upgrade_error', { message: result.error });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    try {
      const result = matchManager.removePlayer(socket.id);
      
      if (result && !result.matchDeleted && result.match) {
        // Notify remaining players
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === result.match.id) {
            const playerMatchState = matchManager.getMatchState(result.match.id, socketId);
            io.to(socketId).emit('player_disconnected', {
              matchState: playerMatchState
            });
          }
        }
      }

      // Broadcast updated match list
      io.emit('matches_updated', matchManager.getWaitingMatches());
    } catch (error) {
      console.error('Error handling disconnect:', error);
    }
  });
});

// Cleanup old matches every hour
setInterval(() => {
  matchManager.cleanupOldMatches();
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Chess game server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});