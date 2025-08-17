import React, { useState, useCallback } from 'react';
import { GameState, Position, Move } from '../types';
import { UpgradeState, TeamEconomy, TieredUpgradeDefinition } from '../types/upgrades';
import { ChessBoard } from './ChessBoard';
import { MovementMechanics } from './movement/MovementMechanics';
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
  const initialUpgrades: UpgradeState = {
    white: {
      pawn: [],
      knight: [],
      bishop: [],
      rook: [],
      queen: [],
      king: []
    },
    black: {
      pawn: [],
      knight: [],
      bishop: [],
      rook: [],
      queen: [],
      king: []
    }
  };

  // Sample tiered upgrades for demonstration
  const initialTieredUpgrades: TieredUpgradeDefinition[] = [
    {
      id: 'pawn_tier1',
      name: 'Enhanced Movement',
      description: 'Pawns can move forward two squares.',
      summary: 'Move forward two squares',
      cost: 200,
      pieceType: 'pawn',
      tier: 1,
      requirements: [{ type: 'capture', pieceType: 'pawn', count: 1 }],
      effects: [{ type: 'movement', value: 'enhanced', description: 'Can move forward two squares' }],
      isAvailable: true,
      isPurchased: true,
    },
    {
      id: 'knight_tier1',
      name: 'Adjacent Movement',
      description: 'Knights can move to adjacent squares.',
      summary: 'Move to adjacent squares',
      cost: 300,
      pieceType: 'knight',
      tier: 1,
      requirements: [{ type: 'capture', pieceType: 'knight', count: 1 }],
      effects: [{ type: 'movement', value: 'adjacent', description: 'Can move to adjacent squares' }],
      isAvailable: true,
      isPurchased: true,
    },
    {
      id: 'bishop_tier1',
      name: 'Orthogonal Movement',
      description: 'Bishops can move horizontally and vertically.',
      summary: 'Move horizontally and vertically',
      cost: 300,
      pieceType: 'bishop',
      tier: 1,
      requirements: [{ type: 'capture', pieceType: 'bishop', count: 1 }],
      effects: [{ type: 'movement', value: 'orthogonal', description: 'Can move horizontally and vertically' }],
      isAvailable: true,
      isPurchased: true,
    },
    {
      id: 'rook_tier2',
      name: 'Protection Mechanics',
      description: 'Rooks can protect squares and control enemy movement.',
      summary: 'Protect squares and control movement',
      cost: 400,
      pieceType: 'rook',
      tier: 2,
      requirements: [{ type: 'capture', pieceType: 'rook', count: 2 }],
      effects: [{ type: 'special', value: 'protection', description: 'Can protect squares' }],
      isAvailable: true,
      isPurchased: true,
    },
    {
      id: 'queen_tier2',
      name: 'Extended Movement',
      description: 'Queens have enhanced movement patterns.',
      summary: 'Enhanced movement patterns',
      cost: 500,
      pieceType: 'queen',
      tier: 2,
      requirements: [{ type: 'capture', pieceType: 'queen', count: 2 }],
      effects: [{ type: 'movement', value: 'extended_movement', description: 'Enhanced movement capabilities' }],
      isAvailable: true,
      isPurchased: true,
    },
    {
      id: 'king_tier2',
      name: 'Enhanced Movement',
      description: 'Kings have enhanced movement abilities.',
      summary: 'Enhanced movement abilities',
      cost: 600,
      pieceType: 'king',
      tier: 2,
      requirements: [{ type: 'capture', pieceType: 'king', count: 2 }],
      effects: [{ type: 'movement', value: 'enhanced_movement', description: 'Enhanced movement capabilities' }],
      isAvailable: true,
      isPurchased: true,
    }
  ];

  const initialEconomy: TeamEconomy = {
    white: 500,
    black: 500
  };

  const [gameState, setGameState] = useState<GameState>({
    board: createInitialBoard(),
    currentPlayer: 'white',
    selectedSquare: null,
    possibleMoves: [],
    gameStatus: 'playing',
    moveHistory: [],
    controlZones: createControlZones(),
    upgrades: initialUpgrades,
    economy: initialEconomy
  });

  const [tieredUpgrades, setTieredUpgrades] = useState<TieredUpgradeDefinition[]>(initialTieredUpgrades);

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

  // Handle movement mechanics completion
  const handleMovementMechanicsComplete = useCallback((moves: { from: Position; to: Position }[]) => {
    // For now, just log the moves - in a real implementation, these would be processed
    console.log('Movement mechanics completed:', moves);
    
    // Reset selection after movement mechanics
    setGameState(prev => ({
      ...prev,
      selectedSquare: null,
      possibleMoves: []
    }));
  }, []);

  // Handle movement mechanics cancellation
  const handleMovementMechanicsCancel = useCallback(() => {
    // Reset selection after cancellation
    setGameState(prev => ({
      ...prev,
      selectedSquare: null,
      possibleMoves: []
    }));
  }, []);

  const resetGame = () => {
    setGameState({
      board: createInitialBoard(),
      currentPlayer: 'white',
      selectedSquare: null,
      possibleMoves: [],
      gameStatus: 'playing',
      moveHistory: [],
      controlZones: createControlZones(),
      upgrades: initialUpgrades,
      economy: initialEconomy
    });
  };

  const controlZoneStatuses = calculateAllControlZoneStatuses(gameState.board, gameState.controlZones);

  // Get the selected piece for movement mechanics
  const selectedPiece = gameState.selectedSquare 
    ? gameState.board[gameState.selectedSquare.row][gameState.selectedSquare.col]
    : null;

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
            upgrades={gameState.upgrades}
            tieredUpgrades={tieredUpgrades}
          />
          
          {/* Movement Mechanics Integration */}
          {/* Temporarily disabled for debugging
          {selectedPiece && gameState.selectedSquare && (
            <MovementMechanics
              selectedPiece={selectedPiece}
              piecePosition={gameState.selectedSquare}
              upgrades={tieredUpgrades}
              board={gameState.board}
              onMoveComplete={handleMovementMechanicsComplete}
              onCancel={handleMovementMechanicsCancel}
            />
          )}
          */}
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