const { PieceType, PieceColor } = require('./types');
const { UPGRADE_DEFINITIONS } = require('./upgradeDefinitions');

// Check if a piece has a specific upgrade effect
function hasUpgradeEffect(upgrades, color, pieceType, effectValue) {
  const pieceUpgrades = upgrades[color][pieceType] || [];
  
  for (const upgradeId of pieceUpgrades) {
    const upgrade = UPGRADE_DEFINITIONS[upgradeId];
    if (upgrade && upgrade.effects.some(effect => effect.value === effectValue)) {
      return true;
    }
  }
  
  return false;
}

// Get upgraded pawn moves
function getUpgradedPawnMoves(board, position, color, upgrades, standardMoves) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.PAWN] || [];
  
  console.log(`Pawn upgrades for ${color}:`, pieceUpgrades);
  
  // Check for speed boost upgrade
  if (pieceUpgrades.includes('pawn_speed_boost')) {
    console.log('Pawn has speed boost upgrade!');
    const direction = color === PieceColor.WHITE ? -1 : 1;
    const startRow = color === PieceColor.WHITE ? 8 : 1;
    
    // If on starting row and path is clear, can move 3 squares
    if (position.row === startRow) {
      let pathClear = true;
      for (let i = 1; i <= 3; i++) {
        const checkRow = position.row + i * direction;
        if (checkRow < 0 || checkRow >= 10 || board[checkRow][position.col]) {
          pathClear = false;
          break;
        }
      }
      
      if (pathClear) {
        const threeSquareMove = { row: position.row + 3 * direction, col: position.col };
        console.log('Adding 3-square move:', threeSquareMove);
        moves.push(threeSquareMove);
      }
    }
  }
  
  // Check for diagonal range upgrade
  if (pieceUpgrades.includes('pawn_diagonal_range')) {
    const direction = color === PieceColor.WHITE ? -1 : 1;
    
    // Can capture diagonally from 2 squares away
    const extendedDiagonals = [
      { row: position.row + 2 * direction, col: position.col - 2 },
      { row: position.row + 2 * direction, col: position.col + 2 }
    ];
    
    extendedDiagonals.forEach(pos => {
      if (pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16) {
        const targetPiece = board[pos.row][pos.col];
        if (targetPiece && targetPiece.color !== color) {
          moves.push(pos);
        }
      }
    });
  }
  
  return moves;
}

// Get upgraded knight moves
function getUpgradedKnightMoves(board, position, color, upgrades, standardMoves) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.KNIGHT] || [];
  
  // Check for extended leap upgrade
  if (pieceUpgrades.includes('knight_extended_leap')) {
    // Add 3-2 L-shape moves
    const extendedMoves = [
      { row: position.row + 3, col: position.col + 2 },
      { row: position.row + 3, col: position.col - 2 },
      { row: position.row - 3, col: position.col + 2 },
      { row: position.row - 3, col: position.col - 2 },
      { row: position.row + 2, col: position.col + 3 },
      { row: position.row + 2, col: position.col - 3 },
      { row: position.row - 2, col: position.col + 3 },
      { row: position.row - 2, col: position.col - 3 }
    ];
    
    extendedMoves.forEach(pos => {
      if (pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16) {
        const targetPiece = board[pos.row][pos.col];
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(pos);
        }
      }
    });
  }
  
  return moves;
}

// Get upgraded bishop moves
function getUpgradedBishopMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.BISHOP] || [];
  
  // Check for color break upgrade (one orthogonal move per game)
  if (pieceUpgrades.includes('bishop_color_break') && 
      !upgradeManager.hasUsedOnceUpgrade(color, PieceType.BISHOP, 'bishop_color_break', position)) {
    // Add single orthogonal moves
    const orthogonalMoves = [
      { row: position.row + 1, col: position.col },
      { row: position.row - 1, col: position.col },
      { row: position.row, col: position.col + 1 },
      { row: position.row, col: position.col - 1 }
    ];
    
    orthogonalMoves.forEach(pos => {
      if (pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16) {
        const targetPiece = board[pos.row][pos.col];
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(pos);
        }
      }
    });
  }
  
  // Check for piercing upgrade (jump over one piece)
  if (pieceUpgrades.includes('bishop_piercing')) {
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    
    directions.forEach(([dRow, dCol]) => {
      let jumped = false;
      for (let i = 1; i < 16; i++) {
        const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
        if (newPos.row < 0 || newPos.row >= 10 || newPos.col < 0 || newPos.col >= 16) break;
        
        const targetPiece = board[newPos.row][newPos.col];
        if (targetPiece) {
          if (!jumped) {
            jumped = true; // Jump over this piece
            continue;
          } else if (targetPiece.color !== color) {
            moves.push(newPos); // Can capture after jumping
            break;
          } else {
            break; // Can't capture own piece
          }
        } else if (jumped) {
          moves.push(newPos); // Empty square after jumping
        }
      }
    });
  }
  
  return moves;
}

// Get upgraded rook moves
function getUpgradedRookMoves(board, position, color, upgrades, standardMoves) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.ROOK] || [];
  
  // Pawn Protection upgrade - no additional movement abilities, just protection effect
  // The protection logic is handled in move validation, not in move generation
  if (pieceUpgrades.includes('rook_pawn_protection')) {
    console.log('Rook has pawn protection upgrade!');
  }
  
  return moves;
}

// Get upgraded queen moves
function getUpgradedQueenMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.QUEEN] || [];
  
  // Check for teleport upgrade (once per game)
  if (pieceUpgrades.includes('queen_teleport') && 
      !upgradeManager.hasUsedOnceUpgrade(color, PieceType.QUEEN, 'queen_teleport', position)) {
    // Can teleport to any empty square
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 16; col++) {
        if (!board[row][col] && (row !== position.row || col !== position.col)) {
          moves.push({ row, col });
        }
      }
    }
  }
  
  return moves;
}

// Get upgraded king moves
function getUpgradedKingMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.KING] || [];
  
  // Check for double step upgrade
  if (pieceUpgrades.includes('king_double_step')) {
    // Can move 2 squares in any direction
    for (let dRow = -2; dRow <= 2; dRow++) {
      for (let dCol = -2; dCol <= 2; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        
        const newPos = { row: position.row + dRow, col: position.col + dCol };
        if (newPos.row >= 0 && newPos.row < 10 && newPos.col >= 0 && newPos.col < 16) {
          const targetPiece = board[newPos.row][newPos.col];
          if (!targetPiece || targetPiece.color !== color) {
            // Make sure this isn't already in standard moves
            if (!moves.some(m => m.row === newPos.row && m.col === newPos.col)) {
              moves.push(newPos);
            }
          }
        }
      }
    }
  }
  
  // Check for swap upgrade (once per game)
  if (pieceUpgrades.includes('king_swap') && 
      !upgradeManager.hasUsedOnceUpgrade(color, PieceType.KING, 'king_swap', position)) {
    // Can swap with any allied piece
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 16; col++) {
        const piece = board[row][col];
        if (piece && piece.color === color && piece.type !== PieceType.KING) {
          moves.push({ row, col });
        }
      }
    }
  }
  
  return moves;
}

// Apply upgrades to possible moves
function applyUpgradesToMoves(board, position, piece, standardMoves, upgrades, upgradeManager) {
  console.log('applyUpgradesToMoves called for', piece.type, 'at', position);
  console.log('Upgrades:', upgrades);
  
  if (!upgrades || !upgrades[piece.color]) {
    console.log('No upgrades found for color:', piece.color);
    return standardMoves;
  }
  
  switch (piece.type) {
    case PieceType.PAWN:
      return getUpgradedPawnMoves(board, position, piece.color, upgrades, standardMoves);
    case PieceType.KNIGHT:
      return getUpgradedKnightMoves(board, position, piece.color, upgrades, standardMoves);
    case PieceType.BISHOP:
      return getUpgradedBishopMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.ROOK:
      return getUpgradedRookMoves(board, position, piece.color, upgrades, standardMoves);
    case PieceType.QUEEN:
      return getUpgradedQueenMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.KING:
      return getUpgradedKingMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    default:
      return standardMoves;
  }
}

// Check if a piece is protected by queen's aura
function isProtectedByQueenAura(board, position, color, upgrades) {
  if (!upgrades[color][PieceType.QUEEN].includes('queen_aura')) {
    return false;
  }
  
  // Check all adjacent squares for allied queen
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      
      const checkRow = position.row + dRow;
      const checkCol = position.col + dCol;
      
      if (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 16) {
        const piece = board[checkRow][checkCol];
        if (piece && piece.type === PieceType.QUEEN && piece.color === color) {
          return true;
        }
      }
    }
  }
  
  return false;
}

// Check if a pawn is protected by a rook's protection ability
function isProtectedByRook(board, position, color, upgrades) {
  // Safety check for upgrades structure
  if (!upgrades || !upgrades[color] || !upgrades[color][PieceType.ROOK] || !upgrades[color][PieceType.ROOK].includes('rook_pawn_protection')) {
    return false;
  }
  
  // Check if the piece at this position is a pawn
  const piece = board[position.row][position.col];
  if (!piece || piece.type !== PieceType.PAWN || piece.color !== color) {
    return false;
  }
  
  // Check for a protecting rook in the same column
  // A pawn is protected if it's in the square directly behind a rook
  // "Behind" means in the direction of the rook's home side:
  // - White rooks (home side = row 9) protect pawns in row + 1 (toward row 9)
  // - Black rooks (home side = row 0) protect pawns in row - 1 (toward row 0)
  
  for (let row = 0; row < 10; row++) {
    if (row === position.row) continue; // Skip the pawn's position
    
    const checkPiece = board[row][position.col];
    if (checkPiece && checkPiece.type === PieceType.ROOK && checkPiece.color === color) {
      // Check if this rook has the pawn protection upgrade
      if (upgrades[color][PieceType.ROOK].includes('rook_pawn_protection')) {
        // Determine if the pawn is directly behind the rook
        if (color === PieceColor.WHITE) {
          // White rook: pawn must be in row + 1 (closer to row 9)
          if (position.row === row + 1) {
            return true;
          }
        } else {
          // Black rook: pawn must be in row - 1 (closer to row 0)
          if (position.row === row - 1) {
            return true;
          }
        }
      }
    }
  }
  
  return false;
}

module.exports = {
  applyUpgradesToMoves,
  hasUpgradeEffect,
  isProtectedByQueenAura,
  isProtectedByRook
};