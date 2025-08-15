const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const MatchManager = require('./matchManager');
const { getPossibleMoves } = require('./gameLogic');
const { GameSlot, getTeamFromRole, getGameSlotFromRole } = require('./matchTypes');
const { getPurchasablePieces, getPurchasablePiecesForTeam } = require('./pieceDefinitions');

const app = express();
const server = http.createServer(app);



// Configure CORS for Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL]
      : ["http://localhost:3000"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const matchManager = new MatchManager();



// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [process.env.FRONTEND_URL]
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
    
    // Add poker game info
    const pokerGame = match.games[GameSlot.B].state;
    const pokerInfo = {
      phase: pokerGame.phase,
      players: pokerGame.players.size,
      handNumber: pokerGame.handNumber,
      dealerTeam: pokerGame.dealerTeam
    };
    
    res.json({
      id: match.id,
      status: match.status,
      playerCount: playerCount,
      availableSlots: availableSlots,
      createdAt: match.createdAt,
      pokerGame: pokerInfo
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
      const { match, pokerCardsRemoved, unlockedPieceTypes, capturingTeam } = result;
      
      console.log(`Server received move result:`, {
        unlockedPieceTypes,
        capturingTeam,
        hasUnlocks: unlockedPieceTypes && unlockedPieceTypes.length > 0
      });
      
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('move_made', {
            move: result.move,
            gameSlot: gameSlot,
            matchState: playerMatchState
          });
          
          // If poker cards were removed, also send a specific update
          if (pokerCardsRemoved) {
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState,
              reason: 'poker_cards_removed'
            });
          }
          
          // If piece types were unlocked, only notify the capturing team
          if (unlockedPieceTypes && unlockedPieceTypes.length > 0) {
            const playerRole = matchManager.playerSockets.get(socketId)?.role;
            if (playerRole) {
              const playerTeam = getTeamFromRole(playerRole);
              console.log(`Player ${socketId} is on team ${playerTeam}, capturing team is ${capturingTeam}`);
              
              // Only send unlock notification and updated pieces to the capturing team
              if (playerTeam === capturingTeam) {
                console.log(`Emitting piece_types_unlocked to ${socketId} for team ${capturingTeam}`);
                io.to(socketId).emit('piece_types_unlocked', {
                  unlockedPieceTypes: unlockedPieceTypes,
                  capturingTeam: capturingTeam,
                  matchState: playerMatchState
                });
                
                // Send updated purchasable pieces to the capturing team
                const teamData = match.teams[playerTeam];
                const pieces = getPurchasablePiecesForTeam(teamData.unlockedPieceTypes);
                console.log(`Sending updated purchasable pieces to ${socketId}:`, pieces);
                
                // Check for Zone C discount
                let hasDiscount = match.sharedState.controlZoneOwnership?.C === playerTeam;
                let discountedPieces = pieces;
                
                if (hasDiscount) {
                  discountedPieces = pieces.map(piece => ({
                    ...piece,
                    originalPrice: piece.price,
                    price: Math.ceil(piece.price * 0.5),
                    hasDiscount: true
                  }));
                }
                
                io.to(socketId).emit('purchasable_pieces', { 
                  pieces: discountedPieces,
                  hasZoneCDiscount: hasDiscount,
                  unlockedPieceTypes: teamData.unlockedPieceTypes
                });
              }
            }
          }
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
        const match = matchManager.matches.get(matchId);
        
        // Send updated match state to all players in the match
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
            
            // Also send updated available upgrades to reflect new economy
            const playerRole = matchManager.playerSockets.get(socketId)?.role;
            if (playerRole) {
              const playerTeam = getTeamFromRole(playerRole);
              const upgrades = match.sharedState.upgradeManager.getAvailableUpgrades(playerTeam);
              io.to(socketId).emit('available_upgrades', { upgrades });
            }
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

  // Purchase a modifier
  socket.on('purchase_modifier', (data) => {
    try {
      const { modifierId } = data;
      const result = matchManager.purchaseModifier(socket.id, modifierId);
      
      if (result.success) {
        const playerInfo = matchManager.playerSockets.get(socket.id);
        const matchId = playerInfo.matchId;
        const match = matchManager.matches.get(matchId);
        
        // Send updated match state to all players in the match
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
            
            // Also send updated available modifiers to reflect new costs
            const playerRole = matchManager.playerSockets.get(socketId)?.role;
            if (playerRole) {
              const modifiers = matchManager.getAvailableModifiers(socketId);
              io.to(socketId).emit('available_modifiers', { modifiers });
            }
          }
        }
        
        // Send success message with blind level info
        socket.emit('modifier_purchased', {
          modifierId,
          message: result.message,
          blindLevel: result.blindLevel,
          blindAmounts: result.blindAmounts,
          economy: result.economy
        });
        
        // Broadcast blind level change to all players
        io.to(matchId).emit('blind_level_changed', {
          blindLevel: result.blindLevel,
          blindAmounts: result.blindAmounts
        });
      } else {
        socket.emit('modifier_error', { message: result.error });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get available modifiers
  socket.on('get_modifiers', () => {
    console.log('get_modifiers request from socket:', socket.id);
    try {
      const modifiers = matchManager.getAvailableModifiers(socket.id);
      console.log('Sending modifiers count:', modifiers.length);
      if (modifiers.length > 0) {
        console.log('First modifier being sent:', JSON.stringify(modifiers[0], null, 2));
      }
      socket.emit('available_modifiers', { modifiers });
    } catch (error) {
      console.error('Error getting modifiers:', error.message);
      socket.emit('error', { message: error.message });
    }
  });

  // Admin panel actions
  socket.on('admin_update_economy', (data) => {
    try {
      const { team, amount } = data;
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      // Update the economy in both places
      match.teams[team].economy = amount;
      match.sharedState.upgradeManager.economy[team] = amount;
      
      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === playerInfo.matchId) {
          const playerMatchState = matchManager.getMatchState(playerInfo.matchId, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState
          });
          
          // Also send updated available upgrades to reflect new economy
          const playerRole = matchManager.playerSockets.get(socketId)?.role;
          if (playerRole) {
            const playerTeam = getTeamFromRole(playerRole);
            const upgrades = match.sharedState.upgradeManager.getAvailableUpgrades(playerTeam);
            io.to(socketId).emit('available_upgrades', { upgrades });
          }
        }
      }
      
      socket.emit('admin_success', { message: `Economy updated for ${team}` });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('admin_toggle_upgrade', (data) => {
    try {
      const { team, pieceType, upgradeId } = data;
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const upgrades = match.teams[team].upgrades[pieceType];
      const index = upgrades.indexOf(upgradeId);
      
      if (index > -1) {
        // Remove the upgrade
        upgrades.splice(index, 1);
      } else {
        // Add the upgrade
        upgrades.push(upgradeId);
      }
      
      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === playerInfo.matchId) {
          const playerMatchState = matchManager.getMatchState(playerInfo.matchId, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState
          });
        }
      }
      
      socket.emit('admin_success', { message: `Upgrade toggled for ${team} ${pieceType}` });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('admin_reset_upgrades', (data) => {
    try {
      const { team } = data;
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      // Reset all upgrades for the team
      const { PieceType } = require('./types');
      match.teams[team].upgrades = {
        [PieceType.PAWN]: [],
        [PieceType.KNIGHT]: [],
        [PieceType.BISHOP]: [],
        [PieceType.ROOK]: [],
        [PieceType.QUEEN]: [],
        [PieceType.KING]: []
      };
      
      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === playerInfo.matchId) {
          const playerMatchState = matchManager.getMatchState(playerInfo.matchId, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState
          });
        }
      }
      
      socket.emit('admin_success', { message: `Upgrades reset for ${team}` });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('admin_add_upgrade', (data) => {
    try {
      const { team, pieceType, upgradeId } = data;
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const upgrades = match.teams[team].upgrades[pieceType];
      if (!upgrades.includes(upgradeId)) {
        upgrades.push(upgradeId);
      }
      
      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === playerInfo.matchId) {
          const playerMatchState = matchManager.getMatchState(playerInfo.matchId, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState
          });
        }
      }
      
      socket.emit('admin_success', { message: `Upgrade added for ${team} ${pieceType}` });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Poker game actions
  socket.on('poker_action', (data) => {
    try {
      const { action, amount } = data;
      console.log(`Poker action received: ${action}, amount: ${amount}`);
      
      const result = matchManager.makePokerAction(socket.id, action, amount);
      
      if (result.success) {
        // Send updated state to all players in the match
        const playerInfo = matchManager.playerSockets.get(socket.id);
        const matchId = playerInfo.matchId;
        
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
          }
        }
      } else {
        socket.emit('poker_error', { message: result.error });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Poker ready signal for next hand
  socket.on('poker_ready', (data = {}) => {
    try {
      const { ready = true } = data;
      console.log(`Poker ready signal from ${socket.id}: ${ready}`);
      
      const result = matchManager.setPokerPlayerReady(socket.id, ready);
      
      if (result.success) {
        // Send updated state to all players in the match
        const playerInfo = matchManager.playerSockets.get(socket.id);
        const matchId = playerInfo.matchId;
        
        // Notify all players in the match about ready status
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
          }
        }
      }
    } catch (error) {
      console.error('Error handling poker ready:', error);
      socket.emit('error', { message: error.message });
    }
  });

  // Debug: Start poker game manually
  socket.on('debug_start_poker', () => {
    console.log('Debug start poker received from:', socket.id);
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      console.log('Player info:', playerInfo);
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const pokerGame = match.games[GameSlot.B].state;
      console.log('Current poker game state:', {
        phase: pokerGame.phase,
        players: pokerGame.players.size,
        playerKeys: Array.from(pokerGame.players.keys())
      });
      
      // Start new hand if not already started
      if (pokerGame.phase === 'waiting' && pokerGame.players.size === 2) {
        pokerGame.startNewHand();
        pokerGame.dealHoleCards();
        console.log('Started poker game via debug command');
        
        // Send updated state to all players
        const matchId = playerInfo.matchId;
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
          }
        }
      } else {
        socket.emit('error', { message: 'Cannot start poker game - wrong phase or missing players' });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Deal next phase in poker
  socket.on('poker_next_phase', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const pokerGame = match.games[GameSlot.B].state;
      
      // Deal community cards based on current phase
      try {
        pokerGame.dealCommunityCards();
        console.log('Dealt community cards, new phase:', pokerGame.phase);
        
        // Send updated state to all players
        const matchId = playerInfo.matchId;
        for (const [socketId] of matchManager.playerSockets) {
          if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
            const playerMatchState = matchManager.getMatchState(matchId, socketId);
            io.to(socketId).emit('match_state_updated', {
              matchState: playerMatchState
            });
          }
        }
      } catch (error) {
        socket.emit('error', { message: error.message });
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Purchase a piece for barracks
  socket.on('purchase_piece', (data) => {
    try {
      const { matchId, pieceType } = data;
      const result = matchManager.purchasePiece(matchId, socket.id, pieceType);
      
      // Notify all players in the match
      const match = matchManager.matches.get(matchId);
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
          const playerMatchState = matchManager.getMatchState(matchId, socketId);
          io.to(socketId).emit('piece_purchased', {
            purchaser: socket.id,
            pieceType: pieceType,
            team: getTeamFromRole(matchManager.playerSockets.get(socket.id).role),
            result: result,
            matchState: playerMatchState
          });
          
          // Also send updated available upgrades to reflect new economy
          const playerRole = matchManager.playerSockets.get(socketId)?.role;
          if (playerRole && match) {
            const playerTeam = getTeamFromRole(playerRole);
            const upgrades = match.sharedState.upgradeManager.getAvailableUpgrades(playerTeam);
            io.to(socketId).emit('available_upgrades', { upgrades });
          }
        }
      }
    } catch (error) {
      socket.emit('purchase_error', { message: error.message });
    }
  });

  // Place piece from barracks
  socket.on('place_from_barracks', (data) => {
    try {
      const { matchId, pieceIndex, targetPosition } = data;
      const result = matchManager.placePieceFromBarracks(matchId, socket.id, pieceIndex, targetPosition);
      
      const playerInfo = matchManager.playerSockets.get(socket.id);
      const team = getTeamFromRole(playerInfo.role);
      
      // Notify all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
          const playerMatchState = matchManager.getMatchState(matchId, socketId);
          io.to(socketId).emit('piece_placed_from_barracks', {
            placer: socket.id,
            team: team,
            piece: result.piece,
            position: result.position,
            matchState: playerMatchState
          });
        }
      }
    } catch (error) {
      socket.emit('placement_error', { message: error.message });
    }
  });

  // Get purchasable pieces
  socket.on('get_purchasable_pieces', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const team = getTeamFromRole(playerInfo.role);
      const teamData = match.teams[team];
      
      // Get only unlocked piece types for this team
      const pieces = getPurchasablePiecesForTeam(teamData.unlockedPieceTypes);
      
      // Check if player has Zone C discount
      let hasDiscount = false;
      let discountedPieces = pieces;
      
      hasDiscount = match.sharedState.controlZoneOwnership?.C === team;
      
      if (hasDiscount) {
        // Apply discount to all pieces
        discountedPieces = pieces.map(piece => ({
          ...piece,
          originalPrice: piece.price,
          price: Math.ceil(piece.price * 0.5),
          hasDiscount: true
        }));
      }
      
      socket.emit('purchasable_pieces', { 
        pieces: discountedPieces,
        hasZoneCDiscount: hasDiscount,
        unlockedPieceTypes: teamData.unlockedPieceTypes
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Get unlocked piece types for a team
  socket.on('get_unlocked_piece_types', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }
      
      const match = matchManager.matches.get(playerInfo.matchId);
      if (!match) {
        throw new Error('Match not found');
      }
      
      const team = getTeamFromRole(playerInfo.role);
      const teamData = match.teams[team];
      
      socket.emit('unlocked_piece_types', { 
        unlockedPieceTypes: teamData.unlockedPieceTypes 
      });
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