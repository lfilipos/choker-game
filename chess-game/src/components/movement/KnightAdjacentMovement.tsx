import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface KnightAdjacentMovementProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  adjacentSquares: Position[];
  onMoveComplete: (move: { from: Position; to: Position }) => void;
  onCancel: () => void;
}

export const KnightAdjacentMovement: React.FC<KnightAdjacentMovementProps> = ({
  piece,
  upgrades,
  adjacentSquares,
  onMoveComplete,
  onCancel
}) => {
  const [selectedDestination, setSelectedDestination] = useState<Position | null>(null);

  // Check if this knight has the adjacent movement upgrade
  const hasAdjacentUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 1 && 
    upgrade.effects.some(effect => effect.value === 'adjacent')
  );

  if (!hasAdjacentUpgrade) {
    return null;
  }

  const handleDestinationSelect = (destination: Position) => {
    setSelectedDestination(destination);
  };

  const handleConfirmMove = () => {
    if (selectedDestination) {
      onMoveComplete({
        from: piece.position,
        to: selectedDestination
      });
    }
  };

  const handleCancel = () => {
    setSelectedDestination(null);
    onCancel();
  };

  return (
    <div className="knight-adjacent-movement">
      <div className="selector-header">
        <h3>Knight Adjacent Movement</h3>
        <p>Select adjacent square for enhanced movement</p>
      </div>

      <div className="movement-info">
        <div className="piece-display">
          <span className="piece-icon">♞</span>
          <span className="piece-position">at {piece.position.row},{piece.position.col}</span>
        </div>
      </div>

      <div className="selection-section">
        <h4>Select Destination</h4>
        <div className="adjacent-squares-grid">
          {adjacentSquares.map((square, index) => {
            const isSelected = selectedDestination && 
              selectedDestination.row === square.row && 
              selectedDestination.col === square.col;
            
            return (
              <button
                key={`adjacent-${index}`}
                className={`adjacent-square ${isSelected ? 'selected' : ''}`}
                onClick={() => handleDestinationSelect(square)}
              >
                {square.row},{square.col}
              </button>
            );
          })}
        </div>
      </div>

      <div className="selector-actions">
        <button 
          className="confirm-btn"
          disabled={!selectedDestination}
          onClick={handleConfirmMove}
        >
          Confirm Move
        </button>
        <button className="cancel-btn" onClick={handleCancel}>
          Cancel
        </button>
      </div>

      {selectedDestination && (
        <div className="selected-summary">
          <h4>Selected Move:</h4>
          <p>
            Knight from {piece.position.row},{piece.position.col} → {selectedDestination.row},{selectedDestination.col}
          </p>
        </div>
      )}
    </div>
  );
};
