import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface BishopOrthogonalMovementProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  orthogonalSquares: Position[];
  onMoveComplete: (move: { from: Position; to: Position }) => void;
  onCancel: () => void;
}

export const BishopOrthogonalMovement: React.FC<BishopOrthogonalMovementProps> = ({
  piece,
  upgrades,
  orthogonalSquares,
  onMoveComplete,
  onCancel
}) => {
  const [selectedDestination, setSelectedDestination] = useState<Position | null>(null);
  const [movementType, setMovementType] = useState<'diagonal' | 'orthogonal'>('diagonal');

  // Check if this bishop has the orthogonal movement upgrade
  const hasOrthogonalUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 1 && 
    upgrade.effects.some(effect => effect.value === 'orthogonal')
  );

  if (!hasOrthogonalUpgrade) {
    return null;
  }

  const handleDestinationSelect = (destination: Position) => {
    setSelectedDestination(destination);
  };

  const handleMovementTypeChange = (type: 'diagonal' | 'orthogonal') => {
    setMovementType(type);
    setSelectedDestination(null); // Reset destination when changing movement type
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

  // Filter squares based on movement type
  const getAvailableSquares = () => {
    if (movementType === 'diagonal') {
      // Return diagonal squares (traditional bishop movement)
      return orthogonalSquares.filter(square => {
        const rowDiff = Math.abs(square.row - piece.position.row);
        const colDiff = Math.abs(square.col - piece.position.col);
        return rowDiff === colDiff && rowDiff > 0;
      });
    } else {
      // Return orthogonal squares (horizontal/vertical movement)
      return orthogonalSquares.filter(square => {
        const rowDiff = Math.abs(square.row - piece.position.row);
        const colDiff = Math.abs(square.col - piece.position.col);
        return (rowDiff === 0 && colDiff > 0) || (colDiff === 0 && rowDiff > 0);
      });
    }
  };

  const availableSquares = getAvailableSquares();

  return (
    <div className="bishop-orthogonal-movement">
      <div className="selector-header">
        <h3>Bishop Enhanced Movement</h3>
        <p>Choose movement type and destination</p>
      </div>

      <div className="movement-info">
        <div className="piece-display">
          <span className="piece-icon">♝</span>
          <span className="piece-position">at {piece.position.row},{piece.position.col}</span>
        </div>
      </div>

      <div className="movement-type-selector">
        <h4>Movement Type</h4>
        <div className="type-buttons">
          <button
            className={`type-btn ${movementType === 'diagonal' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('diagonal')}
          >
            Diagonal (Traditional)
          </button>
          <button
            className={`type-btn ${movementType === 'orthogonal' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('orthogonal')}
          >
            Orthogonal (Enhanced)
          </button>
        </div>
      </div>

      <div className="selection-section">
        <h4>Select Destination ({movementType} movement)</h4>
        <div className="orthogonal-squares-grid">
          {availableSquares.map((square, index) => {
            const isSelected = selectedDestination && 
              selectedDestination.row === square.row && 
              selectedDestination.col === square.col;
            
            return (
              <button
                key={`orthogonal-${index}`}
                className={`orthogonal-square ${isSelected ? 'selected' : ''}`}
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
            Bishop from {piece.position.row},{piece.position.col} → {selectedDestination.row},{selectedDestination.col}
          </p>
          <p className="movement-type-indicator">
            Movement type: <strong>{movementType}</strong>
          </p>
        </div>
      )}
    </div>
  );
};
