import React from 'react';
import { ChessPiece, Board, Position } from '../types';
import { UpgradeState } from '../types/upgrades';
import { isProtectedByRook } from '../utils/chessLogic';
import './ChessPieceComponent.css';
import './ChessPieceUpgrade.css';

interface ChessPieceComponentProps {
  piece: ChessPiece;
  upgrades?: UpgradeState;
  board?: Board;
  position?: Position;
}

export const ChessPieceComponent: React.FC<ChessPieceComponentProps> = ({ piece, upgrades, board, position }) => {
  const getPieceSymbol = (): string => {
    const symbols = {
      white: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
      },
      black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
      }
    };
    
    return symbols[piece.color][piece.type];
  };

  const getUpgradeCount = (): number => {
    if (!upgrades || !upgrades[piece.color] || !upgrades[piece.color][piece.type]) {
      return 0;
    }
    return upgrades[piece.color][piece.type].length;
  };

  // Helper function to find king position
  const findKingPosition = (board: Board, color: string): Position | null => {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const piece = board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  };

  // Helper function to get bishops adjacent to king
  const getBishopsAdjacentToKing = (board: Board, kingPos: Position, color: string): Position[] => {
    const adjacentBishops: Position[] = [];
    
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue;
        
        const checkRow = kingPos.row + dRow;
        const checkCol = kingPos.col + dCol;
        
        if (checkRow >= 0 && checkRow < board.length && checkCol >= 0 && checkCol < board[0].length) {
          const piece = board[checkRow][checkCol];
          if (piece && piece.type === 'bishop' && piece.color === color) {
            adjacentBishops.push({ row: checkRow, col: checkCol });
          }
        }
      }
    }
    
    return adjacentBishops;
  };

  // Check if this bishop is providing royal protection
  const isProvidingRoyalProtection = (): boolean => {
    if (!board || !position || piece.type !== 'bishop') return false;
    if (!upgrades || !upgrades[piece.color] || !upgrades[piece.color].bishop) return false;
    if (!upgrades[piece.color].bishop.includes('bishop_royal_protection')) return false;
    
    const kingPos = findKingPosition(board, piece.color);
    if (!kingPos) return false;
    
    const adjacentBishops = getBishopsAdjacentToKing(board, kingPos, piece.color);
    
    // Protection only works if exactly one bishop is adjacent
    if (adjacentBishops.length === 1) {
      // Check if this is that bishop
      return adjacentBishops[0].row === position.row && adjacentBishops[0].col === position.col;
    }
    
    return false;
  };

  // Check if this king is protected by royal protection
  const isProtectedByRoyalProtection = (): boolean => {
    if (!board || !position || piece.type !== 'king') return false;
    if (!upgrades || !upgrades[piece.color] || !upgrades[piece.color].bishop) return false;
    if (!upgrades[piece.color].bishop.includes('bishop_royal_protection')) return false;
    
    const adjacentBishops = getBishopsAdjacentToKing(board, position, piece.color);
    
    // Protection only works if exactly one bishop is adjacent
    return adjacentBishops.length === 1;
  };

  const upgradeCount = getUpgradeCount();
  
  // Check if this piece is protected by a rook
  const isProtected = board && position && piece.type === 'pawn' && 
                     isProtectedByRook(board, position, piece.color, upgrades);
  
  // Check if this piece is providing protection (rook with pawn protection upgrade)
  const isProtecting = board && position && piece.type === 'rook' && 
                      upgrades && upgrades[piece.color] && upgrades[piece.color].rook && 
                      upgrades[piece.color].rook.includes('rook_pawn_protection');

  // Check for royal protection
  const isRoyalProtector = isProvidingRoyalProtection();
  const isRoyalProtected = isProtectedByRoyalProtection();

  return (
    <div className={`chess-piece ${piece.color} ${upgradeCount > 0 ? 'upgraded-piece' : ''} ${isProtected ? 'protected-piece' : ''} ${isProtecting ? 'protecting-piece' : ''} ${isRoyalProtected ? 'royal-protected-piece' : ''} ${isRoyalProtector ? 'royal-protector-piece' : ''}`}>
      <span className={`${upgradeCount > 0 ? 'upgrade-glow' : ''} ${isProtected ? 'protection-glow' : ''} ${isProtecting ? 'protecting-glow' : ''} ${isRoyalProtected ? 'royal-protection-glow' : ''} ${isRoyalProtector ? 'royal-protector-glow' : ''}`}>
        {getPieceSymbol()}
      </span>
      {upgradeCount > 0 && (
        <div className={`upgrade-indicator upgrade-count-${Math.min(upgradeCount, 4)} ${upgradeCount >= 4 ? 'upgrade-count-max' : ''}`}>
          {upgradeCount}
        </div>
      )}
      {isProtected && (
        <div className="protection-indicator">
          🛡️
        </div>
      )}
      {isProtecting && (
        <div className="protecting-indicator">
          ✨
        </div>
      )}
      {isRoyalProtected && (
        <div className="royal-protection-indicator">
          🛡️
        </div>
      )}
      {isRoyalProtector && (
        <div className="royal-protector-indicator">
          👑
        </div>
      )}
    </div>
  );
};