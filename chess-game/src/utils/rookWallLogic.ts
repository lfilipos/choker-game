import { Position, RookLink, WallSquare, PieceColor } from '../types';

/**
 * Calculate all wall squares based on rook links
 */
export function calculateWallSquares(rookLinks: RookLink[]): WallSquare[] {
  const wallSquares: WallSquare[] = [];
  
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
 */
function getWallSquaresBetween(pos1: Position, pos2: Position, color: PieceColor): WallSquare[] {
  const walls: WallSquare[] = [];
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
 */
export function isWallSquare(position: Position, wallSquares: WallSquare[]): WallSquare | null {
  if (!wallSquares || wallSquares.length === 0) {
    return null;
  }
  
  return wallSquares.find(wall => 
    wall.row === position.row && wall.col === position.col
  ) || null;
}

/**
 * Check if a rook can be linked with another rook
 */
export function canLinkRooks(pos1: Position, pos2: Position, hasEnhancedWall: boolean = false): boolean {
  const rowDiff = Math.abs(pos2.row - pos1.row);
  const colDiff = Math.abs(pos2.col - pos1.col);
  
  // Determine max distance based on upgrade level
  const maxDistance = hasEnhancedWall ? 4 : 2;
  const minDistance = 2;
  
  // Valid configurations: horizontal, vertical, or diagonal within the allowed distance
  const isHorizontal = rowDiff === 0 && colDiff >= minDistance && colDiff <= maxDistance;
  const isVertical = colDiff === 0 && rowDiff >= minDistance && rowDiff <= maxDistance;
  const isDiagonal = rowDiff >= minDistance && rowDiff <= maxDistance && colDiff >= minDistance && colDiff <= maxDistance && rowDiff === colDiff;
  
  return isHorizontal || isVertical || isDiagonal;
}

