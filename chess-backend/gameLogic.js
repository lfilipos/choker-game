const { PieceType, PieceColor, CONTROL_ZONES } = require('./types');
const { applyUpgradesToMoves, isProtectedByRook, canPieceBeCaptured, getAllValidMovesWithUpgrades } = require('./upgradeLogic');
const { SpecialMovesManager } = require('./specialMoves');

// Create initial chess board (16x10)
function createInitialBoard() {
  const board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place pawns in the center 8 columns (4 empty squares on each side)
  for (let col = 4; col < 12; col++) {
    board[1][col] = { type: PieceType.PAWN, color: PieceColor.BLACK };
    board[8][col] = { type: PieceType.PAWN, color: PieceColor.WHITE };
  }
  
  // Place other pieces in the center 8 columns
  const backRowPieces = [
    PieceType.ROOK, PieceType.KNIGHT, PieceType.BISHOP, PieceType.QUEEN, 
    PieceType.KING, PieceType.BISHOP, PieceType.KNIGHT, PieceType.ROOK
  ];
  
  for (let i = 0; i < 8; i++) {
    board[0][i + 4] = { type: backRowPieces[i], color: PieceColor.BLACK };
    board[9][i + 4] = { type: backRowPieces[i], color: PieceColor.WHITE };
  }
  
  return board;
}

// Check if position is valid on 16x10 board
function isValidPosition(pos) {
  return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16;
}

// Get possible moves for a piece
function getPossibleMoves(board, position, upgrades = null, upgradeManager = null) {
  const piece = board[position.row][position.col];
  if (!piece) return [];
  
  let standardMoves = [];
  
  switch (piece.type) {
    case PieceType.PAWN:
      standardMoves = getPawnMoves(board, position, piece.color);
      break;
    case PieceType.ROOK:
      standardMoves = getRookMoves(board, position, piece.color);
      break;
    case PieceType.BISHOP:
      standardMoves = getBishopMoves(board, position, piece.color);
      break;
    case PieceType.QUEEN:
      standardMoves = getQueenMoves(board, position, piece.color);
      break;
    case PieceType.KING:
      standardMoves = getKingMoves(board, position, piece.color);
      break;
    case PieceType.KNIGHT:
      standardMoves = getKnightMoves(board, position, piece.color);
      break;
    default:
      return [];
  }
  
  // Apply upgrades if available
  if (upgrades && upgradeManager) {
    console.log(`Standard moves for ${piece.type}: ${standardMoves.length} moves`);
    const upgradedMoves = applyUpgradesToMoves(board, position, piece, standardMoves, upgrades, upgradeManager);
    console.log(`Upgraded moves: ${upgradedMoves.length} moves`);
    return upgradedMoves;
  }
  
  return standardMoves;
}

function getPawnMoves(board, position, color) {
  const moves = [];
  const direction = color === PieceColor.WHITE ? -1 : 1;
  const startRow = color === PieceColor.WHITE ? 8 : 1;
  
  // Forward move
  const oneStep = { row: position.row + direction, col: position.col };
  if (isValidPosition(oneStep) && !board[oneStep.row][oneStep.col]) {
    moves.push(oneStep);
    
    // Two steps from starting position
    if (position.row === startRow) {
      const twoSteps = { row: position.row + 2 * direction, col: position.col };
      if (isValidPosition(twoSteps) && !board[twoSteps.row][twoSteps.col]) {
        moves.push(twoSteps);
      }
    }
  }
  
  // Diagonal captures
  const diagonals = [
    { row: position.row + direction, col: position.col - 1 },
    { row: position.row + direction, col: position.col + 1 }
  ];
  
  diagonals.forEach(pos => {
    if (isValidPosition(pos) && board[pos.row][pos.col] && board[pos.row][pos.col].color !== color) {
      moves.push(pos);
    }
  });
  
  return moves;
}

function getRookMoves(board, position, color) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  directions.forEach(([dRow, dCol]) => {
    for (let i = 1; i < 16; i++) {
      const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
      if (!isValidPosition(newPos)) break;
      
      const targetPiece = board[newPos.row][newPos.col];
      if (!targetPiece) {
        moves.push(newPos);
      } else {
        if (targetPiece.color !== color) {
          moves.push(newPos);
        }
        break;
      }
    }
  });
  
  return moves;
}

function getBishopMoves(board, position, color) {
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  
  directions.forEach(([dRow, dCol]) => {
    for (let i = 1; i < 16; i++) {
      const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
      if (!isValidPosition(newPos)) break;
      
      const targetPiece = board[newPos.row][newPos.col];
      if (!targetPiece) {
        moves.push(newPos);
      } else {
        if (targetPiece.color !== color) {
          moves.push(newPos);
        }
        break;
      }
    }
  });
  
  return moves;
}

function getQueenMoves(board, position, color) {
  return [...getRookMoves(board, position, color), ...getBishopMoves(board, position, color)];
}

function getKingMoves(board, position, color) {
  const moves = [];
  const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  
  directions.forEach(([dRow, dCol]) => {
    const newPos = { row: position.row + dRow, col: position.col + dCol };
    if (isValidPosition(newPos)) {
      const targetPiece = board[newPos.row][newPos.col];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push(newPos);
      }
    }
  });
  
  return moves;
}

function getKnightMoves(board, position, color) {
  const moves = [];
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  
  knightMoves.forEach(([dRow, dCol]) => {
    const newPos = { row: position.row + dRow, col: position.col + dCol };
    if (isValidPosition(newPos)) {
      const targetPiece = board[newPos.row][newPos.col];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push(newPos);
      }
    }
  });
  
  return moves;
}

// Make a move on the board with special move support
function makeMove(board, from, to, specialMoveType = null, specialMovesManager = null, upgrades = null) {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];
  
  if (specialMoveType && specialMovesManager && upgrades) {
    // Handle special moves
    switch (specialMoveType) {
      case 'knight_double':
        if (specialMovesManager.handleKnightDoubleMove(newBoard, from, to, piece.color, upgrades)) {
          newBoard[to.row][to.col] = piece;
          newBoard[from.row][from.col] = null;
          return newBoard;
        }
        break;
        
      case 'king_swap':
        if (specialMovesManager.handleKingPieceSwap(newBoard, from, to, piece.color, upgrades)) {
          const temp = newBoard[from.row][from.col];
          newBoard[from.row][from.col] = newBoard[to.row][to.col];
          newBoard[to.row][to.col] = temp;
          return newBoard;
        }
        break;
        
      case 'king_royal_command':
        const targetPiece = newBoard[to.row][to.col];
        if (specialMovesManager.handleKingRoyalCommand(newBoard, from, to, targetPiece, piece.color, upgrades)) {
          newBoard[to.row][to.col] = piece;
          newBoard[from.row][from.col] = null;
          return newBoard;
        }
        break;
        
      case 'queen_advanced_capture':
        if (specialMovesManager.handleQueenAdvancedCapture(newBoard, from, to, piece.color, upgrades)) {
          newBoard[to.row][to.col] = piece;
          newBoard[from.row][from.col] = null;
          return newBoard;
        }
        break;
        
      case 'queen_royal_teleport':
        if (specialMovesManager.handleQueenRoyalTeleport(newBoard, from, to, piece.color, upgrades)) {
          newBoard[to.row][to.col] = piece;
          newBoard[from.row][from.col] = null;
          return newBoard;
        }
        break;
    }
  }
  
  // Standard move
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;
  
  return newBoard;
}

// Calculate control zone status
function calculateControlZoneStatus(board, controlZone) {
  let whitePieces = 0;
  let blackPieces = 0;

  controlZone.squares.forEach(square => {
    const piece = board[square.row][square.col];
    if (piece) {
      if (piece.color === PieceColor.WHITE) {
        whitePieces++;
      } else if (piece.color === PieceColor.BLACK) {
        blackPieces++;
      }
    }
  });

  let controlledBy;
  if (whitePieces > blackPieces) {
    controlledBy = PieceColor.WHITE;
  } else if (blackPieces > whitePieces) {
    controlledBy = PieceColor.BLACK;
  } else {
    controlledBy = 'neutral';
  }

  return {
    zone: controlZone,
    whitePieces,
    blackPieces,
    controlledBy
  };
}

function calculateAllControlZoneStatuses(board) {
  return CONTROL_ZONES.map(zone => calculateControlZoneStatus(board, zone));
}

// Validate if a move is legal including special moves
function isValidMove(board, from, to, color, upgrades = null, upgradeManager = null, specialMovesManager = null) {
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== color) return false;
  
  // Check standard moves first
  const possibleMoves = getPossibleMoves(board, from, upgrades, upgradeManager);
  const isStandardMove = possibleMoves.some(move => move.row === to.row && move.col === to.col);
  
  if (isStandardMove) return true;
  
  // Check special moves if available
  if (specialMovesManager && upgrades) {
    const specialMoves = specialMovesManager.getAvailableSpecialMoves(board, from, piece, color, upgrades);
    
    for (const specialMove of specialMoves) {
      if (specialMove.available) {
        switch (specialMove.type) {
          case 'knight_double':
            if (piece.type === PieceType.KNIGHT && specialMovesManager.isValidKnightMove(from, to)) {
              return true;
            }
            break;
            
          case 'king_swap':
            if (piece.type === PieceType.KING) {
              const targetPiece = board[to.row][to.col];
              if (targetPiece && targetPiece.color === color && targetPiece.type !== PieceType.KING) {
                return true;
              }
            }
            break;
            
          case 'king_royal_command':
            if (piece.type === PieceType.KING) {
              const targetPiece = board[to.row][to.col];
              if (targetPiece && targetPiece.color === color && specialMovesManager.isAdjacent(from, to)) {
                return true;
              }
            }
            break;
            
          case 'queen_advanced_capture':
            if (piece.type === PieceType.QUEEN) {
              return specialMovesManager.isValidQueenAdvancedCapture(board, to, color);
            }
            break;
            
          case 'queen_royal_teleport':
            if (piece.type === PieceType.QUEEN) {
              const targetPiece = board[to.row][to.col];
              return !targetPiece; // Can only teleport to empty squares
            }
            break;
        }
      }
    }
  }
  
  return false;
}

// This function is now imported from upgradeLogic.js

// Get all valid moves for a player considering upgrades
function getAllValidMoves(board, color, upgrades = null, upgradeManager = null) {
  const allMoves = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const position = { row, col };
        const moves = getPossibleMoves(board, position, upgrades, upgradeManager);
        
        moves.forEach(move => {
          allMoves.push({
            from: position,
            to: move,
            piece: piece
          });
        });
      }
    }
  }
  
  return allMoves;
}

// Check if a move would result in check
function wouldMoveResultInCheck(board, from, to, color, upgrades = null, upgradeManager = null) {
  // Make the move on a copy of the board
  const newBoard = makeMove(board, from, to);
  
  // Find the king's position
  let kingPosition = null;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = newBoard[row][col];
      if (piece && piece.type === PieceType.KING && piece.color === color) {
        kingPosition = { row, col };
        break;
      }
    }
    if (kingPosition) break;
  }
  
  if (!kingPosition) return false;
  
  // Check if any enemy piece can capture the king
  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = newBoard[row][col];
      if (piece && piece.color === enemyColor) {
        const moves = getPossibleMoves(newBoard, { row, col }, upgrades, upgradeManager);
        if (moves.some(move => move.row === kingPosition.row && move.col === kingPosition.col)) {
          return true; // Move would result in check
        }
      }
    }
  }
  
  return false;
}

// Get valid moves that don't result in check
function getValidMovesWithoutCheck(board, position, color, upgrades = null, upgradeManager = null) {
  const allMoves = getPossibleMoves(board, position, upgrades, upgradeManager);
  const validMoves = [];
  
  allMoves.forEach(move => {
    if (!wouldMoveResultInCheck(board, position, move, color, upgrades, upgradeManager)) {
      validMoves.push(move);
    }
  });
  
  return validMoves;
}

// Enhanced move validation considering protection mechanics
function isValidMoveWithProtection(board, from, to, color, upgrades = null, upgradeManager = null) {
  // First check if it's a basic valid move
  if (!isValidMove(board, from, to, color, upgrades, upgradeManager)) {
    return false;
  }
  
  // Check if the target piece is protected and can't be captured
  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.color !== color) {
    // This is a capture move
    if (!canPieceBeCaptured(board, to, color, upgrades)) {
      return false; // Target is protected
    }
  }
  
  return true;
}

// Get all valid moves with enhanced validation
function getAllValidMovesEnhanced(board, color, upgrades = null, upgradeManager = null) {
  const allMoves = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const position = { row, col };
        const moves = getPossibleMoves(board, position, upgrades, upgradeManager);
        
        moves.forEach(move => {
          // Check if this move is valid considering protection mechanics
          if (isValidMoveWithProtection(board, position, move, color, upgrades, upgradeManager)) {
            allMoves.push({
              from: position,
              to: move,
              piece: piece,
              isCapture: board[move.row][move.col] !== null,
              isProtected: board[move.row][move.col] && !canPieceBeCaptured(board, move, color, upgrades)
            });
          }
        });
      }
    }
  }
  
  return allMoves;
}

// Check if a position is under attack considering upgrades
function isPositionUnderAttack(board, position, byColor, upgrades = null, upgradeManager = null) {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const moves = getPossibleMoves(board, { row, col }, upgrades, upgradeManager);
        if (moves.some(move => move.row === position.row && move.col === position.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Check if a king is in check considering upgrades
function isKingInCheck(board, color, upgrades = null, upgradeManager = null) {
  // Find the king's position
  let kingPosition = null;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PieceType.KING && piece.color === color) {
        kingPosition = { row, col };
        break;
      }
    }
    if (kingPosition) break;
  }
  
  if (!kingPosition) return false;
  
  // Check if any enemy piece can attack the king
  const enemyColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  return isPositionUnderAttack(board, kingPosition, enemyColor, upgrades, upgradeManager);
}

// Get all valid moves including special moves
function getAllValidMovesWithSpecialMoves(board, color, upgrades = null, upgradeManager = null, specialMovesManager = null) {
  const allMoves = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const position = { row, col };
        const moves = getPossibleMoves(board, position, upgrades, upgradeManager);
        
        moves.forEach(move => {
          allMoves.push({
            from: position,
            to: move,
            piece: piece,
            isStandard: true
          });
        });
        
        // Add special moves if available
        if (specialMovesManager && upgrades) {
          const specialMoves = specialMovesManager.getAvailableSpecialMoves(board, position, piece, color, upgrades);
          
          specialMoves.forEach(specialMove => {
            if (specialMove.available) {
              // Add special move targets based on move type
              const specialMoveTargets = getSpecialMoveTargets(board, position, piece, specialMove.type, color);
              
              specialMoveTargets.forEach(target => {
                allMoves.push({
                  from: position,
                  to: target,
                  piece: piece,
                  isStandard: false,
                  specialMoveType: specialMove.type,
                  description: specialMove.description
                });
              });
            }
          });
        }
      }
    }
  }
  
  return allMoves;
}

// Get valid targets for special moves
function getSpecialMoveTargets(board, position, piece, specialMoveType, color) {
  const targets = [];
  
  switch (specialMoveType) {
    case 'knight_double':
      // Add all valid knight move targets
      const knightMoves = getKnightMoves(board, position, color);
      targets.push(...knightMoves);
      break;
      
    case 'king_swap':
      // Add all allied piece positions
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 16; col++) {
          const targetPiece = board[row][col];
          if (targetPiece && targetPiece.color === color && targetPiece.type !== PieceType.KING) {
            targets.push({ row, col });
          }
        }
      }
      break;
      
      case 'king_royal_command':
        // Add adjacent positions
        for (let dRow = -1; dRow <= 1; dRow++) {
          for (let dCol = -1; dCol <= 1; dCol++) {
            if (dRow === 0 && dCol === 0) continue;
            
            const newPos = { row: position.row + dRow, col: position.col + dCol };
            if (isValidPosition(newPos)) {
              targets.push(newPos);
            }
          }
        }
        break;
        
      case 'queen_advanced_capture':
        // Add all valid queen move targets (the actual logic is in upgradeLogic.js)
        // This is just for target generation
        const queenMoves = getQueenMoves(board, position, color);
        targets.push(...queenMoves);
        break;
        
      case 'queen_royal_teleport':
        // Add all empty squares
        for (let row = 0; row < 10; row++) {
          for (let col = 0; col < 16; col++) {
            if (!board[row][col] && (row !== position.row || col !== position.col)) {
              targets.push({ row, col });
            }
          }
        }
        break;
  }
  
  return targets;
}

// Reset special moves for a new turn
function resetSpecialMovesForNewTurn(specialMovesManager) {
  if (specialMovesManager) {
    specialMovesManager.resetTurn();
  }
}

module.exports = {
  createInitialBoard,
  isValidPosition,
  getPossibleMoves,
  makeMove,
  calculateControlZoneStatus,
  calculateAllControlZoneStatuses,
  isValidMove,
  canPieceBeCaptured,
  getAllValidMoves,
  wouldMoveResultInCheck,
  getValidMovesWithoutCheck,
  isValidMoveWithProtection,
  getAllValidMovesEnhanced,
  isPositionUnderAttack,
  isKingInCheck,
  getAllValidMovesWithSpecialMoves,
  getSpecialMoveTargets,
  resetSpecialMovesForNewTurn
};