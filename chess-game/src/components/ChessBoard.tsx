import React from 'react';
import { Board, Position, ControlZone } from '../types';
import { ChessSquare } from './ChessSquare';
import { isSquareInControlZone } from '../utils/controlZones';
import './ChessBoard.css';

interface ChessBoardProps {
  board: Board;
  selectedSquare: Position | null;
  possibleMoves: Position[];
  controlZones: ControlZone[];
  onSquareClick: (position: Position) => void;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  board,
  selectedSquare,
  possibleMoves,
  controlZones,
  onSquareClick,
}) => {
  const isSquareSelected = (row: number, col: number): boolean => {
    return selectedSquare !== null && selectedSquare.row === row && selectedSquare.col === col;
  };

  const isSquarePossibleMove = (row: number, col: number): boolean => {
    return possibleMoves.some(move => move.row === row && move.col === col);
  };

  const isLightSquare = (row: number, col: number): boolean => {
    return (row + col) % 2 === 0;
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
          {board.map((row, rowIndex) =>
            row.map((piece, colIndex) => {
              const position = { row: rowIndex, col: colIndex };
              const controlZone = isSquareInControlZone(position, controlZones);
              
              return (
                <ChessSquare
                  key={`${rowIndex}-${colIndex}`}
                  piece={piece}
                  position={position}
                  isLight={isLightSquare(rowIndex, colIndex)}
                  isSelected={isSquareSelected(rowIndex, colIndex)}
                  isPossibleMove={isSquarePossibleMove(rowIndex, colIndex)}
                  controlZone={controlZone}
                  onClick={onSquareClick}
                />
              );
            })
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