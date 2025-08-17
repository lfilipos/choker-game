import React, { useState, useEffect } from 'react';
import { Position, PieceType, PieceColor, ChessPiece } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface RookLinkingMechanicsProps {
  piece: {
    type: PieceType;
    color: PieceColor;
    position: Position;
  };
  upgrades: TieredUpgradeDefinition[];
  board: (ChessPiece | null)[][];
  onMoveComplete: (moves: { from: Position; to: Position }[]) => void;
  onCancel: () => void;
}

interface LinkedRook {
  position: Position;
  distance: number;
}

export const RookLinkingMechanics: React.FC<RookLinkingMechanicsProps> = ({
  piece,
  upgrades,
  board,
  onMoveComplete,
  onCancel
}) => {
  const [selectedLinkedRook, setSelectedLinkedRook] = useState<LinkedRook | null>(null);
  const [wallPositions, setWallPositions] = useState<Position[]>([]);
  const [availableLinkedRooks, setAvailableLinkedRooks] = useState<LinkedRook[]>([]);

  // Find available rooks that can be linked with
  useEffect(() => {
    if (!piece.position) return;

    const linkedRooks: LinkedRook[] = [];
    const maxDistance = upgrades.some(upgrade => 
      upgrade.tier >= 3 && upgrade.effects.some(effect => effect.value === 'extended_rook_linking')
    ) ? 3 : 2;

    // Search for rooks within the maximum distance
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const targetPiece = board[row][col];
        if (targetPiece && 
            targetPiece.type === 'rook' && 
            targetPiece.color === piece.color &&
            (row !== piece.position.row || col !== piece.position.col)) {
          
          const distance = Math.max(
            Math.abs(row - piece.position.row),
            Math.abs(col - piece.position.col)
          );
          
          if (distance <= maxDistance && isPathClear(piece.position, { row, col })) {
            linkedRooks.push({ position: { row, col }, distance });
          }
        }
      }
    }

    setAvailableLinkedRooks(linkedRooks);
  }, [piece.position, board, piece.color, upgrades]);

  // Check if path between rooks is clear
  const isPathClear = (from: Position, to: Position): boolean => {
    const minRow = Math.min(from.row, to.row);
    const maxRow = Math.max(from.row, to.row);
    const minCol = Math.min(from.col, to.col);
    const maxCol = Math.max(from.col, to.col);

    // Check if rooks are in same row
    if (from.row === to.row) {
      for (let col = minCol + 1; col < maxCol; col++) {
        if (board[from.row][col]) return false;
      }
      return true;
    }

    // Check if rooks are in same column
    if (from.col === to.col) {
      for (let row = minRow + 1; row < maxRow; row++) {
        if (board[row][from.col]) return false;
      }
      return true;
    }

    return false; // Rooks must be in same row or column
  };

  // Calculate wall positions between two rooks
  const calculateWallPositions = (rook1: Position, rook2: Position): Position[] => {
    const wallPositions: Position[] = [];
    
    // If rooks are in same row, create horizontal wall
    if (rook1.row === rook2.row) {
      const minCol = Math.min(rook1.col, rook2.col);
      const maxCol = Math.max(rook1.col, rook2.col);
      
      for (let col = minCol + 1; col < maxCol; col++) {
        wallPositions.push({ row: rook1.row, col });
      }
    }
    
    // If rooks are in same column, create vertical wall
    if (rook1.col === rook2.col) {
      const minRow = Math.min(rook1.row, rook2.row);
      const maxRow = Math.max(rook1.row, rook2.row);
      
      for (let row = minRow + 1; row < maxRow; row++) {
        wallPositions.push({ row, col: rook1.col });
      }
    }
    
    return wallPositions;
  };

  // Handle linked rook selection
  const handleLinkedRookSelect = (linkedRook: LinkedRook) => {
    setSelectedLinkedRook(linkedRook);
    const wallPos = calculateWallPositions(piece.position, linkedRook.position);
    setWallPositions(wallPos);
  };

  // Handle wall creation
  const handleCreateWall = () => {
    if (!selectedLinkedRook) return;
    
    // Create moves for the wall creation
    const moves = wallPositions.map(wallPos => ({
      from: piece.position,
      to: wallPos
    }));
    
    onMoveComplete(moves);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedLinkedRook(null);
    setWallPositions([]);
    onCancel();
  };

  if (availableLinkedRooks.length === 0) {
    return (
      <div className="movement-mechanics-overlay">
        <div className="movement-mechanics-panel">
          <h3>Rook Linking</h3>
          <p>No rooks available for linking within range.</p>
          <button onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="movement-mechanics-overlay">
      <div className="movement-mechanics-panel">
        <h3>Rook Linking</h3>
        <p>Select a rook to link with and create a wall:</p>
        
        <div className="linked-rooks-list">
          {availableLinkedRooks.map((linkedRook, index) => (
            <button
              key={index}
              onClick={() => handleLinkedRookSelect(linkedRook)}
              className={`linked-rook-button ${
                selectedLinkedRook === linkedRook ? 'selected' : ''
              }`}
            >
              Rook at ({linkedRook.position.row}, {linkedRook.position.col})
              <span className="distance-badge">
                {linkedRook.distance} square{linkedRook.distance !== 1 ? 's' : ''}
              </span>
            </button>
          ))}
        </div>
        
        <button onClick={handleCancel} className="cancel-button">
          Cancel
        </button>

        {selectedLinkedRook && (
          <div className="wall-creation">
            <h4>Wall Creation</h4>
            <p>Creating wall between rooks at:</p>
            <ul>
              <li>Selected rook: ({piece.position.row}, {piece.position.col})</li>
              <li>Linked rook: ({selectedLinkedRook.position.row}, {selectedLinkedRook.position.col})</li>
            </ul>
            
            {wallPositions.length > 0 && (
              <div className="wall-positions">
                <p>Wall will be created at:</p>
                <div className="wall-squares">
                  {wallPositions.map((pos, index) => (
                    <span key={index} className="wall-square">
                      ({pos.row}, {pos.col})
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="action-buttons">
              <button 
                onClick={handleCreateWall} 
                className="create-wall-button"
                disabled={wallPositions.length === 0}
              >
                Create Wall
              </button>
              <button onClick={handleCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
