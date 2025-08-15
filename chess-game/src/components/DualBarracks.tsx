import React from 'react';
import { BarracksPiece, PieceColor } from '../types';
import './DualBarracks.css';

interface DualBarracksProps {
  playerBarracks: BarracksPiece[];
  enemyBarracks: BarracksPiece[];
  playerColor: PieceColor;
  selectedPieceIndex: number | null;
  onSelectPiece: (index: number | null) => void;
  placementMode: boolean;
}

const DualBarracks: React.FC<DualBarracksProps> = ({
  playerBarracks,
  enemyBarracks,
  playerColor,
  selectedPieceIndex,
  onSelectPiece,
  placementMode
}) => {
  const getPieceSymbol = (piece: BarracksPiece): string => {
    const symbols = {
      white: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return symbols[piece.color][piece.type];
  };

  const enemyColor = playerColor === 'white' ? 'black' : 'white';

  // Render barracks sections based on player color
  const renderBarracksSections = () => {
    const enemySection = (
      <div key="enemy" className="enemy-barracks-section">
        <h3>Enemy Barracks</h3>
        <div className="barracks-grid">
          {enemyBarracks.length === 0 ? (
            <div className="empty-barracks">No pieces in enemy barracks</div>
          ) : (
            enemyBarracks.map((piece, index) => (
              <div key={index} className={`barracks-piece enemy-piece ${enemyColor}`}>
                <span className="piece-symbol">{getPieceSymbol(piece)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    );

    const playerSection = (
      <div key="player" className="team-barracks-section">
        <h3>Your Barracks</h3>
        <div className="barracks-grid">
          {playerBarracks.length === 0 ? (
            <div className="empty-barracks">
              No pieces in barracks
              <div className="barracks-hint">Purchase pieces from the store to add them here</div>
            </div>
          ) : (
            playerBarracks.map((piece, index) => (
              <div
                key={index}
                className={`barracks-piece team-piece ${playerColor} ${selectedPieceIndex === index ? 'selected' : ''} ${placementMode ? 'placement-mode' : ''}`}
                onClick={() => onSelectPiece(selectedPieceIndex === index ? null : index)}
              >
                <span className="piece-symbol">{getPieceSymbol(piece)}</span>
              </div>
            ))
          )}
        </div>
        {placementMode && (
          <div className="placement-hint">
            Click on an empty square in your back row to place the piece
          </div>
        )}
      </div>
    );

    // For white players: enemy on top, player on bottom
    // For black players: player on top, enemy on bottom
    if (playerColor === 'white') {
      return (
        <>
          {enemySection}
          <div className="divider" />
          {playerSection}
        </>
      );
    } else {
      return (
        <>
          {playerSection}
          <div className="divider" />
          {enemySection}
        </>
      );
    }
  };

  return (
    <div className="dual-barracks">
      {renderBarracksSections()}
    </div>
  );
};

export default DualBarracks;