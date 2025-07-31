import React from 'react';
import { ChessPiece } from '../types';
import './ChessPieceComponent.css';

interface ChessPieceComponentProps {
  piece: ChessPiece;
}

export const ChessPieceComponent: React.FC<ChessPieceComponentProps> = ({ piece }) => {
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

  return (
    <div className={`chess-piece ${piece.color}`}>
      {getPieceSymbol()}
    </div>
  );
};