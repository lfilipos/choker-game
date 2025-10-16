const { PieceType, PieceColor, CONTROL_ZONES } = require('./types');
const { applyUpgradesToMoves, isProtectedByQueenAura, isProtectedByRook } = require('./upgradeLogic');
const { calculateWallSquares, isWallSquare } = require('./rookWallLogic');

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
function getPossibleMoves(board, position, upgrades = null, upgradeManager = null, rookLinks = null, nimbleKnightState = null, knightDoubleJumpState = null, royalCommandState = null) {
  const piece = board[position.row][position.col];
  if (!piece) return [];
  
  // Check if this piece is being controlled by Royal Command
  const isControlledPiece = royalCommandState && royalCommandState.active &&
                            royalCommandState.controlledPiecePosition &&
                            royalCommandState.controlledPiecePosition.row === position.row &&
                            royalCommandState.controlledPiecePosition.col === position.col;
  
  if (isControlledPiece) {
    // Get the controlling king's color (from playerTeam/color)
    const controllingColor = royalCommandState.playerTeam;
    const { getRoyalCommandControlledMoves } = require('./upgradeLogic');
    return getRoyalCommandControlledMoves(board, position, piece, controllingColor);
  }
  
  let standardMoves = [];
  
  switch (piece.type) {
    case PieceType.PAWN:
      standardMoves = getPawnMoves(board, position, piece.color, rookLinks);
      break;
    case PieceType.ROOK:
      standardMoves = getRookMoves(board, position, piece.color, rookLinks);
      break;
    case PieceType.BISHOP:
      standardMoves = getBishopMoves(board, position, piece.color, rookLinks);
      break;
    case PieceType.QUEEN:
      standardMoves = getQueenMoves(board, position, piece.color, rookLinks);
      break;
    case PieceType.KING:
      standardMoves = getKingMoves(board, position, piece.color, rookLinks);
      break;
    case PieceType.KNIGHT:
      standardMoves = getKnightMoves(board, position, piece.color, rookLinks);
      break;
    default:
      return [];
  }
  
  // Apply upgrades if available
  if (upgrades && upgradeManager) {
    console.log(`Standard moves for ${piece.type}: ${standardMoves.length} moves`);
    const upgradedMoves = applyUpgradesToMoves(board, position, piece, standardMoves, upgrades, upgradeManager, nimbleKnightState, knightDoubleJumpState, royalCommandState);
    console.log(`Upgraded moves: ${upgradedMoves.length} moves`);
    
    // Filter out moves that would capture rook-protected pieces
    // Note: Queen aura protection is now handled as evasion during move execution, not filtering
    const filteredMoves = upgradedMoves.filter(move => {
      const targetPiece = board[move.row][move.col];
      if (targetPiece && targetPiece.color !== piece.color) {
        // This is a capture move, check if the target is protected by rook
        const isProtected = isProtectedByRook(board, move, targetPiece.color, upgrades);
        return !isProtected;
      }
      return true; // Non-capture moves are always valid
    });
    
    console.log(`Filtered moves (removing protected pieces): ${filteredMoves.length} moves`);
    return filteredMoves;
  }
  
  return standardMoves;
}

function getPawnMoves(board, position, color, rookLinks = null) {
  const moves = [];
  const direction = color === PieceColor.WHITE ? -1 : 1;
  const startRow = color === PieceColor.WHITE ? 8 : 1;
  
  // Calculate wall squares
  const wallSquares = rookLinks ? calculateWallSquares(rookLinks) : [];
  
  // Forward move
  const oneStep = { row: position.row + direction, col: position.col };
  const oneStepWall = isWallSquare(oneStep, wallSquares);
  
  // Can't move onto a wall square, unless it's our own wall
  if (isValidPosition(oneStep) && !board[oneStep.row][oneStep.col] && 
      (!oneStepWall || oneStepWall.color === color)) {
    moves.push(oneStep);
    
    // Two steps from starting position
    if (position.row === startRow) {
      const twoSteps = { row: position.row + 2 * direction, col: position.col };
      const twoStepsWall = isWallSquare(twoSteps, wallSquares);
      
      if (isValidPosition(twoSteps) && !board[twoSteps.row][twoSteps.col] &&
          (!twoStepsWall || twoStepsWall.color === color) &&
          (!oneStepWall || oneStepWall.color === color)) { // Can't move through enemy wall
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
    const wall = isWallSquare(pos, wallSquares);
    // Can capture through own wall but not enemy wall
    if (isValidPosition(pos) && board[pos.row][pos.col] && board[pos.row][pos.col].color !== color &&
        (!wall || wall.color === color)) {
      moves.push(pos);
    }
  });
  
  return moves;
}

function getRookMoves(board, position, color, rookLinks = null) {
  const moves = [];
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const wallSquares = rookLinks ? calculateWallSquares(rookLinks) : [];
  
  directions.forEach(([dRow, dCol]) => {
    for (let i = 1; i < 16; i++) {
      const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
      if (!isValidPosition(newPos)) break;
      
      const wall = isWallSquare(newPos, wallSquares);
      // Can't move to or through enemy wall
      if (wall && wall.color !== color) {
        break;
      }
      
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

function getBishopMoves(board, position, color, rookLinks = null) {
  const moves = [];
  const directions = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const wallSquares = rookLinks ? calculateWallSquares(rookLinks) : [];
  
  directions.forEach(([dRow, dCol]) => {
    for (let i = 1; i < 16; i++) {
      const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
      if (!isValidPosition(newPos)) break;
      
      const wall = isWallSquare(newPos, wallSquares);
      // Can't move to or through enemy wall
      if (wall && wall.color !== color) {
        break;
      }
      
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

function getQueenMoves(board, position, color, rookLinks = null) {
  return [...getRookMoves(board, position, color, rookLinks), ...getBishopMoves(board, position, color, rookLinks)];
}

function getKingMoves(board, position, color, rookLinks = null) {
  const moves = [];
  const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const wallSquares = rookLinks ? calculateWallSquares(rookLinks) : [];
  
  directions.forEach(([dRow, dCol]) => {
    const newPos = { row: position.row + dRow, col: position.col + dCol };
    if (isValidPosition(newPos)) {
      const wall = isWallSquare(newPos, wallSquares);
      // Can't move onto enemy wall
      if (wall && wall.color !== color) {
        return;
      }
      
      const targetPiece = board[newPos.row][newPos.col];
      if (!targetPiece || targetPiece.color !== color) {
        moves.push(newPos);
      }
    }
  });
  
  return moves;
}

function getKnightMoves(board, position, color, rookLinks = null) {
  const moves = [];
  const knightMoves = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  // Knights can jump over walls, so we don't need to check wall squares
  
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

// Make a move on the board
function makeMove(board, from, to) {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];
  
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

// Check if a piece is protected by any protection mechanism
function isPieceProtected(board, position, color, upgrades) {
  if (!upgrades || !upgrades[color]) return false;
  
  return isProtectedByQueenAura(board, position, color, upgrades) ||
         isProtectedByRook(board, position, color, upgrades);
}

// Validate if a move is legal
function isValidMove(board, from, to, color, upgrades = null, upgradeManager = null, rookLinks = null, nimbleKnightState = null, knightDoubleJumpState = null, royalCommandState = null) {
  const piece = board[from.row][from.col];
  if (!piece) return false;
  
  // Check if this is a Royal Command move
  const isRoyalCommandMove = royalCommandState && royalCommandState.active && 
                             royalCommandState.playerTeam === color &&
                             royalCommandState.controlledPiecePosition &&
                             royalCommandState.controlledPiecePosition.row === from.row &&
                             royalCommandState.controlledPiecePosition.col === from.col;
  
  // Normal validation: piece must belong to current player
  // Exception: Royal Command allows moving enemy pieces
  if (!isRoyalCommandMove && piece.color !== color) return false;
  
  const possibleMoves = getPossibleMoves(board, from, upgrades, upgradeManager, rookLinks, nimbleKnightState, knightDoubleJumpState, royalCommandState);
  return possibleMoves.some(move => move.row === to.row && move.col === to.col);
}

module.exports = {
  createInitialBoard,
  isValidPosition,
  getPossibleMoves,
  makeMove,
  calculateControlZoneStatus,
  calculateAllControlZoneStatuses,
  isValidMove,
  isPieceProtected
};