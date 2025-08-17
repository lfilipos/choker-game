import React, { useState, useEffect } from 'react';
import { Position, PieceType, PieceColor, ChessPiece } from '../../types';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import { DualMoveSelector } from './DualMoveSelector';
import { KnightAdjacentMovement } from './KnightAdjacentMovement';
import { BishopOrthogonalMovement } from './BishopOrthogonalMovement';
import { RookProtectionMechanics } from './RookProtectionMechanics';
import { QueenExtendedMovement } from './QueenExtendedMovement';
import { KingEnhancedMovement } from './KingEnhancedMovement';
import { RookLinkingMechanics } from './RookLinkingMechanics';
import { KnightDoubleMovement } from './KnightDoubleMovement';
import { QueenAdvancedCapture } from './QueenAdvancedCapture';
import { KingPieceManipulation } from './KingPieceManipulation';
import './MovementMechanics.css';

interface MovementMechanicsProps {
  selectedPiece: ChessPiece | null;
  piecePosition: Position | null;
  upgrades: TieredUpgradeDefinition[];
  board: (ChessPiece | null)[][];
  onMoveComplete: (moves: { from: Position; to: Position }[]) => void;
  onCancel: () => void;
}

export const MovementMechanics: React.FC<MovementMechanicsProps> = ({
  selectedPiece,
  piecePosition,
  upgrades,
  board,
  onMoveComplete,
  onCancel
}) => {
  const [currentMechanic, setCurrentMechanic] = useState<string | null>(null);

  // Determine which movement mechanic to show based on piece type and upgrades
  useEffect(() => {
    if (!selectedPiece || !piecePosition) {
      setCurrentMechanic(null);
      return;
    }

    const pieceUpgrades = upgrades.filter(upgrade => upgrade.pieceType === selectedPiece.type);
    
    // Check for specific upgrade effects (Priority: Complex -> Medium -> Simple)
    
    // Complex Mechanics (Tier 2-3) - HIGHEST PRIORITY
    const hasRookLinking = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'rook_linking' || effect.value === 'extended_rook_linking')
    );
    
    const hasKnightDoubleMove = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 3 && 
      upgrade.effects.some(effect => effect.value === 'double_movement')
    );
    
    const hasQueenAdvancedCapture = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'advanced_capture' || effect.value === 'royal_teleport')
    );
    
    const hasKingManipulation = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'piece_swap' || effect.value === 'royal_command')
    );

    // Medium Complexity Mechanics (Tier 2+)
    const hasProtectionMechanics = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'protection')
    );
    
    const hasExtendedMovement = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'extended_movement')
    );
    
    const hasEnhancedMovement = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 2 && 
      upgrade.effects.some(effect => effect.value === 'enhanced_movement')
    );

    // Simple Mechanics (Tier 1-3)
    const hasDualMove = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 3 && 
      upgrade.effects.some(effect => effect.value === 'dual_move')
    );
    
    const hasAdjacentMovement = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 1 && 
      upgrade.effects.some(effect => effect.value === 'adjacent')
    );
    
    const hasOrthogonalMovement = pieceUpgrades.some(upgrade => 
      upgrade.tier >= 1 && 
      upgrade.effects.some(effect => effect.value === 'orthogonal')
    );

    // Set the appropriate mechanic (priority order: Complex -> Medium -> Simple)
    if (hasRookLinking && selectedPiece.type === 'rook') {
      setCurrentMechanic('rook_linking');
    } else if (hasKnightDoubleMove && selectedPiece.type === 'knight') {
      setCurrentMechanic('knight_double');
    } else if (hasQueenAdvancedCapture && selectedPiece.type === 'queen') {
      setCurrentMechanic('queen_advanced_capture');
    } else if (hasKingManipulation && selectedPiece.type === 'king') {
      setCurrentMechanic('king_manipulation');
    } else if (hasProtectionMechanics && selectedPiece.type === 'rook') {
      setCurrentMechanic('protection');
    } else if (hasExtendedMovement && selectedPiece.type === 'queen') {
      setCurrentMechanic('extended');
    } else if (hasEnhancedMovement && selectedPiece.type === 'king') {
      setCurrentMechanic('enhanced');
    } else if (hasDualMove && selectedPiece.type === 'pawn') {
      setCurrentMechanic('dual_move');
    } else if (hasAdjacentMovement && selectedPiece.type === 'knight') {
      setCurrentMechanic('adjacent');
    } else if (hasOrthogonalMovement && selectedPiece.type === 'bishop') {
      setCurrentMechanic('orthogonal');
    } else {
      setCurrentMechanic(null);
    }
  }, [selectedPiece, piecePosition, upgrades]);

  // Get available pawns for dual movement
  const getAvailablePawns = (): Position[] => {
    if (selectedPiece?.type !== 'pawn' || !piecePosition) return [];
    
    const pawns: Position[] = [];
    board.forEach((row, rowIndex) => {
      row.forEach((piece, colIndex) => {
        if (piece && piece.type === 'pawn' && piece.color === selectedPiece.color) {
          pawns.push({ row: rowIndex, col: colIndex });
        }
      });
    });
    
    return pawns.filter(pawn => 
      pawn.row !== piecePosition.row || pawn.col !== piecePosition.col
    );
  };

  // Get adjacent squares for knight movement
  const getAdjacentSquares = (): Position[] => {
    if (selectedPiece?.type !== 'knight' || !piecePosition) return [];
    
    const { row, col } = piecePosition;
    const adjacent: Position[] = [];
    
    // Check all 8 adjacent squares
    for (let dRow = -1; dRow <= 1; dRow++) {
      for (let dCol = -1; dCol <= 1; dCol++) {
        if (dRow === 0 && dCol === 0) continue; // Skip current position
        
        const newRow = row + dRow;
        const newCol = col + dCol;
        
        if (newRow >= 0 && newRow < board.length && 
            newCol >= 0 && newCol < board[0].length) {
          const targetPiece = board[newRow][newCol];
          if (!targetPiece || targetPiece.color !== selectedPiece.color) {
            adjacent.push({ row: newRow, col: newCol });
          }
        }
      }
    }
    
    return adjacent;
  };

  // Get orthogonal squares for bishop movement
  const getOrthogonalSquares = (): Position[] => {
    if (selectedPiece?.type !== 'bishop' || !piecePosition) return [];
    
    const { row, col } = piecePosition;
    const orthogonal: Position[] = [];
    
    // Check horizontal and vertical directions
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      
      while (currentRow >= 0 && currentRow < board.length && 
             currentCol >= 0 && currentCol < board[0].length) {
        const targetPiece = board[currentRow][currentCol];
        if (!targetPiece || targetPiece.color !== selectedPiece.color) {
          orthogonal.push({ row: currentRow, col: currentCol });
        }
        if (targetPiece) break; // Can't move past pieces
        
        currentRow += dRow;
        currentCol += dCol;
      }
    });
    
    return orthogonal;
  };

  // Get protection squares for rook mechanics
  const getProtectionSquares = (): Position[] => {
    if (selectedPiece?.type !== 'rook' || !piecePosition) return [];
    
    const { row, col } = piecePosition;
    const protectionSquares: Position[] = [];
    
    // Check squares behind the rook in all directions
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      
      while (currentRow >= 0 && currentRow < board.length && 
             currentCol >= 0 && currentCol < board[0].length) {
        const targetPiece = board[currentRow][currentCol];
        if (targetPiece && targetPiece.color === selectedPiece.color) {
          // Found an allied piece to protect
          protectionSquares.push({ row: currentRow, col: currentCol });
        }
        if (targetPiece) break; // Can't protect through pieces
        
        currentRow += dRow;
        currentCol += dCol;
      }
    });
    
    return protectionSquares;
  };

  // Get extended movement squares for queen
  const getExtendedSquares = (): Position[] => {
    if (selectedPiece?.type !== 'queen' || !piecePosition) return [];
    
    const { row, col } = piecePosition;
    const extended: Position[] = [];
    
    // Check all 8 directions with extended range
    const directions = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      let range = 0;
      const maxRange = 3; // Extended range
      
      while (range < maxRange && 
             currentRow >= 0 && currentRow < board.length && 
             currentCol >= 0 && currentCol < board[0].length) {
        const targetPiece = board[currentRow][currentCol];
        if (!targetPiece || targetPiece.color !== selectedPiece.color) {
          extended.push({ row: currentRow, col: currentCol });
        }
        if (targetPiece) break; // Can't move past pieces
        
        currentRow += dRow;
        currentCol += dCol;
        range++;
      }
    });
    
    return extended;
  };

  // Get enhanced movement squares for king
  const getEnhancedSquares = (): Position[] => {
    if (selectedPiece?.type !== 'king' || !piecePosition) return [];
    
    const { row, col } = piecePosition;
    const enhanced: Position[] = [];
    
    // Check all 8 directions with enhanced range
    const directions = [
      [-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]
    ];
    
    directions.forEach(([dRow, dCol]) => {
      let currentRow = row + dRow;
      let currentCol = col + dCol;
      let range = 0;
      const maxRange = 2; // Enhanced range (2 squares)
      
      while (range < maxRange && 
             currentRow >= 0 && currentRow < board.length && 
             currentCol >= 0 && currentCol < board[0].length) {
        const targetPiece = board[currentRow][currentCol];
        if (!targetPiece || targetPiece.color !== selectedPiece.color) {
          enhanced.push({ row: currentRow, col: currentCol });
        }
        if (targetPiece) break; // Can't move past pieces
        
        currentRow += dRow;
        currentCol += dCol;
        range++;
      }
    });
    
    return enhanced;
  };

  // Handle move completion for different mechanics
  const handleMoveComplete = (moves: { from: Position; to: Position }[]) => {
    onMoveComplete(moves);
    setCurrentMechanic(null);
  };

  // Handle protection completion for rook mechanics
  const handleProtectionComplete = (protectedSquares: Position[]) => {
    // Convert protection to move format for consistency
    const moves = protectedSquares.map(square => ({
      from: piecePosition!,
      to: square
    }));
    onMoveComplete(moves);
    setCurrentMechanic(null);
  };

  // Handle extended movement completion for queen
  const handleExtendedMovementComplete = (movement: { from: Position; to: Position; type: string }) => {
    onMoveComplete([{ from: movement.from, to: movement.to }]);
    setCurrentMechanic(null);
  };

  // Handle enhanced movement completion for king
  const handleEnhancedMovementComplete = (movement: { from: Position; to: Position; type: string; special?: string }) => {
    onMoveComplete([{ from: movement.from, to: movement.to }]);
    setCurrentMechanic(null);
  };

  // Handle cancellation
  const handleCancel = () => {
    setCurrentMechanic(null);
    onCancel();
  };

  // Don't render anything if no piece is selected or no mechanic is available
  if (!selectedPiece || !piecePosition || !currentMechanic) {
    return null;
  }

  // Render the appropriate movement mechanic component
  switch (currentMechanic) {
    case 'rook_linking':
      return (
        <RookLinkingMechanics
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          board={board}
          onMoveComplete={handleMoveComplete}
          onCancel={handleCancel}
        />
      );

    case 'knight_double':
      return (
        <KnightDoubleMovement
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          board={board}
          onMoveComplete={handleMoveComplete}
          onCancel={handleCancel}
        />
      );

    case 'queen_advanced_capture':
      return (
        <QueenAdvancedCapture
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          board={board}
          onMoveComplete={handleMoveComplete}
          onCancel={handleCancel}
        />
      );

    case 'king_manipulation':
      return (
        <KingPieceManipulation
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          board={board}
          onMoveComplete={handleMoveComplete}
          onCancel={handleCancel}
        />
      );

    case 'dual_move':
      return (
        <DualMoveSelector
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          availablePawns={getAvailablePawns()}
          onMoveComplete={handleMoveComplete}
          onCancel={handleCancel}
        />
      );

    case 'adjacent':
      return (
        <KnightAdjacentMovement
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          adjacentSquares={getAdjacentSquares()}
          onMoveComplete={(move) => handleMoveComplete([move])}
          onCancel={handleCancel}
        />
      );

    case 'orthogonal':
      return (
        <BishopOrthogonalMovement
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          orthogonalSquares={getOrthogonalSquares()}
          onMoveComplete={(move) => handleMoveComplete([move])}
          onCancel={handleCancel}
        />
      );

    case 'protection':
      return (
        <RookProtectionMechanics
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          protectedSquares={getProtectionSquares()}
          onProtectionComplete={handleProtectionComplete}
          onCancel={handleCancel}
        />
      );

    case 'extended':
      return (
        <QueenExtendedMovement
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          extendedSquares={getExtendedSquares()}
          onMovementComplete={handleExtendedMovementComplete}
          onCancel={handleCancel}
        />
      );

    case 'enhanced':
      return (
        <KingEnhancedMovement
          piece={{
            type: selectedPiece.type,
            color: selectedPiece.color,
            position: piecePosition
          }}
          upgrades={upgrades}
          enhancedSquares={getEnhancedSquares()}
          onMovementComplete={handleEnhancedMovementComplete}
          onCancel={handleCancel}
        />
      );

    default:
      return null;
  }
};
