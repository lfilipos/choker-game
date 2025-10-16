import { Board, Position, PieceType, PieceColor } from '../types';

export const createInitialBoard = (): Board => {
  const board: Board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place pawns in the center 8 columns (4 empty squares on each side)
  for (let col = 4; col < 12; col++) {
    board[1][col] = { type: 'pawn', color: 'black' };
    board[8][col] = { type: 'pawn', color: 'white' };
  }
  
  // Place other pieces in the center 8 columns
  const backRowPieces: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];
  
  for (let i = 0; i < 8; i++) {
    board[0][i + 4] = { type: backRowPieces[i], color: 'black' };
    board[9][i + 4] = { type: backRowPieces[i], color: 'white' };
  }
  
  return board;
};

export const isValidPosition = (pos: Position): boolean => {
  return pos.row >= 0 && pos.row < 10 && pos.col >= 0 && pos.col < 16;
};

export const getPossibleMoves = (board: Board, position: Position): Position[] => {
  const piece = board[position.row][position.col];
  if (!piece) return [];
  
  switch (piece.type) {
    case 'pawn':
      return getPawnMoves(board, position, piece.color);
    case 'rook':
      return getRookMoves(board, position, piece.color);
    case 'bishop':
      return getBishopMoves(board, position, piece.color);
    case 'queen':
      return getQueenMoves(board, position, piece.color);
    case 'king':
      return getKingMoves(board, position, piece.color);
    case 'knight':
      return getKnightMoves(board, position, piece.color);
    default:
      return [];
  }
};

const getPawnMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  const moves: Position[] = [];
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 8 : 1;
  
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
    if (isValidPosition(pos) && board[pos.row][pos.col] && board[pos.row][pos.col]!.color !== color) {
      moves.push(pos);
    }
  });
  
  return moves;
};

const getRookMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  const moves: Position[] = [];
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
};

const getBishopMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  const moves: Position[] = [];
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
};

const getQueenMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  return [...getRookMoves(board, position, color), ...getBishopMoves(board, position, color)];
};

const getKingMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  const moves: Position[] = [];
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
};

const getKnightMoves = (board: Board, position: Position, color: PieceColor): Position[] => {
  const moves: Position[] = [];
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
};

export const findKing = (board: Board, color: PieceColor): Position | null => {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
};

export const isSquareUnderAttack = (board: Board, position: Position, byColor: PieceColor): boolean => {
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === byColor) {
        const moves = getPossibleMoves(board, { row, col });
        if (moves.some(move => move.row === position.row && move.col === position.col)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const isInCheck = (board: Board, color: PieceColor): boolean => {
  const kingPosition = findKing(board, color);
  if (!kingPosition) return false;
  
  const opponentColor = color === 'white' ? 'black' : 'white';
  return isSquareUnderAttack(board, kingPosition, opponentColor);
};

export const makeMove = (board: Board, from: Position, to: Position): Board => {
  const newBoard = board.map(row => [...row]);
  const piece = newBoard[from.row][from.col];
  
  newBoard[to.row][to.col] = piece;
  newBoard[from.row][from.col] = null;
  
  return newBoard;
};

// Check if a pawn is protected by a rook's protection ability
export const isProtectedByRook = (board: Board, position: Position, color: PieceColor, upgrades: any): boolean => {
  if (!upgrades || !upgrades[color] || !upgrades[color].rook || !upgrades[color].rook.includes('rook_pawn_protection')) {
    return false;
  }
  
  // Check if the piece at this position is a pawn
  const piece = board[position.row][position.col];
  if (!piece || piece.type !== 'pawn' || piece.color !== color) {
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
    if (checkPiece && checkPiece.type === 'rook' && checkPiece.color === color) {
      // Check if this rook has the pawn protection upgrade
      if (upgrades[color].rook.includes('rook_pawn_protection')) {
        // Determine if the pawn is directly behind the rook
        if (color === 'white') {
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
};

// Check if a piece is protected by queen's aura
export const isProtectedByQueenAura = (board: Board, position: Position, color: PieceColor, upgrades: any): boolean => {
  if (!upgrades || !upgrades[color] || !upgrades[color].queen || !upgrades[color].queen.includes('queen_aura')) {
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
        if (piece && piece.type === 'queen' && piece.color === color) {
          return true;
        }
      }
    }
  }
  
  return false;
};

export const isValidMove = (board: Board, from: Position, to: Position, color: PieceColor): boolean => {
  const piece = board[from.row][from.col];
  if (!piece || piece.color !== color) return false;
  
  const possibleMoves = getPossibleMoves(board, from);
  const isMovePossible = possibleMoves.some(move => move.row === to.row && move.col === to.col);
  
  if (!isMovePossible) return false;
  
  // Check if move would put own king in check
  const testBoard = makeMove(board, from, to);
  return !isInCheck(testBoard, color);
};

export const getAllValidMoves = (board: Board, color: PieceColor): { from: Position; to: Position }[] => {
  const validMoves: { from: Position; to: Position }[] = [];
  
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 16; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const possibleMoves = getPossibleMoves(board, { row, col });
        possibleMoves.forEach(to => {
          if (isValidMove(board, { row, col }, to, color)) {
            validMoves.push({ from: { row, col }, to });
          }
        });
      }
    }
  }
  
  return validMoves;
};

export const isCheckmate = (board: Board, color: PieceColor): boolean => {
  if (!isInCheck(board, color)) return false;
  return getAllValidMoves(board, color).length === 0;
};

export const isStalemate = (board: Board, color: PieceColor): boolean => {
  if (isInCheck(board, color)) return false;
  return getAllValidMoves(board, color).length === 0;
};