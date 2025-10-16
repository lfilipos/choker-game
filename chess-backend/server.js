const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const MatchManager = require('./matchManager');
const { getPossibleMoves } = require('./gameLogic');
const { GameSlot, getTeamFromRole, getGameSlotFromRole, TeamColor } = require('./matchTypes');
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

  // Skip second pawn move in dual movement
  socket.on('skip_second_pawn_move', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const dualMovementState = match.sharedState.dualMovementState;

      // Verify the player is in dual movement state
      if (!dualMovementState.active || dualMovementState.playerTeam !== playerTeam) {
        throw new Error('Not in dual movement mode');
      }

      console.log(`${playerTeam} skipped second pawn move`);

      // Reset dual movement state
      dualMovementState.active = false;
      dualMovementState.firstPawnPosition = null;
      dualMovementState.playerTeam = null;

      // Switch turns
      const game = match.games.A; // Chess game
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'second_move_skipped'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Skip second knight move in double jump
  socket.on('skip_second_knight_move', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const knightDoubleJumpState = match.sharedState.knightDoubleJumpState;

      // Verify the player is in knight double jump state
      if (!knightDoubleJumpState.active || knightDoubleJumpState.playerTeam !== playerTeam) {
        throw new Error('Not in knight double jump mode');
      }

      console.log(`${playerTeam} skipped second knight move`);

      // Reset knight double jump state
      knightDoubleJumpState.active = false;
      knightDoubleJumpState.firstKnightPosition = null;
      knightDoubleJumpState.playerTeam = null;
      knightDoubleJumpState.hasCaptured = false;

      // Switch turns
      const game = match.games.A; // Chess game
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'second_knight_move_skipped'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Skip second nimble knight move
  socket.on('skip_second_nimble_move', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const nimbleKnightState = match.sharedState.nimbleKnightState;

      // Verify the player is in nimble knight state
      if (!nimbleKnightState.active || nimbleKnightState.playerTeam !== playerTeam) {
        throw new Error('Not in nimble knight mode');
      }

      console.log(`${playerTeam} skipped second nimble knight move`);

      // Reset nimble knight state
      nimbleKnightState.active = false;
      nimbleKnightState.knightPosition = null;
      nimbleKnightState.playerTeam = null;

      // Switch turns
      const game = match.games.A; // Chess game
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'second_nimble_move_skipped'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Skip second queen move (Queen's Hook)
  socket.on('skip_second_queen_move', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const queensHookState = match.sharedState.queensHookState;

      // Verify the player is in Queen's Hook state
      if (!queensHookState.active || queensHookState.playerTeam !== playerTeam) {
        throw new Error('Not in Queen\'s Hook mode');
      }

      console.log(`${playerTeam} finalized queen position (skipped second move)`);

      // Reset Queen's Hook state
      queensHookState.active = false;
      queensHookState.firstMovePosition = null;
      queensHookState.playerTeam = null;

      // Switch turns
      const game = match.games.A; // Chess game
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'second_queen_move_skipped'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Initiate Royal Command
  socket.on('initiate_royal_command', (data) => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const game = match.games.A; // Chess game
      
      // Verify it's player's turn
      if (game.currentPlayer !== playerTeam) {
        throw new Error('Not your turn');
      }

      const { kingPosition, controlledPiecePosition } = data;
      const royalCommandState = match.sharedState.royalCommandState;

      // Verify the king position has a king of the player's color
      const kingPiece = game.board[kingPosition.row][kingPosition.col];
      if (!kingPiece || kingPiece.type !== 'king' || kingPiece.color !== playerTeam) {
        throw new Error('Invalid king position');
      }

      // Verify there's a piece at the controlled position
      const controlledPiece = game.board[controlledPiecePosition.row][controlledPiecePosition.col];
      if (!controlledPiece) {
        throw new Error('No piece at controlled position');
      }

      // Verify the controlled piece is within range (2 squares)
      const rowDiff = Math.abs(controlledPiecePosition.row - kingPosition.row);
      const colDiff = Math.abs(controlledPiecePosition.col - kingPosition.col);
      if (rowDiff > 2 || colDiff > 2) {
        throw new Error('Piece is too far from king');
      }

      console.log(`${playerTeam} initiating Royal Command: king at (${kingPosition.row},${kingPosition.col}) controlling piece at (${controlledPiecePosition.row},${controlledPiecePosition.col})`);

      // Set Royal Command state
      royalCommandState.active = true;
      royalCommandState.kingPosition = kingPosition;
      royalCommandState.controlledPiecePosition = controlledPiecePosition;
      royalCommandState.playerTeam = playerTeam;

      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_command_initiated'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Cancel Royal Command (reset state without ending turn)
  socket.on('cancel_royal_command', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const royalCommandState = match.sharedState.royalCommandState;

      // Verify the player is in Royal Command state
      if (!royalCommandState.active || royalCommandState.playerTeam !== playerTeam) {
        throw new Error('Not in Royal Command mode');
      }

      console.log(`${playerTeam} canceled Royal Command (without ending turn)`);

      // Reset Royal Command state BUT DON'T switch turns
      royalCommandState.active = false;
      royalCommandState.kingPosition = null;
      royalCommandState.controlledPiecePosition = null;
      royalCommandState.playerTeam = null;

      // Don't switch turns - player can still make their move
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_command_canceled'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Skip Royal Command second move (ends turn)
  socket.on('skip_royal_command', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const royalCommandState = match.sharedState.royalCommandState;

      // Verify the player is in Royal Command state
      if (!royalCommandState.active || royalCommandState.playerTeam !== playerTeam) {
        throw new Error('Not in Royal Command mode');
      }

      console.log(`${playerTeam} skipped Royal Command move`);

      // Reset Royal Command state
      royalCommandState.active = false;
      royalCommandState.kingPosition = null;
      royalCommandState.controlledPiecePosition = null;
      royalCommandState.playerTeam = null;

      // Switch turns
      const game = match.games.A; // Chess game
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_command_skipped'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Initiate Royal Exchange (king selects a rook to swap with)
  socket.on('initiate_royal_exchange', (data) => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const game = match.games.A; // Chess game
      
      // Verify it's player's turn
      if (game.currentPlayer !== playerTeam) {
        throw new Error('Not your turn');
      }

      const { kingPosition } = data;
      const royalExchangeState = match.sharedState.royalExchangeState;

      // Verify the king position has a king of the player's color
      const kingPiece = game.board[kingPosition.row][kingPosition.col];
      if (!kingPiece || kingPiece.type !== 'king' || kingPiece.color !== playerTeam) {
        throw new Error('Invalid king position');
      }

      // Verify player has the Royal Exchange upgrade
      const teamData = match.teams[playerTeam];
      if (!teamData.upgrades.king || !teamData.upgrades.king.includes('king_swap')) {
        throw new Error('Royal Exchange upgrade not purchased');
      }

      console.log(`${playerTeam} initiating Royal Exchange: king at (${kingPosition.row},${kingPosition.col})`);

      // Set Royal Exchange state
      royalExchangeState.active = true;
      royalExchangeState.kingPosition = kingPosition;
      royalExchangeState.selectedRookPosition = null;
      royalExchangeState.playerTeam = playerTeam;

      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_exchange_initiated'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Cancel Royal Exchange (reset state without ending turn or deducting money)
  socket.on('cancel_royal_exchange', () => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const royalExchangeState = match.sharedState.royalExchangeState;

      // Verify the player is in Royal Exchange state
      if (!royalExchangeState.active || royalExchangeState.playerTeam !== playerTeam) {
        throw new Error('Not in Royal Exchange mode');
      }

      console.log(`${playerTeam} canceled Royal Exchange (without ending turn or deducting money)`);

      // Reset Royal Exchange state BUT DON'T switch turns or deduct money
      royalExchangeState.active = false;
      royalExchangeState.kingPosition = null;
      royalExchangeState.selectedRookPosition = null;
      royalExchangeState.playerTeam = null;

      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_exchange_canceled'
          });
        }
      }
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  // Execute Royal Exchange (swap king with selected rook for 400 cost)
  socket.on('execute_royal_exchange', (data) => {
    try {
      const playerInfo = matchManager.playerSockets.get(socket.id);
      if (!playerInfo) {
        throw new Error('Player not found');
      }

      const { matchId, role } = playerInfo;
      const match = matchManager.matches.get(matchId);
      
      if (!match) {
        throw new Error('Match not found');
      }

      const playerTeam = getTeamFromRole(role);
      const game = match.games.A; // Chess game
      const teamData = match.teams[playerTeam];
      
      // Verify it's player's turn
      if (game.currentPlayer !== playerTeam) {
        throw new Error('Not your turn');
      }

      const { kingPosition, rookPosition } = data;
      const royalExchangeState = match.sharedState.royalExchangeState;

      // Verify the player is in Royal Exchange state
      if (!royalExchangeState.active || royalExchangeState.playerTeam !== playerTeam) {
        throw new Error('Not in Royal Exchange mode');
      }

      // Verify positions are valid
      const kingPiece = game.board[kingPosition.row][kingPosition.col];
      const rookPiece = game.board[rookPosition.row][rookPosition.col];

      if (!kingPiece || kingPiece.type !== 'king' || kingPiece.color !== playerTeam) {
        throw new Error('Invalid king position');
      }

      if (!rookPiece || rookPiece.type !== 'rook' || rookPiece.color !== playerTeam) {
        throw new Error('Invalid rook position');
      }

      // Check if player has enough money (400 per use)
      const ROYAL_EXCHANGE_COST = 400;
      if (teamData.economy < ROYAL_EXCHANGE_COST) {
        throw new Error(`Insufficient funds. Royal Exchange costs ${ROYAL_EXCHANGE_COST}. Current balance: ${teamData.economy}`);
      }

      console.log(`${playerTeam} executing Royal Exchange: swapping king at (${kingPosition.row},${kingPosition.col}) with rook at (${rookPosition.row},${rookPosition.col})`);

      // Deduct the cost
      teamData.economy -= ROYAL_EXCHANGE_COST;
      match.sharedState.upgradeManager.economy[playerTeam] -= ROYAL_EXCHANGE_COST;

      // Perform the swap
      game.board[kingPosition.row][kingPosition.col] = rookPiece;
      game.board[rookPosition.row][rookPosition.col] = kingPiece;

      // Add to move history
      game.moveHistory.push({
        from: kingPosition,
        to: rookPosition,
        piece: kingPiece,
        isRoyalExchange: true
      });

      // Reset Royal Exchange state
      royalExchangeState.active = false;
      royalExchangeState.kingPosition = null;
      royalExchangeState.selectedRookPosition = null;
      royalExchangeState.playerTeam = null;

      // Switch turns
      game.currentPlayer = game.currentPlayer === 'white' ? 'black' : 'white';
      
      match.lastActivity = new Date();

      // Send updated match state to all players in the match
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === match.id) {
          const playerMatchState = matchManager.getMatchState(match.id, socketId);
          io.to(socketId).emit('match_state_updated', {
            matchState: playerMatchState,
            reason: 'royal_exchange_executed'
          });
        }
      }
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
      
      let possibleMoves = getPossibleMoves(
        game.board, 
        position, 
        upgradeState, 
        match.sharedState.upgradeManager,
        game.rookLinks || [],
        match.sharedState.nimbleKnightState,
        match.sharedState.knightDoubleJumpState,
        match.sharedState.royalCommandState,
        match.sharedState.queensHookState
      );
      
      // Filter moves for knight double jump restrictions
      const knightDoubleJumpState = match.sharedState.knightDoubleJumpState;
      const playerTeam = piece?.color;
      
      if (knightDoubleJumpState.active && 
          knightDoubleJumpState.playerTeam === playerTeam &&
          piece?.type === 'knight') {
        // This is the second knight move
        const originalStart = knightDoubleJumpState.firstKnightPosition.from;
        
        // Filter out the original starting position
        possibleMoves = possibleMoves.filter(move => {
          return !(move.row === originalStart.row && move.col === originalStart.col);
        });
        
        // If already captured, filter out all capture moves
        if (knightDoubleJumpState.hasCaptured) {
          possibleMoves = possibleMoves.filter(move => {
            return !game.board[move.row][move.col]; // Only allow moves to empty squares
          });
        }
      }
      
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
      
      // Get all piece types and mark which ones are unlocked
      const allPieces = getPurchasablePieces();
      const piecesWithAvailability = allPieces.map(piece => ({
        ...piece,
        isUnlocked: teamData.unlockedPieceTypes.includes(piece.type),
        isAvailable: teamData.unlockedPieceTypes.includes(piece.type)
      }));
      
      // Check if player has Zone C discount
      let hasDiscount = false;
      let discountedPieces = piecesWithAvailability;
      
      hasDiscount = match.sharedState.controlZoneOwnership?.C === team;
      
      if (hasDiscount) {
        // Apply discount to unlocked pieces only
        discountedPieces = piecesWithAvailability.map(piece => ({
          ...piece,
          originalPrice: piece.isUnlocked ? piece.price : piece.price,
          price: piece.isUnlocked ? Math.ceil(piece.price * 0.5) : piece.price,
          hasDiscount: piece.isUnlocked
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

  // Link two rooks to create a wall
  socket.on('link_rooks', (data) => {
    try {
      const { rook1Pos, rook2Pos } = data;
      const result = matchManager.linkRooks(socket.id, rook1Pos, rook2Pos);
      
      // Send updated match state to all players in the match
      const playerInfo = matchManager.playerSockets.get(socket.id);
      const matchId = playerInfo.matchId;
      
      for (const [socketId] of matchManager.playerSockets) {
        if (matchManager.playerSockets.get(socketId)?.matchId === matchId) {
          const playerMatchState = matchManager.getMatchState(matchId, socketId);
          io.to(socketId).emit('rook_links_updated', {
            rookLinks: result.rookLinks,
            matchState: playerMatchState
          });
        }
      }
      
      console.log(`Rooks linked in match ${matchId}`);
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