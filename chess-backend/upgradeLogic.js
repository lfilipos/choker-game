const { PieceType, PieceColor } = require('./types');
const { TIERED_UPGRADES } = require('./upgradeDefinitions');

// Check if a piece has a specific upgrade effect
function hasUpgradeEffect(upgrades, color, pieceType, effectValue) {
  const pieceUpgrades = upgrades[color][pieceType] || [];
  
  for (const upgradeId of pieceUpgrades) {
    const upgrade = getUpgradeById(upgradeId);
    if (upgrade && upgrade.effects.some(effect => effect.value === effectValue)) {
      return true;
    }
  }
  
  return false;
}

// Get upgrade by ID from tiered system
function getUpgradeById(upgradeId) {
  for (const pieceType in TIERED_UPGRADES) {
    for (const tier in TIERED_UPGRADES[pieceType]) {
      if (TIERED_UPGRADES[pieceType][tier].id === upgradeId) {
        return TIERED_UPGRADES[pieceType][tier];
      }
    }
  }
  return null;
}

// Get upgraded pawn moves
function getUpgradedPawnMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.PAWN] || [];
  
  console.log(`Pawn upgrades for ${color}:`, pieceUpgrades);
  
  // Check for tier 1 upgrade (Enhanced Movement - 3 squares on first move)
  if (pieceUpgrades.includes('pawn_tier1')) {
    console.log('Pawn has tier 1 upgrade (Enhanced Movement)!');
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
  
  // Check for tier 2 upgrade (Extended Capture Range - capture from 2 squares away)
  if (pieceUpgrades.includes('pawn_tier2')) {
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

// Get upgraded rook moves
function getUpgradedRookMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.ROOK] || [];
  
  // Check for tier 1 upgrade (Defensive Protection - protects pieces behind rook)
  // This is handled in the game logic when checking if a piece can be captured
  
  // Check for tier 2 upgrade (Rook Linking - can link with other rooks within 2 squares)
  if (pieceUpgrades.includes('rook_tier2')) {
    // Find other rooks within 2 squares
    const linkedRooks = findLinkedRooks(board, position, color, 2);
    
    if (linkedRooks.length > 0) {
      // Can create a wall between linked rooks
      const wallMoves = calculateWallMoves(board, position, linkedRooks, color);
      moves.push(...wallMoves);
    }
  }
  
  // Check for tier 3 upgrade (Extended Rook Linking - within 3 squares)
  if (pieceUpgrades.includes('rook_tier3')) {
    // Find other rooks within 3 squares
    const linkedRooks = findLinkedRooks(board, position, color, 3);
    
    if (linkedRooks.length > 0) {
      // Can create extended walls and barriers
      const extendedWallMoves = calculateExtendedWallMoves(board, position, linkedRooks, color);
      moves.push(...extendedWallMoves);
    }
  }
  
  return moves;
}

// Find rooks that can be linked with
function findLinkedRooks(board, position, color, maxDistance) {
  const linkedRooks = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PieceType.ROOK && piece.color === color) {
        const distance = Math.max(Math.abs(row - position.row), Math.abs(col - position.col));
        if (distance <= maxDistance && distance > 0) {
          // Check if path is clear for linking
          if (isPathClearForLinking(board, position, { row, col })) {
            linkedRooks.push({ row, col, distance });
          }
        }
      }
    }
  }
  
  return linkedRooks;
}

// Check if path is clear for rook linking
function isPathClearForLinking(board, pos1, pos2) {
  const minRow = Math.min(pos1.row, pos2.row);
  const maxRow = Math.max(pos1.row, pos2.row);
  const minCol = Math.min(pos1.col, pos2.col);
  const maxCol = Math.max(pos1.col, pos2.col);
  
  // Check if rooks are in same row or column
  if (pos1.row === pos2.row) {
    // Same row, check columns between
    for (let col = minCol + 1; col < maxCol; col++) {
      if (board[pos1.row][col]) return false;
    }
  } else if (pos1.col === pos2.col) {
    // Same column, check rows between
    for (let row = minRow + 1; row < maxRow; row++) {
      if (board[row][pos1.col]) return false;
    }
  } else {
    // Diagonal linking not supported
    return false;
  }
  
  return true;
}

// Calculate wall moves between linked rooks
function calculateWallMoves(board, position, linkedRooks, color) {
  const wallMoves = [];
  
  linkedRooks.forEach(linkedRook => {
    // Create wall moves along the line between rooks
    const wallPositions = getWallPositions(position, linkedRook);
    
    wallPositions.forEach(wallPos => {
      if (isValidPosition(wallPos) && !board[wallPos.row][wallPos.col]) {
        wallMoves.push(wallPos);
      }
    });
  });
  
  return wallMoves;
}

// Calculate extended wall moves for tier 3
function calculateExtendedWallMoves(board, position, linkedRooks, color) {
  const extendedWallMoves = [];
  
  linkedRooks.forEach(linkedRook => {
    // Create extended wall moves with more coverage
    const wallPositions = getExtendedWallPositions(position, linkedRook);
    
    wallPositions.forEach(wallPos => {
      if (isValidPosition(wallPos) && !board[wallPos.row][wallPos.col]) {
        extendedWallMoves.push(wallPos);
      }
    });
  });
  
  return extendedWallMoves;
}

// Get wall positions between two rooks
function getWallPositions(rook1, rook2) {
  const wallPositions = [];
  
  if (rook1.row === rook2.row) {
    // Same row, create wall along the row
    const minCol = Math.min(rook1.col, rook2.col);
    const maxCol = Math.max(rook1.col, rook2.col);
    
    for (let col = minCol + 1; col < maxCol; col++) {
      wallPositions.push({ row: rook1.row, col });
    }
  } else if (rook1.col === rook2.col) {
    // Same column, create wall along the column
    const minRow = Math.min(rook1.row, rook2.row);
    const maxRow = Math.max(rook1.row, rook2.row);
    
    for (let row = minRow + 1; row < maxRow; row++) {
      wallPositions.push({ row, col: rook1.col });
    }
  }
  
  return wallPositions;
}

// Get extended wall positions for tier 3
function getExtendedWallPositions(rook1, rook2) {
  const wallPositions = getWallPositions(rook1, rook2);
  const extendedPositions = [...wallPositions];
  
  // Add adjacent positions for extended coverage
  wallPositions.forEach(pos => {
    const adjacent = [
      { row: pos.row + 1, col: pos.col },
      { row: pos.row - 1, col: pos.col },
      { row: pos.row, col: pos.col + 1 },
      { row: pos.row, col: pos.col - 1 }
    ];
    
    adjacent.forEach(adjPos => {
      if (isValidPosition(adjPos)) {
        extendedPositions.push(adjPos);
      }
    });
  });
  
  return extendedPositions;
}

// Get upgraded knight moves
function getUpgradedKnightMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.KNIGHT] || [];
  
  // Check for tier 1 upgrade (Adjacent Movement - can move to adjacent squares like a king)
  if (pieceUpgrades.includes('knight_tier1')) {
    const adjacentMoves = [
      { row: position.row + 1, col: position.col },
      { row: position.row - 1, col: position.col },
      { row: position.row, col: position.col + 1 },
      { row: position.row, col: position.col - 1 },
      { row: position.row + 1, col: position.col + 1 },
      { row: position.row + 1, col: position.col - 1 },
      { row: position.row - 1, col: position.col + 1 },
      { row: position.row - 1, col: position.col - 1 }
    ];
    
    adjacentMoves.forEach(pos => {
      if (pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16) {
        const targetPiece = board[pos.row][pos.col];
        if (!targetPiece || targetPiece.color !== color) {
          moves.push(pos);
        }
      }
    });
  }
  
  // Check for tier 2 upgrade (Extended Leap - 3-2 and 2-3 L-shape patterns)
  if (pieceUpgrades.includes('knight_tier2')) {
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
  
  // Check for tier 3 upgrade (Double Movement - can move twice per turn)
  if (pieceUpgrades.includes('knight_tier3')) {
    // This is a special ability that will be handled in the game logic
    // For now, just return standard moves
    // The double movement will be implemented in the turn management system
  }
  
  return moves;
}

// Get upgraded bishop moves
function getUpgradedBishopMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.BISHOP] || [];
  
  // Check for tier 1 upgrade (Orthogonal Movement - one orthogonal move per game)
  if (pieceUpgrades.includes('bishop_tier1') && 
      upgradeManager && !upgradeManager.hasUsedOnceUpgrade(color, PieceType.BISHOP, 'bishop_tier1', position)) {
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
  
  // Check for tier 2 upgrade (Piercing Vision - jump over one piece per move)
  if (pieceUpgrades.includes('bishop_tier2')) {
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

// Get upgraded queen moves
function getUpgradedQueenMoves(board, position, color, upgrades, standardMoves, upgradeManager) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.QUEEN] || [];
  
  // Check for tier 1 upgrade (Extended Movement - move up to 2 squares in any direction)
  if (pieceUpgrades.includes('queen_tier1')) {
    // Add 2-square moves in all directions
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
  
  // Check for tier 2 upgrade (Advanced Capture - can capture through pawns and evade capture)
  if (pieceUpgrades.includes('queen_tier2')) {
    // Enhanced capture mechanics - can capture through pawns
    const directions = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    
    directions.forEach(([dRow, dCol]) => {
      let canJumpOverPawn = false;
      let pawnJumped = false;
      
      for (let i = 1; i < 16; i++) {
        const newPos = { row: position.row + i * dRow, col: position.col + i * dCol };
        if (newPos.row < 0 || newPos.row >= 10 || newPos.col < 0 || newPos.col >= 16) break;
        
        const targetPiece = board[newPos.row][newPos.col];
        if (targetPiece) {
          if (targetPiece.color !== color) {
            if (targetPiece.type === PieceType.PAWN && !pawnJumped) {
              // Can jump over enemy pawns
              canJumpOverPawn = true;
              pawnJumped = true;
              continue;
            } else if (canJumpOverPawn && pawnJumped) {
              // Can capture after jumping over pawn
              moves.push(newPos);
              break;
            } else {
              // Standard capture
              moves.push(newPos);
              break;
            }
          } else {
            break; // Can't capture own piece
          }
        } else if (canJumpOverPawn && pawnJumped) {
          // Can move to empty squares after jumping over pawn
          moves.push(newPos);
        }
      }
    });
  }
  
  // Check for tier 3 upgrade (Royal Teleport - once per game)
  if (pieceUpgrades.includes('queen_tier3') && 
      upgradeManager && !upgradeManager.hasUsedOnceUpgrade(color, PieceType.QUEEN, 'queen_tier3', position)) {
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
  
  // Check for tier 1 upgrade (Enhanced Movement - move 2 squares in any direction)
  if (pieceUpgrades.includes('king_tier1')) {
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
  
  // Check for tier 2 upgrade (Piece Manipulation - swap with allied piece once per game)
  if (pieceUpgrades.includes('king_tier2') && 
      upgradeManager && !upgradeManager.hasUsedOnceUpgrade(color, PieceType.KING, 'king_tier2', position)) {
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
  
  // Check for tier 3 upgrade (Royal Command - move any allied piece to adjacent square once per turn)
  if (pieceUpgrades.includes('king_tier3')) {
    // Can move any allied piece to an adjacent square
    // This is a special ability that will be handled in the game logic
    // For now, just return standard moves
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
      return getUpgradedPawnMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.KNIGHT:
      return getUpgradedKnightMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.BISHOP:
      return getUpgradedBishopMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.ROOK:
      return getUpgradedRookMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.QUEEN:
      return getUpgradedQueenMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.KING:
      return getUpgradedKingMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    default:
      return standardMoves;
  }
}

// Check if a piece is protected by rook (tier 1 rook upgrade)
function isProtectedByRook(board, position, color, upgrades) {
  if (!upgrades[color][PieceType.ROOK].includes('rook_tier1')) {
    return false;
  }
  
  // Check if there's a rook in the same row or column that could protect this piece
  const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  
  for (const [dRow, dCol] of directions) {
    for (let i = 1; i < 16; i++) {
      const checkRow = position.row + i * dRow;
      const checkCol = position.col + i * dCol;
      
      if (checkRow < 0 || checkRow >= 10 || checkCol < 0 || checkCol >= 16) break;
      
      const piece = board[checkRow][checkCol];
      if (piece) {
        if (piece.type === PieceType.ROOK && piece.color === color) {
          // Found a rook in the same row/column
          // Check if there are no enemy pieces between the rook and this piece
          let pathClear = true;
          for (let j = 1; j < i; j++) {
            const pathRow = position.row + j * dRow;
            const pathCol = position.col + j * dCol;
            if (board[pathRow][pathCol]) {
              pathClear = false;
              break;
            }
          }
          if (pathClear) return true;
        }
        break; // Found a piece, stop checking this direction
      }
    }
  }
  
  return false;
}

// Check if a piece can be captured considering all protection mechanics
function canPieceBeCaptured(board, position, attackingColor, upgrades) {
  const piece = board[position.row][position.col];
  if (!piece) return false;
  
  // Check if piece is protected by rook (tier 1 rook upgrade)
  if (upgrades && upgrades[piece.color] && upgrades[piece.color][PieceType.ROOK]) {
    if (isProtectedByRook(board, position, piece.color, upgrades)) {
      return false; // Piece is protected by rook
    }
  }
  
  // Check if piece is protected by queen aura (if implemented)
  // This would be similar to rook protection but for adjacent pieces
  
  return true; // Piece can be captured
}

// Get all valid moves for a player considering upgrades and special abilities
function getAllValidMovesWithUpgrades(board, color, upgrades, upgradeManager) {
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
            isUpgraded: hasUpgradeEffect(upgrades, color, piece.type, 'movement')
          });
        });
      }
    }
  }
  
  return allMoves;
}

// Helper function to check if position is valid
function isValidPosition(pos) {
  return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16;
}

module.exports = {
  applyUpgradesToMoves,
  hasUpgradeEffect,
  isProtectedByRook,
  canPieceBeCaptured,
  getAllValidMovesWithUpgrades,
  getUpgradeById,
  findLinkedRooks,
  calculateWallMoves,
  calculateExtendedWallMoves,
  getWallPositions,
  getExtendedWallPositions,
  isValidPosition
};