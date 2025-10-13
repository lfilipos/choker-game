const { PieceType } = require('./types');

/**
 * Calculate all wall squares based on rook links
 * @param {Array} rookLinks - Array of rook link objects { rookPosition: {row, col}, linkedRookPositions: [{row, col}, ...] }
 * @returns {Array} Array of wall positions {row, col, color}
 */
function calculateWallSquares(rookLinks) {
  const wallSquares = [];
  
  if (!rookLinks || rookLinks.length === 0) {
    return wallSquares;
  }
  
  // For each rook and its linked partners
  rookLinks.forEach(link => {
    const { rookPosition, linkedRookPositions, color } = link;
    
    // For each linked pair
    linkedRookPositions.forEach(linkedPos => {
      // Calculate the wall square(s) between the two rooks
      const walls = getWallSquaresBetween(rookPosition, linkedPos, color);
      wallSquares.push(...walls);
    });
  });
  
  return wallSquares;
}

/**
 * Get the wall square(s) between two rook positions
 * @param {Object} pos1 - First rook position {row, col}
 * @param {Object} pos2 - Second rook position {row, col}
 * @param {string} color - Color of the rooks
 * @returns {Array} Array of wall squares between the rooks
 */
function getWallSquaresBetween(pos1, pos2, color) {
  const walls = [];
  const rowDiff = pos2.row - pos1.row;
  const colDiff = pos2.col - pos1.col;
  
  // Calculate number of spaces between rooks
  const rowDistance = Math.abs(rowDiff);
  const colDistance = Math.abs(colDiff);
  
  // Determine if this is a valid orthogonal or diagonal link (2-4 spaces apart, 1-3 spaces between)
  const isOrthogonal = (rowDiff === 0 && colDistance >= 2 && colDistance <= 4) || 
                       (colDiff === 0 && rowDistance >= 2 && rowDistance <= 4);
  const isDiagonal = (rowDistance >= 2 && rowDistance <= 4) && (colDistance >= 2 && colDistance <= 4) && 
                     (rowDistance === colDistance);
  
  if (isOrthogonal || isDiagonal) {
    // Create wall squares for ALL spaces between the rooks
    const rowStep = Math.sign(rowDiff);
    const colStep = Math.sign(colDiff);
    const numWalls = Math.max(rowDistance, colDistance) - 1; // Number of spaces between
    
    for (let i = 1; i <= numWalls; i++) {
      const wallRow = pos1.row + (i * rowStep);
      const wallCol = pos1.col + (i * colStep);
      walls.push({ row: wallRow, col: wallCol, color });
    }
  }
  
  return walls;
}

/**
 * Check if a position is a wall square
 * @param {Object} position - Position to check {row, col}
 * @param {Array} wallSquares - Array of wall squares
 * @returns {Object|null} Wall square object if position is a wall, null otherwise
 */
function isWallSquare(position, wallSquares) {
  if (!wallSquares || wallSquares.length === 0) {
    return null;
  }
  
  return wallSquares.find(wall => 
    wall.row === position.row && wall.col === position.col
  ) || null;
}

/**
 * Validate if two rooks can be linked
 * @param {Array} board - Game board
 * @param {Object} rook1Pos - First rook position {row, col}
 * @param {Object} rook2Pos - Second rook position {row, col}
 * @param {string} color - Player color
 * @param {boolean} hasEnhancedWall - Whether the player has enhanced rook wall upgrade
 * @returns {Object} {valid: boolean, reason: string}
 */
function validateRookLink(board, rook1Pos, rook2Pos, color, hasEnhancedWall = false) {
  // Check if both positions are valid
  if (!board[rook1Pos.row] || !board[rook2Pos.row]) {
    return { valid: false, reason: 'Invalid position' };
  }
  
  const piece1 = board[rook1Pos.row][rook1Pos.col];
  const piece2 = board[rook2Pos.row][rook2Pos.col];
  
  // Check if both positions have rooks
  if (!piece1 || piece1.type !== PieceType.ROOK) {
    return { valid: false, reason: 'First position does not have a rook' };
  }
  if (!piece2 || piece2.type !== PieceType.ROOK) {
    return { valid: false, reason: 'Second position does not have a rook' };
  }
  
  // Check if both rooks belong to the player
  if (piece1.color !== color || piece2.color !== color) {
    return { valid: false, reason: 'Both rooks must belong to the player' };
  }
  
  // Check if rooks are within valid linking distance
  const rowDiff = Math.abs(rook2Pos.row - rook1Pos.row);
  const colDiff = Math.abs(rook2Pos.col - rook1Pos.col);
  
  // Determine max distance based on upgrade level
  const maxDistance = hasEnhancedWall ? 4 : 2; // 1-3 spaces between for enhanced, 1 space between for basic
  const minDistance = 2; // Always at least 2 spaces apart (1 space between)
  
  // Valid configurations: horizontal, vertical, or diagonal within the allowed distance
  const isHorizontal = rowDiff === 0 && colDiff >= minDistance && colDiff <= maxDistance;
  const isVertical = colDiff === 0 && rowDiff >= minDistance && rowDiff <= maxDistance;
  const isDiagonal = rowDiff >= minDistance && rowDiff <= maxDistance && colDiff >= minDistance && colDiff <= maxDistance && rowDiff === colDiff;
  
  if (!isHorizontal && !isVertical && !isDiagonal) {
    const distanceDesc = hasEnhancedWall ? '2-4 spaces apart (1-3 spaces between)' : 'exactly 2 spaces apart (1 space between)';
    return { valid: false, reason: `Rooks must be ${distanceDesc}` };
  }
  
  // Note: We no longer check if spaces between are empty - friendly pieces can be in wall spaces
  
  return { valid: true, reason: '' };
}

/**
 * Check if two rooks are still within linking distance
 * @param {Object} pos1 - First rook position {row, col}
 * @param {Object} pos2 - Second rook position {row, col}
 * @param {boolean} hasEnhancedWall - Whether the player has enhanced rook wall upgrade
 * @returns {boolean} True if rooks are within linking distance
 */
function areRooksWithinLinkDistance(pos1, pos2, hasEnhancedWall = false) {
  const rowDiff = Math.abs(pos2.row - pos1.row);
  const colDiff = Math.abs(pos2.col - pos1.col);
  
  // Determine max distance based on upgrade level
  const maxDistance = hasEnhancedWall ? 4 : 2;
  const minDistance = 2;
  
  // Check if within valid distance in any valid direction
  const isHorizontal = rowDiff === 0 && colDiff >= minDistance && colDiff <= maxDistance;
  const isVertical = colDiff === 0 && rowDiff >= minDistance && rowDiff <= maxDistance;
  const isDiagonal = rowDiff >= minDistance && rowDiff <= maxDistance && colDiff >= minDistance && colDiff <= maxDistance && rowDiff === colDiff;
  
  return isHorizontal || isVertical || isDiagonal;
}

/**
 * Update rook links after a move, breaking links that are now too far apart
 * @param {Array} rookLinks - Current rook links
 * @param {Object} movedFrom - Position piece moved from {row, col}
 * @param {Object} movedTo - Position piece moved to {row, col}
 * @param {Array} board - Current board state
 * @param {boolean} hasEnhancedWall - Whether the player has enhanced rook wall upgrade
 * @returns {Array} Updated rook links
 */
function updateRookLinksAfterMove(rookLinks, movedFrom, movedTo, board, hasEnhancedWall = false) {
  if (!rookLinks || rookLinks.length === 0) {
    return [];
  }
  
  const updatedLinks = [];
  
  rookLinks.forEach(link => {
    let { rookPosition, linkedRookPositions, color } = link;
    
    // Check if this rook was moved
    if (rookPosition.row === movedFrom.row && rookPosition.col === movedFrom.col) {
      // Update the rook's position
      rookPosition = { row: movedTo.row, col: movedTo.col };
      
      // Filter out links that are now too far apart
      linkedRookPositions = linkedRookPositions.filter(linkedPos => 
        areRooksWithinLinkDistance(rookPosition, linkedPos, hasEnhancedWall)
      );
    } else {
      // Check if any of the linked rooks were moved
      linkedRookPositions = linkedRookPositions.map(linkedPos => {
        if (linkedPos.row === movedFrom.row && linkedPos.col === movedFrom.col) {
          return { row: movedTo.row, col: movedTo.col };
        }
        return linkedPos;
      }).filter(linkedPos => 
        areRooksWithinLinkDistance(rookPosition, linkedPos, hasEnhancedWall)
      );
    }
    
    // Only keep this link if it still has at least one linked rook
    if (linkedRookPositions.length > 0) {
      updatedLinks.push({ rookPosition, linkedRookPositions, color });
    }
  });
  
  return updatedLinks;
}

/**
 * Remove links for a captured rook
 * @param {Array} rookLinks - Current rook links
 * @param {Object} capturedPosition - Position of captured rook {row, col}
 * @returns {Array} Updated rook links
 */
function removeLinksForCapturedRook(rookLinks, capturedPosition) {
  if (!rookLinks || rookLinks.length === 0) {
    return [];
  }
  
  return rookLinks.filter(link => {
    // Remove if this is the captured rook
    if (link.rookPosition.row === capturedPosition.row && 
        link.rookPosition.col === capturedPosition.col) {
      return false;
    }
    
    // Remove the captured rook from linked positions
    link.linkedRookPositions = link.linkedRookPositions.filter(linkedPos =>
      linkedPos.row !== capturedPosition.row || linkedPos.col !== capturedPosition.col
    );
    
    // Keep the link only if it still has linked rooks
    return link.linkedRookPositions.length > 0;
  });
}

/**
 * Add a new rook link or update existing link
 * @param {Array} rookLinks - Current rook links
 * @param {Object} rook1Pos - First rook position {row, col}
 * @param {Object} rook2Pos - Second rook position {row, col}
 * @param {string} color - Player color
 * @returns {Array} Updated rook links
 */
function addRookLink(rookLinks, rook1Pos, rook2Pos, color) {
  const updatedLinks = [...rookLinks];
  
  // Find existing link for rook1
  let rook1Link = updatedLinks.find(link => 
    link.rookPosition.row === rook1Pos.row && link.rookPosition.col === rook1Pos.col
  );
  
  if (rook1Link) {
    // Check if rook2 is already linked
    const alreadyLinked = rook1Link.linkedRookPositions.some(pos =>
      pos.row === rook2Pos.row && pos.col === rook2Pos.col
    );
    
    if (!alreadyLinked) {
      rook1Link.linkedRookPositions.push({ row: rook2Pos.row, col: rook2Pos.col });
    }
  } else {
    // Create new link for rook1
    updatedLinks.push({
      rookPosition: { row: rook1Pos.row, col: rook1Pos.col },
      linkedRookPositions: [{ row: rook2Pos.row, col: rook2Pos.col }],
      color
    });
  }
  
  // Find existing link for rook2
  let rook2Link = updatedLinks.find(link => 
    link.rookPosition.row === rook2Pos.row && link.rookPosition.col === rook2Pos.col
  );
  
  if (rook2Link) {
    // Check if rook1 is already linked
    const alreadyLinked = rook2Link.linkedRookPositions.some(pos =>
      pos.row === rook1Pos.row && pos.col === rook1Pos.col
    );
    
    if (!alreadyLinked) {
      rook2Link.linkedRookPositions.push({ row: rook1Pos.row, col: rook1Pos.col });
    }
  } else {
    // Create new link for rook2
    updatedLinks.push({
      rookPosition: { row: rook2Pos.row, col: rook2Pos.col },
      linkedRookPositions: [{ row: rook1Pos.row, col: rook1Pos.col }],
      color
    });
  }
  
  return updatedLinks;
}

module.exports = {
  calculateWallSquares,
  isWallSquare,
  validateRookLink,
  areRooksWithinLinkDistance,
  updateRookLinksAfterMove,
  removeLinksForCapturedRook,
  addRookLink,
  getWallSquaresBetween
};

