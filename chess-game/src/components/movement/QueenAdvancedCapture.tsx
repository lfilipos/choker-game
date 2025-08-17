import React, { useState, useEffect } from 'react';
import { Position, PieceType, PieceColor, ChessPiece } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface QueenAdvancedCaptureProps {
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

interface CaptureOption {
  position: Position;
  type: 'standard' | 'through_pawn' | 'royal_teleport';
  description: string;
  path: Position[];
}

export const QueenAdvancedCapture: React.FC<QueenAdvancedCaptureProps> = ({
  piece,
  upgrades,
  board,
  onMoveComplete,
  onCancel
}) => {
  const [selectedCapture, setSelectedCapture] = useState<CaptureOption | null>(null);
  const [captureOptions, setCaptureOptions] = useState<CaptureOption[]>([]);

  // Get all available capture options for the queen
  useEffect(() => {
    const options: CaptureOption[] = [];
    
    // Standard queen moves (diagonal, horizontal, vertical)
    const standardMoves = getStandardQueenMoves();
    options.push(...standardMoves);
    
    // Advanced capture through pawns (Tier 2)
    if (hasTier2Upgrade()) {
      const throughPawnMoves = getThroughPawnMoves();
      options.push(...throughPawnMoves);
    }
    
    // Royal teleport (Tier 3)
    if (hasTier3Upgrade()) {
      const teleportMoves = getRoyalTeleportMoves();
      options.push(...teleportMoves);
    }
    
    setCaptureOptions(options);
  }, [piece.position, board, upgrades]);

  // Check if queen has tier 2 upgrade
  const hasTier2Upgrade = (): boolean => {
    return upgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'advanced_capture')
    );
  };

  // Check if queen has tier 3 upgrade
  const hasTier3Upgrade = (): boolean => {
    return upgrades.some(upgrade => 
      upgrade.tier >= 3 && 
      upgrade.effects.some(effect => effect.value === 'royal_teleport')
    );
  };

  // Get standard queen moves
  const getStandardQueenMoves = (): CaptureOption[] => {
    const options: CaptureOption[] = [];
    const { row, col } = piece.position;
    
    // Check all 8 directions
    const directions = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      const path: Position[] = [];
      
      while (isValidPosition({ row: currentRow, col: currentCol })) {
        const targetPiece = board[currentRow][currentCol];
        
        if (!targetPiece) {
          // Empty square - can move here
          options.push({
            position: { row: currentRow, col: currentCol },
            type: 'standard',
            description: `Move to (${currentRow}, ${currentCol})`,
            path: [...path, { row: currentRow, col: currentCol }]
          });
        } else if (targetPiece.color !== piece.color) {
          // Enemy piece - can capture
          options.push({
            position: { row: currentRow, col: currentCol },
            type: 'standard',
            description: `Capture ${targetPiece.type} at (${currentRow}, ${currentCol})`,
            path: [...path, { row: currentRow, col: currentCol }]
          });
          break; // Can't move past enemy piece
        } else {
          // Allied piece - can't move here
          break;
        }
        
        path.push({ row: currentRow, col: currentCol });
        currentRow += dRow;
        currentCol += dCol;
      }
    });
    
    return options;
  };

  // Get moves that go through pawns (Tier 2)
  const getThroughPawnMoves = (): CaptureOption[] => {
    const options: CaptureOption[] = [];
    const { row, col } = piece.position;
    
    // Check all 8 directions for pawns to jump over
    const directions = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      let pawnFound = false;
      let pawnPosition: Position | null = null;
      const path: Position[] = [];
      
      // Look for a pawn to jump over
      while (isValidPosition({ row: currentRow, col: currentCol })) {
        const targetPiece = board[currentRow][currentCol];
        
        if (!targetPiece) {
          if (pawnFound) {
            // We found a pawn and now have an empty square - can jump here
            options.push({
              position: { row: currentRow, col: currentCol },
              type: 'through_pawn',
              description: `Jump over pawn at (${pawnPosition!.row}, ${pawnPosition!.col}) to (${currentRow}, ${currentCol})`,
              path: [...path, { row: currentRow, col: currentCol }]
            });
          }
        } else if (targetPiece.type === 'pawn' && !pawnFound) {
          // Found a pawn to jump over
          pawnFound = true;
          pawnPosition = { row: currentRow, col: currentCol };
          path.push({ row: currentRow, col: currentCol });
        } else if (targetPiece.color !== piece.color) {
          // Enemy piece - can capture if we jumped over a pawn
          if (pawnFound) {
            options.push({
              position: { row: currentRow, col: currentCol },
              type: 'through_pawn',
              description: `Jump over pawn and capture ${targetPiece.type} at (${currentRow}, ${currentCol})`,
              path: [...path, { row: currentRow, col: currentCol }]
            });
          }
          break;
        } else {
          // Allied piece - can't move here
          break;
        }
        
        currentRow += dRow;
        currentCol += dCol;
      }
    });
    
    return options;
  };

  // Get royal teleport moves (Tier 3)
  const getRoyalTeleportMoves = (): CaptureOption[] => {
    const options: CaptureOption[] = [];
    
    // Royal teleport can move to any empty square on the board
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        if (!board[row][col]) { // Empty square
          options.push({
            position: { row, col },
            type: 'royal_teleport',
            description: `Royal Teleport to (${row}, ${col})`,
            path: [{ row, col }]
          });
        }
      }
    }
    
    return options;
  };

  // Check if position is within board bounds
  const isValidPosition = (pos: Position): boolean => {
    return pos.row >= 0 && pos.row < board.length && 
           pos.col >= 0 && pos.col < board[0].length;
  };

  // Handle capture selection
  const handleCaptureSelect = (captureOption: CaptureOption) => {
    setSelectedCapture(captureOption);
  };

  // Handle capture execution
  const handleExecuteCapture = () => {
    if (!selectedCapture) return;
    
    const moves = [{
      from: piece.position,
      to: selectedCapture.position
    }];
    
    onMoveComplete(moves);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedCapture(null);
    onCancel();
  };

  return (
    <div className="movement-mechanics-overlay">
      <div className="movement-mechanics-panel">
        <h3>Queen Advanced Capture</h3>
        <p>Select your capture move:</p>
        
        <div className="capture-options-list">
          {captureOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleCaptureSelect(option)}
              className={`capture-option-button ${
                selectedCapture === option ? 'selected' : ''
              } ${option.type}`}
            >
              <div className="capture-description">{option.description}</div>
              <div className="capture-type-badge">{option.type.replace('_', ' ')}</div>
            </button>
          ))}
        </div>

        {captureOptions.length === 0 && (
          <p className="no-moves-message">No valid capture moves available.</p>
        )}
        
        {selectedCapture && (
          <div className="capture-preview">
            <h4>Selected Move</h4>
            <p>{selectedCapture.description}</p>
            <p>Type: {selectedCapture.type.replace('_', ' ')}</p>
            
            <div className="action-buttons">
              <button 
                onClick={handleExecuteCapture} 
                className="execute-capture-button"
              >
                Execute Capture
              </button>
              <button onClick={handleCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {!selectedCapture && (
          <button onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
