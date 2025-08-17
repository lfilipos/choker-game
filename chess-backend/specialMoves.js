const { PieceType, PieceColor } = require('./types');

/**
 * Special Moves Manager
 * Handles complex moves that require special game logic beyond standard movement
 */

class SpecialMovesManager {
  constructor() {
    this.specialMovesUsed = new Map(); // Track special moves used this turn
    this.resetTurn();
  }

  /**
   * Reset special moves for a new turn
   */
  resetTurn() {
    this.specialMovesUsed.clear();
  }

  /**
   * Check if a special move can be used
   */
  canUseSpecialMove(color, pieceType, moveType) {
    const key = `${color}_${pieceType}_${moveType}`;
    return !this.specialMovesUsed.has(key);
  }

  /**
   * Mark a special move as used
   */
  useSpecialMove(color, pieceType, moveType) {
    const key = `${color}_${pieceType}_${moveType}`;
    this.specialMovesUsed.set(key, true);
  }

  /**
   * Handle knight double movement
   */
  handleKnightDoubleMove(board, from, to, color, upgrades) {
    if (!upgrades[color][PieceType.KNIGHT].includes('knight_tier3')) {
      return false; // No tier 3 upgrade
    }

    if (!this.canUseSpecialMove(color, PieceType.KNIGHT, 'double_move')) {
      return false; // Already used this turn
    }

    // Check if this is a valid knight move
    const isValidKnightMove = this.isValidKnightMove(from, to);
    if (!isValidKnightMove) {
      return false;
    }

    // Check if target position is valid (empty or enemy piece)
    if (to.row < 0 || to.row >= 10 || to.col < 0 || to.col >= 16) {
      return false;
    }

    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === color) {
      return false; // Can't move to allied piece position
    }

    // Mark as used
    this.useSpecialMove(color, PieceType.KNIGHT, 'double_move');
    return true;
  }

  /**
   * Handle king piece manipulation (swap positions)
   */
  handleKingPieceSwap(board, from, to, color, upgrades) {
    if (!upgrades[color][PieceType.KING].includes('king_tier2')) {
      return false; // No tier 2 upgrade
    }

    if (!this.canUseSpecialMove(color, PieceType.KING, 'piece_swap')) {
      return false; // Already used this game
    }

    // Check if target is an allied piece
    const targetPiece = board[to.row][to.col];
    if (!targetPiece || targetPiece.color !== color || targetPiece.type === PieceType.KING) {
      return false;
    }

    // Mark as used
    this.useSpecialMove(color, PieceType.KING, 'piece_swap');
    return true;
  }

  /**
   * Handle king royal command (move allied piece)
   */
  handleKingRoyalCommand(board, from, to, targetPiece, color, upgrades) {
    if (!upgrades[color][PieceType.KING].includes('king_tier3')) {
      return false; // No tier 3 upgrade
    }

    if (!this.canUseSpecialMove(color, PieceType.KING, 'royal_command')) {
      return false; // Already used this turn
    }

    // Check if target piece is allied and adjacent to king
    if (!targetPiece || targetPiece.color !== color) {
      return false;
    }

    const isAdjacent = this.isAdjacent(from, to);
    if (!isAdjacent) {
      return false;
    }

    // Mark as used
    this.useSpecialMove(color, PieceType.KING, 'royal_command');
    return true;
  }

  /**
   * Handle queen advanced capture mechanics (tier 2)
   */
  handleQueenAdvancedCapture(board, from, to, color, upgrades) {
    if (!upgrades[color][PieceType.QUEEN].includes('queen_tier2')) {
      return false; // No tier 2 upgrade
    }

    if (!this.canUseSpecialMove(color, PieceType.QUEEN, 'advanced_capture')) {
      return false; // Already used this turn
    }

    // Check if this is a valid advanced capture move (through pawns)
    const isValidAdvancedCapture = this.isValidQueenAdvancedCapture(board, from, to, color);
    if (!isValidAdvancedCapture) {
      return false;
    }

    // Mark as used
    this.useSpecialMove(color, PieceType.QUEEN, 'advanced_capture');
    return true;
  }

  /**
   * Handle queen royal teleportation (tier 3)
   */
  handleQueenRoyalTeleport(board, from, to, color, upgrades) {
    if (!upgrades[color][PieceType.QUEEN].includes('queen_tier3')) {
      return false; // No tier 3 upgrade
    }

    if (!this.canUseSpecialMove(color, PieceType.QUEEN, 'royal_teleport')) {
      return false; // Already used this game
    }

    // Check if target position is empty
    if (board[to.row][to.col]) {
      return false;
    }

    // Mark as used
    this.useSpecialMove(color, PieceType.QUEEN, 'royal_teleport');
    return true;
  }

  /**
   * Check if a move is a valid knight move
   */
  isValidKnightMove(from, to) {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  /**
   * Check if two positions are adjacent
   */
  isAdjacent(pos1, pos2) {
    const rowDiff = Math.abs(pos2.row - pos1.row);
    const colDiff = Math.abs(pos2.col - pos1.col);
    
    return rowDiff <= 1 && colDiff <= 1 && (rowDiff !== 0 || colDiff !== 0);
  }

  /**
   * Check if a queen advanced capture move is valid
   */
  isValidQueenAdvancedCapture(board, from, to, color) {
    // This is a simplified validation - the actual move logic is in upgradeLogic.js
    // We're just checking if it's a valid target position
    if (to.row < 0 || to.row >= 10 || to.col < 0 || to.col >= 16) {
      return false;
    }

    const targetPiece = board[to.row][to.col];
    if (targetPiece && targetPiece.color === color) {
      return false; // Can't capture own piece
    }

    return true;
  }

  /**
   * Execute a special move on the board
   */
  executeSpecialMove(board, from, to, moveType, color) {
    const newBoard = board.map(row => [...row]);
    
    switch (moveType) {
      case 'knight_double':
        // Knight double move - just move the piece
        newBoard[to.row][to.col] = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = null;
        break;
        
      case 'king_swap':
        // King swap - exchange positions
        const temp = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = newBoard[to.row][to.col];
        newBoard[to.row][to.col] = temp;
        break;
        
      case 'king_royal_command':
        // King royal command - move allied piece to adjacent square
        newBoard[to.row][to.col] = newBoard[from.row][from.col];
        newBoard[from.row][from.col] = null;
        break;
        
      default:
        return board; // No special move
    }
    
    return newBoard;
  }

  /**
   * Get available special moves for a piece
   */
  getAvailableSpecialMoves(board, position, piece, color, upgrades) {
    const specialMoves = [];
    
    if (piece.type === PieceType.KNIGHT && upgrades[color][PieceType.KNIGHT].includes('knight_tier3')) {
      if (this.canUseSpecialMove(color, PieceType.KNIGHT, 'double_move')) {
        specialMoves.push({
          type: 'knight_double',
          description: 'Double Movement',
          available: true
        });
      }
    }
    
    if (piece.type === PieceType.QUEEN) {
      if (upgrades[color][PieceType.QUEEN].includes('queen_tier2') && 
          this.canUseSpecialMove(color, PieceType.QUEEN, 'advanced_capture')) {
        specialMoves.push({
          type: 'queen_advanced_capture',
          description: 'Advanced Capture',
          available: true
        });
      }
      
      if (upgrades[color][PieceType.QUEEN].includes('queen_tier3') && 
          this.canUseSpecialMove(color, PieceType.QUEEN, 'royal_teleport')) {
        specialMoves.push({
          type: 'queen_royal_teleport',
          description: 'Royal Teleport',
          available: true
        });
      }
    }
    
    if (piece.type === PieceType.KING) {
      if (upgrades[color][PieceType.KING].includes('king_tier2') && 
          this.canUseSpecialMove(color, PieceType.KING, 'piece_swap')) {
        specialMoves.push({
          type: 'king_swap',
          description: 'Piece Swap',
          available: true
        });
      }
      
      if (upgrades[color][PieceType.KING].includes('king_tier3') && 
          this.canUseSpecialMove(color, PieceType.KING, 'royal_command')) {
        specialMoves.push({
          type: 'king_royal_command',
          description: 'Royal Command',
          available: true
        });
      }
    }
    
    return specialMoves;
  }

  /**
   * Serialize special moves state
   */
  serialize() {
    const serialized = {};
    for (const [key, value] of this.specialMovesUsed) {
      serialized[key] = value;
    }
    return serialized;
  }

  /**
   * Deserialize special moves state
   */
  deserialize(data) {
    this.specialMovesUsed.clear();
    for (const [key, value] of Object.entries(data)) {
      this.specialMovesUsed.set(key, value);
    }
  }
}

module.exports = {
  SpecialMovesManager
};
