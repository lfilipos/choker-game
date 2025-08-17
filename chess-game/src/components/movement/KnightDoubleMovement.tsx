import React, { useState, useEffect } from 'react';
import { Position, PieceType, PieceColor, ChessPiece } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface KnightDoubleMovementProps {
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

interface MoveOption {
  from: Position;
  to: Position;
  description: string;
}

export const KnightDoubleMovement: React.FC<KnightDoubleMovementProps> = ({
  piece,
  upgrades,
  board,
  onMoveComplete,
  onCancel
}) => {
  const [firstMove, setFirstMove] = useState<Position | null>(null);
  const [secondMoveOptions, setSecondMoveOptions] = useState<MoveOption[]>([]);
  const [currentPhase, setCurrentPhase] = useState<'first' | 'second'>('first');

  // Get valid first move options for knight
  const getFirstMoveOptions = (): Position[] => {
    const options: Position[] = [];
    const { row, col } = piece.position;
    
    // Standard knight L-shaped moves
    const knightMoves = [
      { row: row - 2, col: col - 1 }, { row: row - 2, col: col + 1 },
      { row: row - 1, col: col - 2 }, { row: row - 1, col: col + 2 },
      { row: row + 1, col: col - 2 }, { row: row + 1, col: col + 2 },
      { row: row + 2, col: col - 1 }, { row: row + 2, col: col + 1 }
    ];
    
    knightMoves.forEach(move => {
      if (isValidPosition(move) && isValidTarget(move)) {
        options.push(move);
      }
    });
    
    return options;
  };

  // Get valid second move options from a position
  const getSecondMoveOptions = (fromPosition: Position): MoveOption[] => {
    const options: MoveOption[] = [];
    const { row, col } = fromPosition;
    
    // Standard knight L-shaped moves from the new position
    const knightMoves = [
      { row: row - 2, col: col - 1 }, { row: row - 2, col: col + 1 },
      { row: row - 1, col: col - 2 }, { row: row - 1, col: col + 2 },
      { row: row + 1, col: col - 2 }, { row: row + 1, col: col + 2 },
      { row: row + 2, col: col - 1 }, { row: row + 2, col: col + 1 }
    ];
    
    knightMoves.forEach(move => {
      if (isValidPosition(move) && isValidTarget(move)) {
        options.push({
          from: fromPosition,
          to: move,
          description: `Move to (${move.row}, ${move.col})`
        });
      }
    });
    
    return options;
  };

  // Check if position is within board bounds
  const isValidPosition = (pos: Position): boolean => {
    return pos.row >= 0 && pos.row < board.length && 
           pos.col >= 0 && pos.col < board[0].length;
  };

  // Check if target position is valid (empty or enemy piece)
  const isValidTarget = (pos: Position): boolean => {
    const targetPiece = board[pos.row][pos.col];
    return !targetPiece || targetPiece.color !== piece.color;
  };

  // Handle first move selection
  const handleFirstMoveSelect = (targetPosition: Position) => {
    setFirstMove(targetPosition);
    const secondOptions = getSecondMoveOptions(targetPosition);
    setSecondMoveOptions(secondOptions);
    setCurrentPhase('second');
  };

  // Handle second move selection
  const handleSecondMoveSelect = (moveOption: MoveOption) => {
    const moves = [
      { from: piece.position, to: firstMove! },
      { from: firstMove!, to: moveOption.to }
    ];
    onMoveComplete(moves);
  };

  // Handle cancel
  const handleCancel = () => {
    setFirstMove(null);
    setSecondMoveOptions([]);
    setCurrentPhase('first');
    onCancel();
  };

  // Handle back to first move
  const handleBackToFirst = () => {
    setFirstMove(null);
    setSecondMoveOptions([]);
    setCurrentPhase('first');
  };

  const firstMoveOptions = getFirstMoveOptions();

  if (currentPhase === 'first') {
    return (
      <div className="movement-mechanics-overlay">
        <div className="movement-mechanics-panel">
          <h3>Knight Double Movement</h3>
          <p>Select your first move:</p>
          
          <div className="move-options-grid">
            {firstMoveOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => handleFirstMoveSelect(option)}
                className="move-option-button"
              >
                Move to ({option.row}, {option.col})
              </button>
            ))}
          </div>

          {firstMoveOptions.length === 0 && (
            <p className="no-moves-message">No valid first moves available.</p>
          )}
          
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
        <h3>Knight Double Movement</h3>
        <p>First move: ({piece.position.row}, {piece.position.col}) → ({firstMove!.row}, {firstMove!.col})</p>
        <p>Now select your second move:</p>
        
        <div className="move-options-grid">
          {secondMoveOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSecondMoveSelect(option)}
              className="move-option-button"
            >
              {option.description}
            </button>
          ))}
        </div>

        {secondMoveOptions.length === 0 && (
          <p className="no-moves-message">No valid second moves available from this position.</p>
        )}
        
        <div className="action-buttons">
          <button onClick={handleBackToFirst} className="back-button">
            Back to First Move
          </button>
          <button onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
