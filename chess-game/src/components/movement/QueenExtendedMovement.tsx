import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface QueenExtendedMovementProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  extendedSquares: Position[];
  onMovementComplete: (movement: { from: Position; to: Position; type: string }) => void;
  onCancel: () => void;
}

export const QueenExtendedMovement: React.FC<QueenExtendedMovementProps> = ({
  piece,
  upgrades,
  extendedSquares,
  onMovementComplete,
  onCancel
}) => {
  const [selectedDestination, setSelectedDestination] = useState<Position | null>(null);
  const [movementType, setMovementType] = useState<'standard' | 'extended' | 'jump'>('standard');
  const [selectedSquares, setSelectedSquares] = useState<Position[]>([]);

  // Check if this queen has the extended movement upgrade
  const hasExtendedUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 2 && 
    upgrade.effects.some(effect => effect.value === 'extended_movement')
  );

  if (!hasExtendedUpgrade) {
    return null;
  }

  const handleDestinationSelect = (destination: Position) => {
    setSelectedDestination(destination);
  };

  const handleMovementTypeChange = (type: 'standard' | 'extended' | 'jump') => {
    setMovementType(type);
    setSelectedDestination(null);
    setSelectedSquares([]);
  };

  const handleSquareSelection = (square: Position) => {
    if (movementType === 'jump') {
      const isSelected = selectedSquares.some(s => s.row === square.row && s.col === square.col);
      if (isSelected) {
        setSelectedSquares(prev => prev.filter(s => !(s.row === square.row && s.col === square.col)));
      } else {
        setSelectedSquares(prev => [...prev, square]);
      }
    }
  };

  const handleConfirmMovement = () => {
    if (selectedDestination) {
      onMovementComplete({
        from: piece.position,
        to: selectedDestination,
        type: movementType
      });
    }
  };

  const handleCancel = () => {
    setSelectedDestination(null);
    setSelectedSquares([]);
    onCancel();
  };

  const getMovementDescription = () => {
    switch (movementType) {
      case 'standard':
        return 'Standard queen movement (diagonal + orthogonal)';
      case 'extended':
        return 'Extended range movement with enhanced reach';
      case 'jump':
        return 'Jump over pieces to reach distant squares';
      default:
        return '';
    }
  };

  const getAvailableSquares = () => {
    if (movementType === 'jump') {
      return extendedSquares.filter(square => {
        // For jump movement, show squares that require jumping over pieces
        const rowDiff = Math.abs(square.row - piece.position.row);
        const colDiff = Math.abs(square.col - piece.position.col);
        return (rowDiff > 1 || colDiff > 1) && (rowDiff === 0 || colDiff === 0 || rowDiff === colDiff);
      });
    }
    return extendedSquares;
  };

  const availableSquares = getAvailableSquares();

  return (
    <div className="queen-extended-movement">
      <div className="selector-header">
        <h3>Queen Extended Movement</h3>
        <p>Advanced movement patterns and capabilities</p>
      </div>

      <div className="movement-info">
        <div className="piece-display">
          <span className="piece-icon">♕</span>
          <span className="piece-position">at {piece.position.row},{piece.position.col}</span>
        </div>
      </div>

      <div className="movement-type-selector">
        <h4>Movement Type</h4>
        <div className="type-buttons">
          <button
            className={`type-btn ${movementType === 'standard' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('standard')}
          >
            Standard
          </button>
          <button
            className={`type-btn ${movementType === 'extended' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('extended')}
          >
            Extended
          </button>
          <button
            className={`type-btn ${movementType === 'jump' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('jump')}
          >
            Jump
          </button>
        </div>
        <p className="movement-description">{getMovementDescription()}</p>
      </div>

      <div className="selection-section">
        <h4>Select Destination ({movementType} movement)</h4>
        <div className="extended-squares-grid">
          {availableSquares.map((square, index) => {
            const isSelected = selectedDestination && 
              selectedDestination.row === square.row && 
              selectedDestination.col === square.col;
            
            const isJumpSelected = movementType === 'jump' && 
              selectedSquares.some(s => s.row === square.row && s.col === square.col);
            
            return (
              <button
                key={`extended-${index}`}
                className={`extended-square ${isSelected ? 'selected' : ''} ${isJumpSelected ? 'jump-selected' : ''}`}
                onClick={() => {
                  if (movementType === 'jump') {
                    handleSquareSelection(square);
                  } else {
                    handleDestinationSelect(square);
                  }
                }}
              >
                {square.row},{square.col}
              </button>
            );
          })}
        </div>
      </div>

      {movementType === 'jump' && (
        <div className="jump-selection-info">
          <h4>Jump Path Selection</h4>
          <p>Select squares to jump over: {selectedSquares.length} selected</p>
          <div className="jump-path-display">
            {selectedSquares.map((square, index) => (
              <span key={index} className="jump-path-square">
                {square.row},{square.col}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="selector-actions">
        <button 
          className="confirm-btn"
          disabled={!selectedDestination && movementType !== 'jump'}
          onClick={handleConfirmMovement}
        >
          Confirm Movement
        </button>
        <button className="cancel-btn" onClick={handleCancel}>
          Cancel
        </button>
      </div>

      {selectedDestination && (
        <div className="selected-summary">
          <h4>Selected Movement:</h4>
          <p>
            Queen from {piece.position.row},{piece.position.col} → {selectedDestination.row},{selectedDestination.col}
          </p>
          <p className="movement-type-indicator">
            Movement type: <strong>{movementType}</strong>
          </p>
          {movementType === 'jump' && selectedSquares.length > 0 && (
            <p className="jump-path-info">
              Jumping over: {selectedSquares.length} square(s)
            </p>
          )}
        </div>
      )}
    </div>
  );
};
