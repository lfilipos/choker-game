import React, { useState, useEffect } from 'react';
import { socketService, WaitingGame } from '../services/socketService';
import './GameLobby.css';

interface GameLobbyProps {
  onGameStart: (gameId: string, playerName: string, initialGameState?: any) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onGameStart }) => {
  const [playerName, setPlayerName] = useState('');
  const [waitingGames, setWaitingGames] = useState<WaitingGame[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    connectToServer();

    return () => {
      socketService.removeAllListeners();
    };
  }, []);

  const connectToServer = async () => {
    setIsConnecting(true);
    setError(null);

    try {
      await socketService.connect();
      setIsConnected(true);
      
      // Set up event listeners
      socketService.onGamesUpdated((games) => {
        setWaitingGames(games);
      });

      socketService.onError((error) => {
        setError(error.message);
      });

      // Get initial list of waiting games
      const games = await socketService.getWaitingGames();
      setWaitingGames(games);

    } catch (error) {
      setError('Failed to connect to server. Please try again.');
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    
    try {
      const result = await socketService.createGame(playerName.trim());
      onGameStart(result.gameId, playerName.trim(), result.gameState);
    } catch (error) {
      setError('Failed to create game. Please try again.');
      console.error('Create game error:', error);
    }
  };

  const handleJoinGame = async (gameId: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);

    try {
      const result = await socketService.joinGame(gameId, playerName.trim());
      onGameStart(result.gameId, playerName.trim(), result.gameState);
    } catch (error) {
      setError('Failed to join game. Please try again.');
      console.error('Join game error:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const created = new Date(dateString);
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  if (isConnecting) {
    return (
      <div className="game-lobby">
        <div className="lobby-container">
          <h1>Chess Game Lobby</h1>
          <div className="loading">
            <p>Connecting to server...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="game-lobby">
        <div className="lobby-container">
          <h1>Chess Game Lobby</h1>
          <div className="connection-error">
            <p>Failed to connect to server</p>
            <button onClick={connectToServer} className="retry-button">
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-lobby">
      <div className="lobby-container">
        <h1>Chess Game Lobby</h1>
        
        <div className="player-setup">
          <label htmlFor="playerName">Your Name:</label>
          <input
            id="playerName"
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
          />
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="game-actions">
          <button 
            onClick={handleCreateGame}
            className="create-game-button"
            disabled={!playerName.trim()}
          >
            Create New Game
          </button>
        </div>

        <div className="waiting-games">
          <h2>Available Games ({waitingGames.length})</h2>
          
          {waitingGames.length === 0 ? (
            <div className="no-games">
              <p>No games available. Create one to get started!</p>
            </div>
          ) : (
            <div className="games-list">
              {waitingGames.map((game) => (
                <div key={game.id} className="game-item">
                  <div className="game-info">
                    <h3>Game by {game.creatorName}</h3>
                    <p>Players: {game.playerCount}/2</p>
                    <p>Created: {formatTimeAgo(game.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleJoinGame(game.id)}
                    className="join-game-button"
                    disabled={!playerName.trim()}
                  >
                    Join Game
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lobby-footer">
          <p>Connected to server • {isConnected ? 'Online' : 'Offline'}</p>
        </div>
      </div>
    </div>
  );
};