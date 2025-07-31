import React from 'react';
import { ChessPiece, Position, ControlZone } from '../types';
import { UpgradeState } from '../types/upgrades';
import { ChessPieceComponent } from './ChessPieceComponent';
import './ChessSquare.css';

interface ChessSquareProps {
  piece: ChessPiece | null;
  position: Position;
  isLight: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  controlZone: ControlZone | null;
  onClick: (position: Position) => void;
  upgrades?: UpgradeState;
}

export const ChessSquare: React.FC<ChessSquareProps> = ({
  piece,
  position,
  isLight,
  isSelected,
  isPossibleMove,
  controlZone,
  onClick,
  upgrades,
}) => {
  const handleClick = () => {
    onClick(position);
  };

  const getSquareClasses = (): string => {
    const classes = ['chess-square'];
    
    if (isLight) {
      classes.push('light');
    } else {
      classes.push('dark');
    }
    
    if (isSelected) {
      classes.push('selected');
    }
    
    if (isPossibleMove) {
      classes.push('possible-move');
    }
    
    if (controlZone) {
      classes.push('control-zone');
      classes.push(`control-zone-${controlZone.id.toLowerCase()}`);
    }
    
    return classes.join(' ');
  };

  return (
    <div className={getSquareClasses()} onClick={handleClick}>
      {piece && <ChessPieceComponent piece={piece} upgrades={upgrades} />}
    </div>
  );
};