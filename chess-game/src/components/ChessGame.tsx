import React, { useState, useCallback } from 'react';
import { GameState, Position, Move } from '../types';
import { ChessBoard } from './ChessBoard';
import { 
  createInitialBoard, 
  getPossibleMoves, 
  isValidMove, 
  makeMove, 
  isInCheck,
  isCheckmate,
  isStalemate
} from '../utils/chessLogic';
import { createControlZones, calculateAllControlZoneStatuses } from '../utils/controlZones';
import { ControlZoneStatusComponent } from './ControlZoneStatus';
import './ChessGame.css';

export const ChessGame: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: 'white',
    selectedSquare: null,
    possibleMoves: [],
    gameStatus: 'playing',
    moveHistory: [],
    controlZones: createControlZones()
  });

  const handleSquareClick = useCallback((position: Position) => {
    const { board, currentPlayer, selectedSquare } = gameState;
    const clickedPiece = board[position.row][position.col];

    // If no square is selected
    if (!selectedSquare) {
      // Select the square if it has a piece of the current player
      if (clickedPiece && clickedPiece.color === currentPlayer) {
        const moves = getPossibleMoves(board, position);
        setGameState(prev => ({
          ...prev,
          selectedSquare: position,
          possibleMoves: moves
        }));
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === position.row && selectedSquare.col === position.col) {
      setGameState(prev => ({
        ...prev,
        selectedSquare: null,
        possibleMoves: []
      }));
      return;
    }

    // If clicking on another piece of the same color, select it instead
    if (clickedPiece && clickedPiece.color === currentPlayer) {
      const moves = getPossibleMoves(board, position);
      setGameState(prev => ({
        ...prev,
        selectedSquare: position,
        possibleMoves: moves
      }));
      return;
    }

    // Try to make a move
    if (isValidMove(board, selectedSquare, position, currentPlayer)) {
      const newBoard = makeMove(board, selectedSquare, position);
      const selectedPiece = board[selectedSquare.row][selectedSquare.col]!;
      
      const move: Move = {
        from: selectedSquare,
        to: position,
        piece: selectedPiece,
        capturedPiece: clickedPiece || undefined
      };

      const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
      const inCheck = isInCheck(newBoard, nextPlayer);
      const inCheckmate = isCheckmate(newBoard, nextPlayer);
      const inStalemate = isStalemate(newBoard, nextPlayer);

      let gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate' = 'playing';
      if (inCheckmate) {
        gameStatus = 'checkmate';
      } else if (inStalemate) {
        gameStatus = 'stalemate';
      } else if (inCheck) {
        gameStatus = 'check';
      }

      setGameState(prev => ({
        ...prev,
        board: newBoard,
        currentPlayer: nextPlayer,
        selectedSquare: null,
        possibleMoves: [],
        gameStatus,
        moveHistory: [...prev.moveHistory, move]
      }));
    } else {
      // Invalid move, just deselect
      setGameState(prev => ({
        ...prev,
        selectedSquare: null,
        possibleMoves: []
      }));
    }
  }, [gameState]);

  const resetGame = () => {
    setGameState({
      board: createInitialBoard(),
      currentPlayer: 'white',
      selectedSquare: null,
      possibleMoves: [],
      gameStatus: 'playing',
      moveHistory: [],
      controlZones: createControlZones()
    });
  };

  const controlZoneStatuses = calculateAllControlZoneStatuses(gameState.board, gameState.controlZones);

  return (
    <div className="chess-game">
      <div className="game-header">
        <h1>Chess Game</h1>
        <div className="game-info">
          <p>Current Player: <span className={`player-indicator ${gameState.currentPlayer}`}>
            {gameState.currentPlayer.charAt(0).toUpperCase() + gameState.currentPlayer.slice(1)}
          </span></p>
          {gameState.gameStatus === 'check' && (
            <p className="check-warning">Check!</p>
          )}
          {gameState.gameStatus === 'checkmate' && (
            <p className="game-over">Checkmate! {gameState.currentPlayer === 'white' ? 'Black' : 'White'} wins!</p>
          )}
          {gameState.gameStatus === 'stalemate' && (
            <p className="game-over">Stalemate! It's a draw.</p>
          )}
          <button onClick={resetGame} className="reset-button">New Game</button>
        </div>
      </div>
      
      <div className="game-main">
        <div className="game-left">
          <ControlZoneStatusComponent controlZoneStatuses={controlZoneStatuses} />
        </div>
        
        <div className="game-center">
          <ChessBoard 
            board={gameState.board}
            selectedSquare={gameState.selectedSquare}
            possibleMoves={gameState.possibleMoves}
            controlZones={gameState.controlZones}
            onSquareClick={handleSquareClick}
          />
        </div>
        
        <div className="game-right">
          <div className="move-history">
            <h3>Move History</h3>
            <div className="moves-list">
              {gameState.moveHistory.map((move, index) => (
                <div key={index} className="move-item">
                  {index + 1}. {move.piece.color} {move.piece.type} 
                  {String.fromCharCode(97 + move.from.col)}{10 - move.from.row} → 
                  {String.fromCharCode(97 + move.to.col)}{10 - move.to.row}
                  {move.capturedPiece && ` (captured ${move.capturedPiece.type})`}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};