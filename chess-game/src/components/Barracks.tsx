import React, { useState } from 'react';
import { BarracksPiece, PieceColor, PieceType, Position } from '../types';
import './Barracks.css';

interface BarracksProps {
  pieces: BarracksPiece[];
  playerColor: PieceColor;
  onPlacePiece: (pieceIndex: number, position: Position) => void;
  validPlacements?: Position[];
  placementMode: boolean;
  selectedPieceIndex: number | null;
  onSelectPiece: (index: number | null) => void;
}

const pieceEmojis: Record<PieceType, { white: string; black: string }> = {
  pawn: { white: '♟', black: '♟' },
  knight: { white: '♞', black: '♞' },
  bishop: { white: '♝', black: '♝' },
  rook: { white: '♜', black: '♜' },
  queen: { white: '♛', black: '♛' },
  king: { white: '♚', black: '♚' }
};

const Barracks: React.FC<BarracksProps> = ({
  pieces,
  playerColor,
  onPlacePiece,
  validPlacements = [],
  placementMode,
  selectedPieceIndex,
  onSelectPiece
}) => {
  console.log('Barracks render - pieces:', pieces, 'playerColor:', playerColor, 'placementMode:', placementMode);
  
  if (pieces.length === 0) {
    return (
      <div className="barracks empty">
        <h3>Barracks</h3>
        <p className="empty-message">No pieces in barracks</p>
        <p className="hint">Purchase pieces from the store</p>
      </div>
    );
  }

  return (
    <div className="barracks">
      <h3>Barracks ({pieces.length})</h3>
      <div className="barracks-pieces">
        {pieces.map((piece, index) => (
          <div
            key={index}
            className={`barracks-piece ${selectedPieceIndex === index ? 'selected' : ''} clickable`}
            onClick={() => {
              console.log('Barracks piece clicked:', index, piece);
              onSelectPiece(selectedPieceIndex === index ? null : index);
            }}
            title={`${piece.type} - Click to place on board`}
          >
            <span className="piece-emoji">
              {pieceEmojis[piece.type][piece.color]}
            </span>
            <span className="piece-name">{piece.type}</span>
          </div>
        ))}
      </div>
      {placementMode && selectedPieceIndex !== null && (
        <div className="placement-hint">
          Click on a highlighted square on your back row to place the piece
        </div>
      )}
      {!placementMode && pieces.length > 0 && (
        <div className="placement-hint">
          Pieces can be placed on empty squares in your back row
        </div>
      )}
    </div>
  );
};

export default Barracks;