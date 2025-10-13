import React from 'react';
import { ChessPiece, Position, ControlZone, Board, WallSquare } from '../types';
import { UpgradeState } from '../types/upgrades';
import { ChessPieceComponent } from './ChessPieceComponent';
import './ChessSquare.css';

interface ChessSquareProps {
  piece: ChessPiece | null;
  position: Position;
  isLight: boolean;
  isSelected: boolean;
  isPossibleMove: boolean;
  isHighlighted?: boolean;
  isLastMove?: boolean;
  controlZone: ControlZone | null;
  onClick: (position: Position) => void;
  upgrades?: UpgradeState;
  board?: Board;
  wallSquare?: WallSquare | null;
  isLastRookLink?: boolean;
}

export const ChessSquare: React.FC<ChessSquareProps> = ({
  piece,
  position,
  isLight,
  isSelected,
  isPossibleMove,
  isHighlighted = false,
  isLastMove = false,
  controlZone,
  onClick,
  upgrades,
  board,
  wallSquare,
  isLastRookLink = false,
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
    
    if (isHighlighted) {
      classes.push('highlighted');
    }
    
    if (isLastMove) {
      classes.push('last-move');
    }
    
    if (controlZone) {
      classes.push('control-zone');
      classes.push(`control-zone-${controlZone.id.toLowerCase()}`);
    }
    
    if (wallSquare) {
      classes.push('rook-wall');
      classes.push(`rook-wall-${wallSquare.color}`);
      if (isLastRookLink) {
        classes.push('last-rook-link');
      }
    }
    
    return classes.join(' ');
  };

  return (
    <div className={getSquareClasses()} onClick={handleClick}>
      {wallSquare && (
        <div className="wall-indicator" title={`${wallSquare.color} team wall`}>
          <div className="wall-pattern"></div>
        </div>
      )}
      {piece && <ChessPieceComponent piece={piece} upgrades={upgrades} board={board} position={position} />}
    </div>
  );
};