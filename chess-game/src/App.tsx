import React, { useState, useEffect } from 'react';
import { GameLobby } from './components/GameLobby';
import MatchLobby from './components/MatchLobby';
import { MultiplayerChessGame } from './components/MultiplayerChessGame';
import { ChessGame } from './components/ChessGame';
import GameBView from './components/GameBView';
import { socketService, MatchState } from './services/socketService';
import './App.css';

type AppMode = 'lobby' | 'match-lobby' | 'multiplayer' | 'game-b' | 'test-chess';

function App() {
  const [mode, setMode] = useState<AppMode>('lobby');
  const [gameId, setGameId] = useState<string>('');
  const [matchId, setMatchId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [initialGameState, setInitialGameState] = useState<any>(null);
  const [socket, setSocket] = useState<any>(null);

  const handleModeSelect = (newMode: AppMode) => {
    setMode(newMode);
  };

  const handleGameStart = (newGameId: string, newPlayerName: string, gameState?: any) => {
    setGameId(newGameId);
    setPlayerName(newPlayerName);
    setInitialGameState(gameState || null);
    setMode('multiplayer');
  };

  const handleMatchSelect = async (newMatchId: string, newPlayerName: string) => {
    // Ensure socket is connected before proceeding
    if (!socketService.isConnected()) {
      try {
        await socketService.connect();
      } catch (error) {
        console.error('Failed to connect to server:', error);
        return;
      }
    }
    setMatchId(newMatchId);
    setPlayerName(newPlayerName);
    setMode('match-lobby');
  };

  const handleMatchStart = (matchState: MatchState) => {
    // Determine which game view to show based on player's game slot
    if (matchState.playerGameSlot === 'A') {
      setMode('multiplayer');
    } else {
      setMode('game-b');
    }
  };

  const handleLeaveGame = () => {
    setGameId('');
    setMatchId('');
    setPlayerName('');
    setInitialGameState(null);
    if (socket) {
      socketService.disconnect();
      setSocket(null);
    }
    setMode('lobby');
  };

  // Menu and single player modes removed - going directly to lobby

  if (mode === 'lobby') {
    return (
      <div className="App">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Chess Game Test</h2>
          <button 
            onClick={() => setMode('test-chess')} 
            style={{ 
              padding: '10px 20px', 
              margin: '10px', 
              fontSize: '16px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Test Standalone Chess Game
          </button>
        </div>
        <GameLobby onMatchSelect={handleMatchSelect} />
      </div>
    );
  }

  if (mode === 'test-chess') {
    return (
      <div className="App">
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <button 
            onClick={() => setMode('lobby')} 
            style={{ 
              padding: '10px 20px', 
              margin: '10px', 
              fontSize: '16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            ← Back to Lobby
          </button>
          <h2>Testing Basic Chess Board</h2>
        </div>
        <div style={{ padding: '20px' }}>
          <ChessGame />
        </div>
      </div>
    );
  }

  if (mode === 'match-lobby' && matchId) {
    return (
      <div className="App">
        <div className="back-button-container">
          <button onClick={() => setMode('lobby')} className="back-button">
            ← Back to Lobby
          </button>
        </div>
        <MatchLobby 
          matchId={matchId}
          socket={socketService.getSocket()!}
          playerName={playerName}
          onMatchStart={handleMatchStart}
          onLeave={() => setMode('lobby')}
        />
      </div>
    );
  }

  if (mode === 'multiplayer' && matchId) {
    return (
      <div className="App">
        <MultiplayerChessGame 
          gameId={matchId}
          playerName={playerName}
          initialGameState={initialGameState}
          onLeaveGame={handleLeaveGame}
        />
      </div>
    );
  }

  if (mode === 'game-b' && matchId) {
    return (
      <div className="App">
        <GameBView 
          matchId={matchId}
          socket={socketService.getSocket()!}
          playerName={playerName}
          onLeaveGame={handleLeaveGame}
        />
      </div>
    );
  }

  return (
    <div className="App">
      <div className="loading">
        <p>Loading...</p>
      </div>
    </div>
  );
}

export default App;
