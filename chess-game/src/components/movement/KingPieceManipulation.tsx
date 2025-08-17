import React, { useState, useEffect } from 'react';
import { Position, PieceType, PieceColor, ChessPiece } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import './MovementMechanics.css';

interface KingPieceManipulationProps {
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

interface ManipulationOption {
  type: 'piece_swap' | 'royal_command';
  targetPiece: ChessPiece;
  targetPosition: Position;
  description: string;
  available: boolean;
}

export const KingPieceManipulation: React.FC<KingPieceManipulationProps> = ({
  piece,
  upgrades,
  board,
  onMoveComplete,
  onCancel
}) => {
  const [selectedOption, setSelectedOption] = useState<ManipulationOption | null>(null);
  const [manipulationOptions, setManipulationOptions] = useState<ManipulationOption[]>([]);

  // Get all available manipulation options for the king
  useEffect(() => {
    const options: ManipulationOption[] = [];
    
    // Piece swap (Tier 2)
    if (hasTier2Upgrade()) {
      const swapOptions = getPieceSwapOptions();
      options.push(...swapOptions);
    }
    
    // Royal command (Tier 3)
    if (hasTier3Upgrade()) {
      const commandOptions = getRoyalCommandOptions();
      options.push(...commandOptions);
    }
    
    setManipulationOptions(options);
  }, [piece.position, board, upgrades]);

  // Check if king has tier 2 upgrade
  const hasTier2Upgrade = (): boolean => {
    return upgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'piece_swap')
    );
  };

  // Check if king has tier 3 upgrade
  const hasTier3Upgrade = (): boolean => {
    return upgrades.some(upgrade => 
      upgrade.tier >= 3 && 
      upgrade.effects.some(effect => effect.value === 'royal_command')
    );
  };

  // Get piece swap options (Tier 2)
  const getPieceSwapOptions = (): ManipulationOption[] => {
    const options: ManipulationOption[] = [];
    const { row, col } = piece.position;
    
    // Check adjacent squares for allied pieces to swap with
    const adjacentPositions = [
      { row: row - 1, col: col - 1 }, { row: row - 1, col: col }, { row: row - 1, col: col + 1 },
      { row: row, col: col - 1 }, { row: row, col: col + 1 },
      { row: row + 1, col: col - 1 }, { row: row + 1, col: col }, { row: row + 1, col: col + 1 }
    ];
    
    adjacentPositions.forEach(pos => {
      if (isValidPosition(pos)) {
        const targetPiece = board[pos.row][pos.col];
        if (targetPiece && 
            targetPiece.color === piece.color && 
            targetPiece.type !== 'king') {
          options.push({
            type: 'piece_swap',
            targetPiece,
            targetPosition: pos,
            description: `Swap with ${targetPiece.type} at (${pos.row}, ${pos.col})`,
            available: true
          });
        }
      }
    });
    
    return options;
  };

  // Get royal command options (Tier 3)
  const getRoyalCommandOptions = (): ManipulationOption[] => {
    const options: ManipulationOption[] = [];
    const { row, col } = piece.position;
    
    // Check adjacent squares for allied pieces to command
    const adjacentPositions = [
      { row: row - 1, col: col - 1 }, { row: row - 1, col: col }, { row: row - 1, col: col + 1 },
      { row: row, col: col - 1 }, { row: row, col: col + 1 },
      { row: row + 1, col: col - 1 }, { row: row + 1, col: col }, { row: row + 1, col: col + 1 }
    ];
    
    adjacentPositions.forEach(pos => {
      if (isValidPosition(pos)) {
        const targetPiece = board[pos.row][pos.col];
        if (targetPiece && targetPiece.color === piece.color) {
          // Find available adjacent squares to move the commanded piece to
          const availableMoves = getAvailableMovesForPiece(targetPiece, pos);
          
          if (availableMoves.length > 0) {
            options.push({
              type: 'royal_command',
              targetPiece,
              targetPosition: pos,
              description: `Command ${targetPiece.type} at (${pos.row}, ${pos.col}) - ${availableMoves.length} moves available`,
              available: true
            });
          }
        }
      }
    });
    
    return options;
  };

  // Get available moves for a commanded piece
  const getAvailableMovesForPiece = (targetPiece: ChessPiece, currentPos: Position): Position[] => {
    const moves: Position[] = [];
    const { row, col } = currentPos;
    
    // Get moves based on piece type
    switch (targetPiece.type) {
      case 'pawn':
        // Pawns can move forward or diagonally for capture
        const direction = targetPiece.color === 'white' ? -1 : 1;
        const forwardPos = { row: row + direction, col };
        const diagonalLeft = { row: row + direction, col: col - 1 };
        const diagonalRight = { row: row + direction, col: col + 1 };
        
        if (isValidPosition(forwardPos) && !board[forwardPos.row][forwardPos.col]) {
          moves.push(forwardPos);
        }
        
        [diagonalLeft, diagonalRight].forEach(diagPos => {
          if (isValidPosition(diagPos)) {
            const target = board[diagPos.row][diagPos.col];
            if (target && target.color !== targetPiece.color) {
              moves.push(diagPos);
            }
          }
        });
        break;
        
      case 'rook':
        // Rooks can move horizontally and vertically
        const rookDirections = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        rookDirections.forEach(([dRow, dCol]) => {
          let currentRow = row + dRow;
          let currentCol = col + dCol;
          
          while (isValidPosition({ row: currentRow, col: currentCol })) {
            const target = board[currentRow][currentCol];
            if (!target) {
              moves.push({ row: currentRow, col: currentCol });
            } else if (target.color !== targetPiece.color) {
              moves.push({ row: currentRow, col: currentCol });
              break;
            } else {
              break;
            }
            currentRow += dRow;
            currentCol += dCol;
          }
        });
        break;
        
      case 'knight':
        // Knights can move in L-shape
        const knightMoves = [
          { row: row - 2, col: col - 1 }, { row: row - 2, col: col + 1 },
          { row: row - 1, col: col - 2 }, { row: row - 1, col: col + 2 },
          { row: row + 1, col: col - 2 }, { row: row + 1, col: col + 2 },
          { row: row + 2, col: col - 1 }, { row: row + 2, col: col + 1 }
        ];
        
        knightMoves.forEach(move => {
          if (isValidPosition(move)) {
            const target = board[move.row][move.col];
            if (!target || target.color !== targetPiece.color) {
              moves.push(move);
            }
          }
        });
        break;
        
      case 'bishop':
        // Bishops can move diagonally
        const bishopDirections = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        bishopDirections.forEach(([dRow, dCol]) => {
          let currentRow = row + dRow;
          let currentCol = col + dCol;
          
          while (isValidPosition({ row: currentRow, col: currentCol })) {
            const target = board[currentRow][currentCol];
            if (!target) {
              moves.push({ row: currentRow, col: currentCol });
            } else if (target.color !== targetPiece.color) {
              moves.push({ row: currentRow, col: currentCol });
              break;
            } else {
              break;
            }
            currentRow += dRow;
            currentCol += dCol;
          }
        });
        break;
        
      case 'queen':
        // Queens can move in all directions
        const queenDirections = [
          [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
        ];
        queenDirections.forEach(([dRow, dCol]) => {
          let currentRow = row + dRow;
          let currentCol = col + dCol;
          
          while (isValidPosition({ row: currentRow, col: currentCol })) {
            const target = board[currentRow][currentCol];
            if (!target) {
              moves.push({ row: currentRow, col: currentCol });
            } else if (target.color !== targetPiece.color) {
              moves.push({ row: currentRow, col: currentCol });
              break;
            } else {
              break;
            }
            currentRow += dRow;
            currentCol += dCol;
          }
        });
        break;
    }
    
    return moves;
  };

  // Check if position is within board bounds
  const isValidPosition = (pos: Position): boolean => {
    return pos.row >= 0 && pos.row < board.length && 
           pos.col >= 0 && pos.col < board[0].length;
  };

  // Handle option selection
  const handleOptionSelect = (option: ManipulationOption) => {
    setSelectedOption(option);
  };

  // Handle manipulation execution
  const handleExecuteManipulation = () => {
    if (!selectedOption) return;
    
    let moves: { from: Position; to: Position }[] = [];
    
    if (selectedOption.type === 'piece_swap') {
      // For piece swap, we need to swap the positions
      moves = [
        { from: piece.position, to: selectedOption.targetPosition },
        { from: selectedOption.targetPosition, to: piece.position }
      ];
    } else if (selectedOption.type === 'royal_command') {
      // For royal command, we need to select where to move the commanded piece
      // This would require additional UI for move selection
      // For now, we'll just move the king to the target position
      moves = [{
        from: piece.position,
        to: selectedOption.targetPosition
      }];
    }
    
    onMoveComplete(moves);
  };

  // Handle cancel
  const handleCancel = () => {
    setSelectedOption(null);
    onCancel();
  };

  return (
    <div className="movement-mechanics-overlay">
      <div className="movement-mechanics-panel">
        <h3>King Piece Manipulation</h3>
        <p>Select your manipulation action:</p>
        
        <div className="manipulation-options-list">
          {manipulationOptions.map((option, index) => (
            <button
              key={index}
              onClick={() => handleOptionSelect(option)}
              className={`manipulation-option-button ${
                selectedOption === option ? 'selected' : ''
              } ${option.type}`}
              disabled={!option.available}
            >
              <div className="manipulation-description">{option.description}</div>
              <div className="manipulation-type-badge">{option.type.replace('_', ' ')}</div>
            </button>
          ))}
        </div>

        {manipulationOptions.length === 0 && (
          <p className="no-moves-message">No manipulation options available.</p>
        )}
        
        {selectedOption && (
          <div className="manipulation-preview">
            <h4>Selected Action</h4>
            <p>{selectedOption.description}</p>
            <p>Type: {selectedOption.type.replace('_', ' ')}</p>
            <p>Target: {selectedOption.targetPiece.type} at ({selectedOption.targetPosition.row}, {selectedOption.targetPosition.col})</p>
            
            <div className="action-buttons">
              <button 
                onClick={handleExecuteManipulation} 
                className="execute-manipulation-button"
              >
                Execute {selectedOption.type.replace('_', ' ')}
              </button>
              <button onClick={handleCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}
        
        {!selectedOption && (
          <button onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
