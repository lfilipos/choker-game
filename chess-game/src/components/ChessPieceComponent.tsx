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

  const upgradeCount = getUpgradeCount();
  
  // Check if this piece is protected by a rook
  const isProtected = board && position && piece.type === 'pawn' && 
                     isProtectedByRook(board, position, piece.color, upgrades);
  
  // Check if this piece is providing protection (rook with pawn protection upgrade)
  const isProtecting = board && position && piece.type === 'rook' && 
                      upgrades && upgrades[piece.color] && upgrades[piece.color].rook && 
                      upgrades[piece.color].rook.includes('rook_pawn_protection');

  return (
    <div className={`chess-piece ${piece.color} ${upgradeCount > 0 ? 'upgraded-piece' : ''} ${isProtected ? 'protected-piece' : ''} ${isProtecting ? 'protecting-piece' : ''}`}>
      <span className={`${upgradeCount > 0 ? 'upgrade-glow' : ''} ${isProtected ? 'protection-glow' : ''} ${isProtecting ? 'protecting-glow' : ''}`}>
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
    </div>
  );
};