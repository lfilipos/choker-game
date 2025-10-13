import React from 'react';
import { Board, Position, ControlZone, RookLink } from '../types';
import { UpgradeState } from '../types/upgrades';
import { ChessSquare } from './ChessSquare';
import { MoveArrow } from './MoveArrow';
import { isSquareInControlZone } from '../utils/controlZones';
import { calculateWallSquares, isWallSquare } from '../utils/rookWallLogic';
import './ChessBoard.css';

interface ChessBoardProps {
  board: Board;
  selectedSquare: Position | null;
  possibleMoves: Position[];
  controlZones: ControlZone[];
  onSquareClick: (position: Position) => void;
  upgrades?: UpgradeState;
  highlightedSquares?: Position[];
  lastMove?: { from: Position; to: Position; piece: { type: string; color: string } } | null;
  rookLinks?: RookLink[];
  lastRookLink?: any;
  // Dual movement checkmark button props
  showDualMoveCheckmark?: boolean;
  firstPawnPosition?: { row: number; col: number } | null;
  onEndTurn?: () => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  possibleMoves,
  controlZones,
  onSquareClick,
  upgrades,
  highlightedSquares = [],
  lastMove,
  rookLinks = [],
  lastRookLink,
  showDualMoveCheckmark,
  firstPawnPosition,
  onEndTurn,
}) => {
  // Calculate wall squares from rook links
  const wallSquares = React.useMemo(() => calculateWallSquares(rookLinks), [rookLinks]);
  
  // Check if a wall square is from the last rook link
  const isLastRookLinkWall = React.useCallback((position: Position): boolean => {
    if (!lastRookLink) return false;
    
    const { rook1Pos, rook2Pos } = lastRookLink;
    const rowDiff = rook2Pos.row - rook1Pos.row;
    const colDiff = rook2Pos.col - rook1Pos.col;
    
    // Calculate wall position (the square between the two rooks)
    const wallRow = rook1Pos.row + Math.sign(rowDiff);
    const wallCol = rook1Pos.col + Math.sign(colDiff);
    
    return position.row === wallRow && position.col === wallCol;
  }, [lastRookLink]);
  const isSquareSelected = (row: number, col: number): boolean => {
    return selectedSquare !== null && selectedSquare.row === row && selectedSquare.col === col;
  };

  const isSquarePossibleMove = (row: number, col: number): boolean => {
    return possibleMoves.some(move => move.row === row && move.col === col);
  };

  const isSquareHighlighted = (row: number, col: number): boolean => {
    return highlightedSquares.some(square => square.row === row && square.col === col);
  };

  const isLightSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 0;
  };

  const isLastMoveSquare = (row: number, col: number): boolean => {
    if (!lastMove) return false;
    return (lastMove.to.row === row && lastMove.to.col === col);
  };

  const columnLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'];
  const rowLabels = ['10', '9', '8', '7', '6', '5', '4', '3', '2', '1'];

  return (
    <div className="chess-board-container">
      {/* Top column labels */}
      <div className="column-labels top">
        <div className="corner-space"></div>
        {columnLabels.map(label => (
          <div key={`top-${label}`} className="column-label">{label}</div>
        ))}
        <div className="corner-space"></div>
      </div>

      <div className="board-with-row-labels">
        {/* Left row labels */}
        <div className="row-labels left">
          {rowLabels.map(label => (
            <div key={`left-${label}`} className="row-label">{label}</div>
          ))}
        </div>

        {/* Chess board */}
        <div className="chess-board">
          {/* Move arrow overlay - only show if there's no recent rook link */}
          {lastMove && !lastRookLink && (
            <MoveArrow
              from={lastMove.from}
              to={lastMove.to}
              pieceType={lastMove.piece.type}
            />
          )}
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const position = { row: rowIndex, col: colIndex };
              const controlZone = isSquareInControlZone(position, controlZones);
              const wallSquare = isWallSquare(position, wallSquares);
              const isLastRookLinkSquare = isLastRookLinkWall(position);
              
              return (
                <ChessSquare
                  key={`${rowIndex}-${colIndex}`}
                  piece={piece}
                  position={position}
                  isLight={isLightSquare(rowIndex, colIndex)}
                  isSelected={isSquareSelected(rowIndex, colIndex)}
                  isPossibleMove={isSquarePossibleMove(rowIndex, colIndex)}
                  isHighlighted={isSquareHighlighted(rowIndex, colIndex)}
                  isLastMove={isLastMoveSquare(rowIndex, colIndex)}
                  controlZone={controlZone}
                  onClick={onSquareClick}
                  upgrades={upgrades}
                  board={board}
                  wallSquare={wallSquare}
                  isLastRookLink={isLastRookLinkSquare}
                />
              );
            })
          )}
          
          {/* Dual Movement Checkmark Button - positioned relative to the chess board */}
          {showDualMoveCheckmark && firstPawnPosition && onEndTurn && (
            <div 
              className="dual-move-checkmark-overlay"
              style={{
                position: 'absolute',
                top: `${firstPawnPosition.row * 60 - 8}px`, // 2px from top of square - 10px = -8px
                left: `${firstPawnPosition.col * 60 - 8}px`, // 2px from left edge of square - 10px = -8px
                zIndex: 100
              }}
            >
              <button 
                className="end-turn-checkmark"
                onClick={onEndTurn}
                title="End Turn"
              >
                ✓
              </button>
            </div>
          )}
        </div>

        {/* Right row labels */}
        <div className="row-labels right">
          {rowLabels.map(label => (
            <div key={`right-${label}`} className="row-label">{label}</div>
          ))}
        </div>
      </div>

      {/* Bottom column labels */}
      <div className="column-labels bottom">
        <div className="corner-space"></div>
        {columnLabels.map(label => (
          <div key={`bottom-${label}`} className="column-label">{label}</div>
        ))}
        <div className="corner-space"></div>
      </div>
    </div>
  );
};