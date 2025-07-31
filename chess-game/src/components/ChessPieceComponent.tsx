import React from 'react';
import { ChessPiece } from '../types';
import { UpgradeState } from '../types/upgrades';
import './ChessPieceComponent.css';
import './ChessPieceUpgrade.css';

interface ChessPieceComponentProps {
  piece: ChessPiece;
  upgrades?: UpgradeState;
}

export const ChessPieceComponent: React.FC<ChessPieceComponentProps> = ({ piece, upgrades }) => {
  const getPieceSymbol = (): string => {
    const symbols = {
      white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
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

  return (
    <div className={`chess-piece ${piece.color} ${upgradeCount > 0 ? 'upgraded-piece' : ''}`}>
      <span className={upgradeCount > 0 ? 'upgrade-glow' : ''}>
        {getPieceSymbol()}
      </span>
      {upgradeCount > 0 && (
        <div className={`upgrade-indicator upgrade-count-${Math.min(upgradeCount, 4)} ${upgradeCount >= 4 ? 'upgrade-count-max' : ''}`}>
          {upgradeCount}
        </div>
      )}
    </div>
  );
};