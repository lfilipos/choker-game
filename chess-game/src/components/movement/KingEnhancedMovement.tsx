import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface KingEnhancedMovementProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  enhancedSquares: Position[];
  onMovementComplete: (movement: { from: Position; to: Position; type: string; special?: string }) => void;
  onCancel: () => void;
}

export const KingEnhancedMovement: React.FC<KingEnhancedMovementProps> = ({
  piece,
  upgrades,
  enhancedSquares,
  onMovementComplete,
  onCancel
}) => {
  const [selectedDestination, setSelectedDestination] = useState<Position | null>(null);
  const [movementType, setMovementType] = useState<'standard' | 'enhanced' | 'teleport' | 'command'>('standard');
  const [specialAbility, setSpecialAbility] = useState<string>('');

  // Check if this king has the enhanced movement upgrade
  const hasEnhancedUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 2 && 
    upgrade.effects.some(effect => effect.value === 'enhanced_movement')
  );

  if (!hasEnhancedUpgrade) {
    return null;
  }

  const handleDestinationSelect = (destination: Position) => {
    setSelectedDestination(destination);
  };

  const handleMovementTypeChange = (type: 'standard' | 'enhanced' | 'teleport' | 'command') => {
    setMovementType(type);
    setSelectedDestination(null);
    setSpecialAbility('');
  };

  const handleSpecialAbilitySelect = (ability: string) => {
    setSpecialAbility(ability);
  };

  const handleConfirmMovement = () => {
    if (selectedDestination) {
      onMovementComplete({
        from: piece.position,
        to: selectedDestination,
        type: movementType,
        special: specialAbility
      });
    }
  };

  const handleCancel = () => {
    setSelectedDestination(null);
    setSpecialAbility('');
    onCancel();
  };

  const getMovementDescription = () => {
    switch (movementType) {
      case 'standard':
        return 'Standard king movement (one square in any direction)';
      case 'enhanced':
        return 'Enhanced movement with extended range and special abilities';
      case 'teleport':
        return 'Teleport to any valid square on the board';
      case 'command':
        return 'Command other pieces to move in your stead';
      default:
        return '';
    }
  };

  const getAvailableSquares = () => {
    switch (movementType) {
      case 'standard':
        // Standard king movement - adjacent squares only
        return enhancedSquares.filter(square => {
          const rowDiff = Math.abs(square.row - piece.position.row);
          const colDiff = Math.abs(square.col - piece.position.col);
          return rowDiff <= 1 && colDiff <= 1 && (rowDiff > 0 || colDiff > 0);
        });
      case 'enhanced':
        // Enhanced movement - extended range
        return enhancedSquares.filter(square => {
          const rowDiff = Math.abs(square.row - piece.position.row);
          const colDiff = Math.abs(square.col - piece.position.col);
          return rowDiff <= 2 && colDiff <= 2 && (rowDiff > 0 || colDiff > 0);
        });
      case 'teleport':
        // Teleport - all valid squares
        return enhancedSquares;
      case 'command':
        // Command - squares where other pieces can move
        return enhancedSquares.filter(square => {
          const rowDiff = Math.abs(square.row - piece.position.row);
          const colDiff = Math.abs(square.col - piece.position.col);
          return rowDiff <= 3 && colDiff <= 3;
        });
      default:
        return enhancedSquares;
    }
  };

  const availableSquares = getAvailableSquares();

  const getSpecialAbilities = () => {
    switch (movementType) {
      case 'enhanced':
        return ['Shield', 'Rally', 'Inspire'];
      case 'teleport':
        return ['Safe Passage', 'Blink', 'Phase'];
      case 'command':
        return ['Move Ally', 'Block Enemy', 'Support'];
      default:
        return [];
    }
  };

  const specialAbilities = getSpecialAbilities();

  return (
    <div className="king-enhanced-movement">
      <div className="selector-header">
        <h3>King Enhanced Movement</h3>
        <p>Royal abilities and strategic movement</p>
      </div>

      <div className="movement-info">
        <div className="piece-display">
          <span className="piece-icon">♔</span>
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
            className={`type-btn ${movementType === 'enhanced' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('enhanced')}
          >
            Enhanced
          </button>
          <button
            className={`type-btn ${movementType === 'teleport' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('teleport')}
          >
            Teleport
          </button>
          <button
            className={`type-btn ${movementType === 'command' ? 'active' : ''}`}
            onClick={() => handleMovementTypeChange('command')}
          >
            Command
          </button>
        </div>
        <p className="movement-description">{getMovementDescription()}</p>
      </div>

      {specialAbilities.length > 0 && (
        <div className="special-ability-selector">
          <h4>Special Ability</h4>
          <div className="ability-buttons">
            {specialAbilities.map((ability) => (
              <button
                key={ability}
                className={`ability-btn ${specialAbility === ability ? 'active' : ''}`}
                onClick={() => handleSpecialAbilitySelect(ability)}
              >
                {ability}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="selection-section">
        <h4>Select Destination ({movementType} movement)</h4>
        <div className="enhanced-squares-grid">
          {availableSquares.map((square, index) => {
            const isSelected = selectedDestination && 
              selectedDestination.row === square.row && 
              selectedDestination.col === square.col;
            
            return (
              <button
                key={`enhanced-${index}`}
                className={`enhanced-square ${isSelected ? 'selected' : ''}`}
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
            King from {piece.position.row},{piece.position.col} → {selectedDestination.row},{selectedDestination.col}
          </p>
          <p className="movement-type-indicator">
            Movement type: <strong>{movementType}</strong>
          </p>
          {specialAbility && (
            <p className="special-ability-indicator">
              Special ability: <strong>{specialAbility}</strong>
            </p>
          )}
        </div>
      )}
    </div>
  );
};
