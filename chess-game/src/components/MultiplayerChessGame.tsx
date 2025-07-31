import React, { useState, useCallback, useEffect } from 'react';
import { Position, PieceColor } from '../types';
import { ChessBoard } from './ChessBoard';
import { ControlZoneStatusComponent } from './ControlZoneStatus';
import { socketService, MultiplayerGameState } from '../services/socketService';
import { UpgradeDefinition } from '../types/upgrades';
import TeamEconomy from './TeamEconomy';
import UpgradeStore from './UpgradeStore';
import AdminPanel from './AdminPanel';
import './ChessGame.css';

interface MultiplayerChessGameProps {
  gameId: string;
  playerName: string;
  initialGameState?: MultiplayerGameState | null;
  onLeaveGame: () => void;
}

export const MultiplayerChessGame: React.FC<MultiplayerChessGameProps> = ({
  gameId,
  playerName,
  initialGameState,
  onLeaveGame
}) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(initialGameState || null);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showUpgradeStore, setShowUpgradeStore] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [availableUpgrades, setAvailableUpgrades] = useState<UpgradeDefinition[]>([]);

  useEffect(() => {
    console.log('MultiplayerChessGame: Setting up socket listeners for game:', gameId);
    
    // Set up socket event listeners
    socketService.onGameJoined((data) => {
      console.log('MultiplayerChessGame: Received game_joined event:', data);
      setGameState(data.gameState);
      setError(null);
    });

    socketService.onMoveMade((data) => {
      setGameState(data.gameState);
      setSelectedSquare(null);
      setPossibleMoves([]);
      setError(null);
    });

    socketService.onPlayerDisconnected((data) => {
      setGameState(data.gameState);
      setError('Your opponent has disconnected');
    });

    socketService.onError((error) => {
      setError(error.message);
    });

    socketService.onGameStateUpdated((data) => {
      setGameState(data.gameState);
    });

    socketService.onAvailableUpgrades((data) => {
      setAvailableUpgrades(data.upgrades);
    });

    socketService.onUpgradePurchased((data) => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        return {
          ...prevState,
          upgrades: data.upgrades,
          economy: data.economy
        };
      });
      // Refresh available upgrades
      socketService.getAvailableUpgrades();
    });

    socketService.onUpgradeError((error) => {
      setError(error.message);
    });

    socketService.onPossibleMoves((data) => {
      if (data.position.row === selectedSquare?.row && data.position.col === selectedSquare?.col) {
        setPossibleMoves(data.moves);
      }
    });

    // Get initial available upgrades
    if (gameState?.status === 'active') {
      socketService.getAvailableUpgrades();
    }

    return () => {
      socketService.removeAllListeners();
    };
  }, [gameState?.status, selectedSquare]);

  const handleSquareClick = useCallback((position: Position) => {
    if (!gameState || !gameState.isPlayerTurn) {
      setError("It's not your turn!");
      return;
    }

    if (gameState.status !== 'active') {
      setError("Game is not active");
      return;
    }

    const clickedPiece = gameState.board[position.row][position.col];

    // If no square is selected
    if (!selectedSquare) {
      // Select the square if it has a piece of the current player's color
      if (clickedPiece && clickedPiece.color === gameState.playerColor) {
        setSelectedSquare(position);
        setPossibleMoves([]); // Clear moves while we wait for server response
        socketService.getPossibleMoves(position); // Request moves from server
        setError(null);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === position.row && selectedSquare.col === position.col) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If clicking on another piece of the same color, select it instead
    if (clickedPiece && clickedPiece.color === gameState.playerColor) {
      setSelectedSquare(position);
      setPossibleMoves([]); // Clear moves while we wait for server response
      socketService.getPossibleMoves(position); // Request moves from server
      return;
    }

    // Try to make a move
    const isValidMove = possibleMoves.some(move => move.row === position.row && move.col === position.col);
    
    if (isValidMove) {
      // Send move to server
      socketService.makeMove(selectedSquare, position).catch((error) => {
        setError(error.message);
      });
      
      // Clear selection (will be updated when server responds)
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      // Invalid move, just deselect
      setSelectedSquare(null);
      setPossibleMoves([]);
      setError("Invalid move!");
    }
  }, [gameState, selectedSquare, possibleMoves]);

  const handleLeaveGame = () => {
    socketService.disconnect();
    onLeaveGame();
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    socketService.purchaseUpgrade(upgradeId);
  };

  const handleUpdateEconomy = (color: PieceColor, amount: number) => {
    // Admin function - would need backend support
    console.log('Update economy:', color, amount);
  };

  const handleToggleUpgrade = (color: PieceColor, pieceType: string, upgradeId: string) => {
    // Admin function - would need backend support
    console.log('Toggle upgrade:', color, pieceType, upgradeId);
  };

  const handleResetUpgrades = (color: PieceColor) => {
    // Admin function - would need backend support
    console.log('Reset upgrades:', color);
  };

  if (!gameState) {
    return (
      <div className="chess-game">
        <div className="loading">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const getGameStatusText = () => {
    if (gameState.status === 'waiting') {
      return 'Waiting for another player to join...';
    }
    
    if (gameState.status === 'completed') {
      return 'Game completed';
    }

    if (gameState.gameStatus === 'check') {
      return `${gameState.currentPlayer} is in check!`;
    }

    if (gameState.gameStatus === 'checkmate') {
      const winner = gameState.currentPlayer === 'white' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }

    if (gameState.gameStatus === 'stalemate') {
      return 'Stalemate! It\'s a draw.';
    }

    return gameState.isPlayerTurn ? 'Your turn' : 'Opponent\'s turn';
  };

  const getPlayersList = () => {
    return Object.entries(gameState.players).map(([socketId, player]) => (
      <div key={socketId} className="player-info">
        <span className={`player-indicator ${player.color}`}>
          {player.name} ({player.color})
        </span>
        {player.color === gameState.currentPlayer && <span className="turn-indicator">• Current turn</span>}
      </div>
    ));
  };

  return (
    <div className="chess-game">
      <div className="game-header">
        <h1>Multiplayer Chess Game</h1>
        <div className="game-info">
          <div className="players-list">
            {getPlayersList()}
          </div>
          
          <div className="game-status">
            <p className={gameState.isPlayerTurn ? 'your-turn' : 'opponent-turn'}>
              {getGameStatusText()}
            </p>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="game-actions">
            <button onClick={handleLeaveGame} className="leave-game-button">
              Leave Game
            </button>
            {gameState.status === 'active' && (
              <>
                <button 
                  onClick={() => setShowUpgradeStore(!showUpgradeStore)} 
                  className="upgrade-store-button"
                >
                  🛒 Upgrade Store
                </button>
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className="admin-panel-button"
                >
                  ⚙️ Admin Panel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {gameState.status === 'active' && gameState.economy && (
        <TeamEconomy 
          economy={gameState.economy} 
          playerColor={gameState.playerColor as PieceColor | null}
        />
      )}
      
      <div className="game-main">
        <div className="game-left">
          <ControlZoneStatusComponent controlZoneStatuses={gameState.controlZoneStatuses} />
        </div>
        
        <div className="game-center">
          <ChessBoard 
            board={gameState.board}
            selectedSquare={selectedSquare}
            possibleMoves={possibleMoves}
            controlZones={gameState.controlZones}
            onSquareClick={handleSquareClick}
            upgrades={gameState.upgrades}
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

      <div className="connection-status">
        <p className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      {showUpgradeStore && gameState.upgrades && gameState.economy && (
        <div className="modal-overlay" onClick={() => setShowUpgradeStore(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowUpgradeStore(false)}>✖</button>
            <UpgradeStore
              playerColor={gameState.playerColor as PieceColor | null}
              upgrades={gameState.upgrades}
              economy={gameState.economy}
              onPurchaseUpgrade={handlePurchaseUpgrade}
              availableUpgrades={availableUpgrades}
            />
          </div>
        </div>
      )}

      {showAdminPanel && gameState.upgrades && gameState.economy && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminPanel(false)}>✖</button>
            <AdminPanel
              economy={gameState.economy}
              upgrades={gameState.upgrades}
              onUpdateEconomy={handleUpdateEconomy}
              onToggleUpgrade={handleToggleUpgrade}
              onResetUpgrades={handleResetUpgrades}
              isAdminMode={isAdminMode}
              onToggleAdminMode={() => setIsAdminMode(!isAdminMode)}
            />
          </div>
        </div>
      )}
    </div>
  );
};