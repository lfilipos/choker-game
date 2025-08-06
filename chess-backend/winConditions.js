const { PieceType, PieceColor } = require('./types');

/**
 * Count the number of kings for a given color on the board
 */
function countKings(board, color) {
  let kingCount = 0;
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PieceType.KING && piece.color === color) {
        kingCount++;
      }
    }
  }
  return kingCount;
}

/**
 * Check if a team has lost (all kings captured)
 */
function hasTeamLost(board, color) {
  return countKings(board, color) === 0;
}

/**
 * Check game status after a move
 * Returns: 'playing', 'white_wins', 'black_wins'
 */
function checkGameStatus(board) {
  const whiteKings = countKings(board, PieceColor.WHITE);
  const blackKings = countKings(board, PieceColor.BLACK);
  
  if (blackKings === 0) {
    return 'white_wins';
  }
  
  if (whiteKings === 0) {
    return 'black_wins';
  }
  
  return 'playing';
}

/**
 * Find all king positions for a given color
 */
function findKings(board, color) {
  const kings = [];
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.type === PieceType.KING && piece.color === color) {
        kings.push({ row, col });
      }
    }
  }
  return kings;
}

/**
 * Check if a position is under attack by the opponent
 * Note: With the new rules, kings CAN move into check
 */
function isSquareUnderAttack(board, position, byColor, upgrades = null, upgradeManager = null) {
  // This function can still be used for informational purposes
  // but won't prevent kings from moving into danger
  
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        // Use getPossibleMoves from gameLogic to check if this piece can attack the position
        const { getPossibleMoves } = require('./gameLogic');
        const moves = getPossibleMoves(board, { row, col }, upgrades, upgradeManager);
        if (moves.some(move => move.row === position.row && move.col === position.col)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Check if any king of the given color is in check
 * Note: This is now informational only - doesn't restrict moves
 */
function isAnyKingInCheck(board, color, upgrades = null, upgradeManager = null) {
  const kings = findKings(board, color);
  const opponentColor = color === PieceColor.WHITE ? PieceColor.BLACK : PieceColor.WHITE;
  
  for (const kingPos of kings) {
    if (isSquareUnderAttack(board, kingPos, opponentColor, upgrades, upgradeManager)) {
      return true;
    }
  }
  return false;
}

module.exports = {
  countKings,
  hasTeamLost,
  checkGameStatus,
  findKings,
  isSquareUnderAttack,
  isAnyKingInCheck
};