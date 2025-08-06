import React from 'react';
import { ChessPiece, ControlZone } from '../types';
import './MiniChessBoard.css';

interface MiniChessBoardProps {
  board: (ChessPiece | null)[][];
  currentPlayer?: string;
  controlZones?: ControlZone[];
}

const MiniChessBoard: React.FC<MiniChessBoardProps> = ({ board, currentPlayer, controlZones }) => {
  const getPieceSymbol = (piece: ChessPiece): string => {
    const symbols = {
      white: { 
        king: '♔', 
        queen: '♕', 
        rook: '♖', 
        bishop: '♗', 
        knight: '♘', 
        pawn: '♙' 
      },
      black: { 
        king: '♚', 
        queen: '♛', 
        rook: '♜', 
        bishop: '♝', 
        knight: '♞', 
        pawn: '♟' 
      }
    };
    return symbols[piece.color][piece.type];
  };

  const getControlZone = (row: number, col: number): ControlZone | undefined => {
    if (!controlZones) return undefined;
    
    return controlZones.find(zone => 
      zone.squares.some(square => square.row === row && square.col === col)
    );
  };

  return (
    <div className="mini-chess-board-container">
      <div className="mini-board-header">
        <h4>Chess Game Overview</h4>
        {currentPlayer && (
          <span className={`mini-current-player ${currentPlayer}`}>
            {currentPlayer === 'white' ? '○' : '●'} {currentPlayer}'s turn
          </span>
        )}
      </div>
      <div className="mini-board-with-ranks">
        <div className="mini-rank-labels">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(rank => (
            <span key={rank} className="mini-rank-label">{rank}</span>
          ))}
        </div>
        <div className="mini-chess-board">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="mini-board-row">
              {row.map((piece, colIndex) => {
                const isWhiteSquare = (rowIndex + colIndex) % 2 === 0;
                const controlZone = getControlZone(rowIndex, colIndex);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`mini-board-square ${isWhiteSquare ? 'white' : 'black'} ${controlZone ? `control-zone zone-${controlZone.id}` : ''}`}
                  >
                    {piece && (
                      <span className={`mini-piece ${piece.color}`}>
                        {getPieceSymbol(piece)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mini-board-coordinates">
        <div className="mini-file-labels">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p'].map(file => (
            <span key={file} className="mini-file-label">{file}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MiniChessBoard;