import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface RookProtectionMechanicsProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  protectedSquares: Position[];
  onProtectionComplete: (protectedSquares: Position[]) => void;
  onCancel: () => void;
}

export const RookProtectionMechanics: React.FC<RookProtectionMechanicsProps> = ({
  piece,
  upgrades,
  protectedSquares,
  onProtectionComplete,
  onCancel
}) => {
  const [selectedProtectionSquares, setSelectedProtectionSquares] = useState<Position[]>([]);
  const [protectionMode, setProtectionMode] = useState<'defensive' | 'offensive'>('defensive');

  // Check if this rook has the protection mechanics upgrade
  const hasProtectionUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 2 && 
    upgrade.effects.some(effect => effect.value === 'protection')
  );

  if (!hasProtectionUpgrade) {
    return null;
  }

  const handleProtectionSquareSelect = (square: Position) => {
    const isSelected = selectedProtectionSquares.some(
      s => s.row === square.row && s.col === square.col
    );
    
    if (isSelected) {
      setSelectedProtectionSquares(prev => 
        prev.filter(s => !(s.row === square.row && s.col === square.col))
      );
    } else {
      setSelectedProtectionSquares(prev => [...prev, square]);
    }
  };

  const handleProtectionModeChange = (mode: 'defensive' | 'offensive') => {
    setProtectionMode(mode);
    setSelectedProtectionSquares([]); // Reset selection when changing modes
  };

  const handleConfirmProtection = () => {
    if (selectedProtectionSquares.length > 0) {
      onProtectionComplete(selectedProtectionSquares);
    }
  };

  const handleCancel = () => {
    setSelectedProtectionSquares([]);
    onCancel();
  };

  const getProtectionDescription = () => {
    if (protectionMode === 'defensive') {
      return 'Select squares to protect from enemy attacks';
    } else {
      return 'Select squares to control and restrict enemy movement';
    }
  };

  return (
    <div className="rook-protection-mechanics">
      <div className="selector-header">
        <h3>Rook Protection Mechanics</h3>
        <p>Advanced protection and control capabilities</p>
      </div>

      <div className="movement-info">
        <div className="piece-display">
          <span className="piece-icon">♜</span>
          <span className="piece-position">at {piece.position.row},{piece.position.col}</span>
        </div>
      </div>

      <div className="protection-mode-selector">
        <h4>Protection Mode</h4>
        <div className="mode-buttons">
          <button
            className={`mode-btn ${protectionMode === 'defensive' ? 'active' : ''}`}
            onClick={() => handleProtectionModeChange('defensive')}
          >
            Defensive Protection
          </button>
          <button
            className={`mode-btn ${protectionMode === 'offensive' ? 'active' : ''}`}
            onClick={() => handleProtectionModeChange('offensive')}
          >
            Offensive Control
          </button>
        </div>
        <p className="mode-description">{getProtectionDescription()}</p>
      </div>

      <div className="selection-section">
        <h4>Select Protection Squares ({selectedProtectionSquares.length} selected)</h4>
        <div className="protection-squares-grid">
          {protectedSquares.map((square, index) => {
            const isSelected = selectedProtectionSquares.some(
              s => s.row === square.row && s.col === square.col
            );
            
            return (
              <button
                key={`protection-${index}`}
                className={`protection-square ${isSelected ? 'selected' : ''}`}
                onClick={() => handleProtectionSquareSelect(square)}
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
          disabled={selectedProtectionSquares.length === 0}
          onClick={handleConfirmProtection}
        >
          Confirm Protection
        </button>
        <button className="cancel-btn" onClick={handleCancel}>
          Cancel
        </button>
      </div>

      {selectedProtectionSquares.length > 0 && (
        <div className="selected-summary">
          <h4>Selected Protection Squares:</h4>
          <div className="protection-summary">
            <p><strong>Mode:</strong> {protectionMode}</p>
            <p><strong>Count:</strong> {selectedProtectionSquares.length}</p>
            <ul>
              {selectedProtectionSquares.map((square, index) => (
                <li key={index}>
                  {square.row},{square.col}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
