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
function getUpgradedKnightMoves(board, position, color, upgrades, standardMoves, nimbleKnightState, knightDoubleJumpState) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.KNIGHT] || [];
  
  // Check for nimble knight upgrade (1 square adjacent movement then normal move)
  const hasNimbleKnight = pieceUpgrades.includes('nimble_knight');
  const isInNimbleState = nimbleKnightState && nimbleKnightState.active && 
                          nimbleKnightState.playerTeam === color &&
                          nimbleKnightState.knightPosition &&
                          nimbleKnightState.knightPosition.row === position.row &&
                          nimbleKnightState.knightPosition.col === position.col;
  
  // Check if in double jump state
  const isInDoubleJumpState = knightDoubleJumpState && knightDoubleJumpState.active && 
                               knightDoubleJumpState.playerTeam === color;
  
  // Adjacent moves are ONLY available as the first move of the turn
  // Don't show them if already in nimble state OR in double jump state
  if (hasNimbleKnight && !isInNimbleState && !isInDoubleJumpState) {
    // Not in any special state yet - show adjacent moves as first move option
    const adjacentMoves = [
      { row: position.row - 1, col: position.col },     // Up
      { row: position.row + 1, col: position.col },     // Down
      { row: position.row, col: position.col - 1 },     // Left
      { row: position.row, col: position.col + 1 },     // Right
      { row: position.row - 1, col: position.col - 1 }, // Up-Left
      { row: position.row - 1, col: position.col + 1 }, // Up-Right
      { row: position.row + 1, col: position.col - 1 }, // Down-Left
      { row: position.row + 1, col: position.col + 1 }  // Down-Right
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
  // If in nimble state or double jump state, don't add adjacent moves - only show normal knight moves
  
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
  
  // Check for piercing upgrade (jump over one friendly piece)
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
            if (targetPiece.color === color) {
              // Friendly piece - can jump over it
              jumped = true;
              continue;
            } else {
              // Enemy piece - can capture normally (no jump)
              moves.push(newPos);
              break;
            }
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
  let moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.ROOK] || [];
  
  // Pawn Protection upgrade - no additional movement abilities, just protection effect
  // The protection logic is handled in move validation, not in move generation
  if (pieceUpgrades.includes('rook_pawn_protection')) {
    console.log('Rook has pawn protection upgrade!');
  }
  
  // Enhanced Rook Wall upgrade - limits movement to 3 spaces maximum
  // If player has enhanced_rook_wall but not rook_wall, treat as having both upgrades functionally
  if (pieceUpgrades.includes('enhanced_rook_wall')) {
    console.log('Rook has enhanced wall upgrade - limiting movement to 3 spaces!');
    // Filter moves to only include those within 3 spaces
    moves = moves.filter(move => {
      const distance = Math.abs(move.row - position.row) + Math.abs(move.col - position.col);
      return distance <= 3;
    });
  }
  // Rook Wall upgrade - limits movement to 5 spaces maximum (only if enhanced is not present)
  else if (pieceUpgrades.includes('rook_wall')) {
    console.log('Rook has wall upgrade - limiting movement to 5 spaces!');
    // Filter moves to only include those within 5 spaces
    moves = moves.filter(move => {
      const distance = Math.abs(move.row - position.row) + Math.abs(move.col - position.col);
      return distance <= 5;
    });
  }
  
  return moves;
}

// Get upgraded queen moves
function getUpgradedQueenMoves(board, position, color, upgrades, standardMoves, upgradeManager, queensHookState) {
  const moves = [...standardMoves];
  const pieceUpgrades = upgrades[color][PieceType.QUEEN] || [];
  
  // Check if in Queen's Hook state (second move)
  const isInHookState = queensHookState && queensHookState.active && 
                        queensHookState.playerTeam === color &&
                        queensHookState.firstMovePosition &&
                        queensHookState.firstMovePosition.to.row === position.row &&
                        queensHookState.firstMovePosition.to.col === position.col;
  
  // Determine hook distance: enhanced gets 3, regular gets 1
  const hasEnhanced = pieceUpgrades.includes('enhanced_queens_hook');
  const hasRegular = pieceUpgrades.includes('queens_hook');
  const maxHookDistance = hasEnhanced ? 3 : (hasRegular ? 1 : 0);
  
  // If in hook state, show moves based on upgrade level
  if (isInHookState && maxHookDistance > 0) {
    const hookMoves = [];
    
    // Get moves in all 8 directions up to maxHookDistance
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];
    
    for (const [dRow, dCol] of directions) {
      for (let distance = 1; distance <= maxHookDistance; distance++) {
        const newPos = { 
          row: position.row + dRow * distance, 
          col: position.col + dCol * distance 
        };
        
        // Check if position is valid
        if (newPos.row >= 0 && newPos.row < 10 && newPos.col >= 0 && newPos.col < 16) {
          // Cannot return to original starting position
          const isOriginalPosition = (newPos.row === queensHookState.firstMovePosition.from.row &&
                                     newPos.col === queensHookState.firstMovePosition.from.col);
          
          if (!isOriginalPosition) {
            const targetPiece = board[newPos.row][newPos.col];
            
            // Check if already captured and this would be a capture
            const wouldCapture = targetPiece && targetPiece.color !== color;
            if (queensHookState.hasCaptured && wouldCapture) {
              // Already captured once, can't capture again - stop in this direction
              break;
            }
            
            // Can move to empty squares or capture enemy pieces (if not already captured)
            if (!targetPiece) {
              hookMoves.push(newPos);
            } else if (targetPiece.color !== color) {
              hookMoves.push(newPos);
              break; // Stop after potential capture
            } else {
              break; // Blocked by friendly piece
            }
          } else {
            break; // Original position blocks this direction
          }
        } else {
          break; // Out of bounds, stop in this direction
        }
      }
    }
    return hookMoves;
  }
  
  return moves;
}

// Get upgraded king moves
function getUpgradedKingMoves(board, position, color, upgrades, standardMoves, upgradeManager, royalCommandState) {
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
  
  // Royal Exchange upgrade - handled via special mode, not as regular moves
  // The swap is executed through the Royal Exchange socket handlers, not the normal move system
  // So we don't add rooks to the king's possible moves here
  
  // Royal Command is handled separately via frontend mode, not as king moves
  // The king just has its normal movement options
  
  return moves;
}

// Get moves for a piece controlled by Royal Command
function getRoyalCommandControlledMoves(board, position, piece, controllingColor) {
  const moves = [];
  
  // Get all positions 1 square away in any direction (8 directions)
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      
      const newPos = { row: position.row + dRow, col: position.col + dCol };
      if (newPos.row >= 0 && newPos.row < 10 && newPos.col >= 0 && newPos.col < 16) {
        const targetPiece = board[newPos.row][newPos.col];
        
        // If the controlled piece is friendly to the king
        if (piece.color === controllingColor) {
          // Can move to empty squares or capture enemy pieces
          if (!targetPiece || targetPiece.color !== controllingColor) {
            moves.push(newPos);
          }
        } else {
          // If the controlled piece is an enemy
          // Can only move to empty squares
          if (!targetPiece) {
            moves.push(newPos);
          }
        }
      }
    }
  }
  
  return moves;
}

// Apply upgrades to possible moves
function applyUpgradesToMoves(board, position, piece, standardMoves, upgrades, upgradeManager, nimbleKnightState, knightDoubleJumpState, royalCommandState, queensHookState) {
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
      return getUpgradedKnightMoves(board, position, piece.color, upgrades, standardMoves, nimbleKnightState, knightDoubleJumpState);
    case PieceType.BISHOP:
      return getUpgradedBishopMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager);
    case PieceType.ROOK:
      return getUpgradedRookMoves(board, position, piece.color, upgrades, standardMoves);
    case PieceType.QUEEN:
      return getUpgradedQueenMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager, queensHookState);
    case PieceType.KING:
      return getUpgradedKingMoves(board, position, piece.color, upgrades, standardMoves, upgradeManager, royalCommandState);
    default:
      return standardMoves;
  }
}

// Check if a piece is protected by queen's aura and can evade
// Returns {canEvade: boolean, evasionPosition?: {row, col}, queenPosition?: {row, col}}
function isProtectedByQueenAura(board, position, color, upgrades) {
  if (!upgrades[color][PieceType.QUEEN].includes('queen_aura')) {
    return { canEvade: false };
  }
  
  // Check all adjacent squares for allied queen
  let queenPosition = null;
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue;
      
      const checkRow = position.row + dRow;
      const checkCol = position.col + dCol;
      
      if (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 16) {
        const piece = board[checkRow][checkCol];
        if (piece && piece.type === PieceType.QUEEN && piece.color === color) {
          queenPosition = { row: checkRow, col: checkCol };
          break;
        }
      }
    }
    if (queenPosition) break;
  }
  
  // No adjacent queen found
  if (!queenPosition) {
    return { canEvade: false };
  }
  
  // Calculate backwards position (towards home row)
  // White pieces move towards row 9 (backwards = row + 1)
  // Black pieces move towards row 0 (backwards = row - 1)
  const backwardsDirection = color === PieceColor.WHITE ? 1 : -1;
  const evasionPosition = {
    row: position.row + backwardsDirection,
    col: position.col
  };
  
  // Check if evasion position is valid (in bounds and empty)
  if (evasionPosition.row < 0 || evasionPosition.row >= 10 || 
      evasionPosition.col < 0 || evasionPosition.col >= 16) {
    return { canEvade: false, queenPosition };
  }
  
  // Check if evasion position is empty
  if (board[evasionPosition.row][evasionPosition.col] !== null) {
    return { canEvade: false, queenPosition };
  }
  
  // Evasion is possible
  return { canEvade: true, evasionPosition, queenPosition };
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

// Find all bishops adjacent to a king (within 1 square)
function getBishopsAdjacentToKing(board, kingPosition, color) {
  const adjacentBishops = [];
  
  // Check all 8 adjacent squares
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue; // Skip the king's position
      
      const checkRow = kingPosition.row + dRow;
      const checkCol = kingPosition.col + dCol;
      
      // Check if position is valid
      if (checkRow >= 0 && checkRow < 10 && checkCol >= 0 && checkCol < 16) {
        const piece = board[checkRow][checkCol];
        if (piece && piece.type === PieceType.BISHOP && piece.color === color) {
          adjacentBishops.push({ row: checkRow, col: checkCol });
        }
      }
    }
  }
  
  return adjacentBishops;
}

// Check if a king is protected by the Royal Protection upgrade
// Returns the protecting bishop's position if protected, null otherwise
function isKingProtectedByBishop(board, kingPosition, color, upgrades) {
  // Safety check for upgrades structure
  if (!upgrades || !upgrades[color] || !upgrades[color][PieceType.BISHOP] || 
      !upgrades[color][PieceType.BISHOP].includes('bishop_royal_protection')) {
    return null;
  }
  
  // Find all bishops adjacent to the king
  const adjacentBishops = getBishopsAdjacentToKing(board, kingPosition, color);
  
  // Protection only works if exactly ONE bishop is adjacent
  if (adjacentBishops.length === 1) {
    return adjacentBishops[0];
  }
  
  // No protection if 0 or multiple bishops are adjacent
  return null;
}

module.exports = {
  applyUpgradesToMoves,
  hasUpgradeEffect,
  isProtectedByQueenAura,
  isProtectedByRook,
  getBishopsAdjacentToKing,
  isKingProtectedByBishop,
  getRoyalCommandControlledMoves
};