import React, { useState } from 'react';
import { Position, PieceType, PieceColor } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface DualMoveSelectorProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  availablePawns: Position[];
  onMoveComplete: (moves: { from: Position; to: Position }[]) => void;
  onCancel: () => void;
}

export const DualMoveSelector: React.FC<DualMoveSelectorProps> = ({
  piece,
  upgrades,
  availablePawns,
  onMoveComplete,
  onCancel
}) => {
  const [selectedPawns, setSelectedPawns] = useState<Position[]>([]);
  const [selectedDestinations, setSelectedDestinations] = useState<Position[]>([]);

  // Check if this piece has the dual movement upgrade
  const hasDualUpgrade = upgrades.some(upgrade => 
    upgrade.pieceType === piece.type && 
    upgrade.tier >= 3 && 
    upgrade.effects.some(effect => effect.value === 'dual_move')
  );

  if (!hasDualUpgrade) {
    return null;
  }

  const handlePawnSelect = (pawnPosition: Position) => {
    if (selectedPawns.length < 2 && !selectedPawns.some(p => p.row === pawnPosition.row && p.col === pawnPosition.col)) {
      setSelectedPawns([...selectedPawns, pawnPosition]);
    }
  };

  const handleDestinationSelect = (destination: Position) => {
    if (selectedDestinations.length < 2 && !selectedDestinations.some(d => d.row === destination.row && d.col === destination.col)) {
      setSelectedDestinations([...selectedDestinations, destination]);
    }
  };

  const handleConfirmMoves = () => {
    if (selectedPawns.length === 2 && selectedDestinations.length === 2) {
      const moves = selectedPawns.map((pawn, index) => ({
        from: pawn,
        to: selectedDestinations[index]
      }));
      onMoveComplete(moves);
    }
  };

  const canConfirm = selectedPawns.length === 2 && selectedDestinations.length === 2;

  return (
    <div className="dual-move-selector">
      <div className="selector-header">
        <h3>Dual Pawn Movement</h3>
        <p>Select two pawns and their destinations</p>
      </div>

      <div className="selection-section">
        <h4>Select Pawns ({selectedPawns.length}/2)</h4>
        <div className="pawn-grid">
          {availablePawns.map((pawnPos, index) => {
            const isSelected = selectedPawns.some(p => p.row === pawnPos.row && p.col === pawnPos.col);
            return (
              <button
                key={`pawn-${index}`}
                className={`pawn-selector ${isSelected ? 'selected' : ''}`}
                onClick={() => handlePawnSelect(pawnPos)}
                disabled={selectedPawns.length >= 2 && !isSelected}
              >
                ♟ {pawnPos.row},{pawnPos.col}
              </button>
            );
          })}
        </div>
      </div>

      <div className="selection-section">
        <h4>Select Destinations ({selectedDestinations.length}/2)</h4>
        <div className="destination-grid">
          {/* This would be populated with valid destination squares */}
          <button
            className="destination-selector"
            onClick={() => handleDestinationSelect({ row: 0, col: 0 })}
          >
            a10
          </button>
          <button
            className="destination-selector"
            onClick={() => handleDestinationSelect({ row: 0, col: 1 })}
          >
            b10
          </button>
          {/* Add more destination options based on valid moves */}
        </div>
      </div>

      <div className="selector-actions">
        <button 
          className="confirm-btn"
          disabled={!canConfirm}
          onClick={handleConfirmMoves}
        >
          Confirm Moves
        </button>
        <button className="cancel-btn" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {selectedPawns.length > 0 && (
        <div className="selected-summary">
          <h4>Selected Pawns:</h4>
          <ul>
            {selectedPawns.map((pawn, index) => (
              <li key={index}>
                Pawn at {pawn.row},{pawn.col} → {selectedDestinations[index] ? `${selectedDestinations[index].row},${selectedDestinations[index].col}` : 'No destination'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
