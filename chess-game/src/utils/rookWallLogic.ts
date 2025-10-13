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
  
  // Only create wall if exactly 2 spaces apart (1 space between)
  // For orthogonal movement (horizontal or vertical)
  if ((rowDiff === 0 && Math.abs(colDiff) === 2) || (colDiff === 0 && Math.abs(rowDiff) === 2)) {
    const wallRow = pos1.row + Math.sign(rowDiff);
    const wallCol = pos1.col + Math.sign(colDiff);
    walls.push({ row: wallRow, col: wallCol, color });
  }
  // For diagonal movement
  else if (Math.abs(rowDiff) === 2 && Math.abs(colDiff) === 2) {
    const wallRow = pos1.row + Math.sign(rowDiff);
    const wallCol = pos1.col + Math.sign(colDiff);
    walls.push({ row: wallRow, col: wallCol, color });
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
export function canLinkRooks(pos1: Position, pos2: Position): boolean {
  const rowDiff = Math.abs(pos2.row - pos1.row);
  const colDiff = Math.abs(pos2.col - pos1.col);
  
  // Valid configurations: horizontal, vertical, or diagonal with exactly 1 space between
  const isHorizontal = rowDiff === 0 && colDiff === 2;
  const isVertical = colDiff === 0 && rowDiff === 2;
  const isDiagonal = rowDiff === 2 && colDiff === 2;
  
  return isHorizontal || isVertical || isDiagonal;
}

