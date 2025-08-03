import React, { useState, useEffect } from 'react';
import { socketService, WaitingMatch } from '../services/socketService';
import './GameLobby.css';

interface GameLobbyProps {
  onMatchSelect: (matchId: string, playerName: string) => void;
}

export const GameLobby: React.FC<GameLobbyProps> = ({ onMatchSelect }) => {
  const [playerName, setPlayerName] = useState('');
  const [waitingMatches, setWaitingMatches] = useState<WaitingMatch[]>([]);
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
      socketService.onMatchesUpdated((matches) => {
        setWaitingMatches(matches);
      });

      socketService.onError((error) => {
        setError(error.message);
      });

      // Get initial list of waiting matches
      const matches = await socketService.getWaitingMatches();
      setWaitingMatches(matches);

    } catch (error) {
      setError('Failed to connect to server. Please try again.');
      console.error('Connection error:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleCreateMatch = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    
    try {
      const result = await socketService.createMatch(playerName.trim());
      onMatchSelect(result.matchId, playerName.trim());
    } catch (error) {
      setError('Failed to create match. Please try again.');
      console.error('Create match error:', error);
    }
  };

  const handleSelectMatch = async (matchId: string) => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setError(null);
    onMatchSelect(matchId, playerName.trim());
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
          <h1>Choker Game Lobby</h1>
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
          <h1>Choker Game Lobby</h1>
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
        <h1>Choker Game Lobby</h1>
        
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
            onClick={handleCreateMatch}
            className="create-game-button"
            disabled={!playerName.trim()}
          >
            Create New Match
          </button>
        </div>

        <div className="waiting-games">
          <h2>Available Matches ({waitingMatches.length})</h2>
          
          {waitingMatches.length === 0 ? (
            <div className="no-games">
              <p>No matches available. Create one to get started!</p>
            </div>
          ) : (
            <div className="games-list">
              {waitingMatches.map((match) => (
                <div key={match.id} className="game-item">
                  <div className="game-info">
                    <h3>Match #{match.id.slice(0, 8)}</h3>
                    <p>Players: {match.playerCount}/4</p>
                    <p>Created: {formatTimeAgo(match.createdAt)}</p>
                    {match.availableSlots && match.availableSlots.length > 0 && (
                      <p className="available-slots">
                        Available: {match.availableSlots.map(slot => 
                          `${slot.team} - Game ${slot.gameSlot}`
                        ).join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleSelectMatch(match.id)}
                    className="join-game-button"
                    disabled={!playerName.trim()}
                  >
                    Join Match
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