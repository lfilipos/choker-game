import React, { useState, useEffect } from 'react';
import { ChessGame } from './components/ChessGame';
import { GameLobby } from './components/GameLobby';
import MatchLobby from './components/MatchLobby';
import { MultiplayerChessGame } from './components/MultiplayerChessGame';
import GameBView from './components/GameBView';
import { socketService, MatchState } from './services/socketService';
import './App.css';

type AppMode = 'menu' | 'singleplayer' | 'lobby' | 'match-lobby' | 'multiplayer' | 'game-b';

function App() {
  const [mode, setMode] = useState<AppMode>('menu');
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
    setMode('menu');
  };

  if (mode === 'menu') {
    return (
      <div className="App">
        <div className="main-menu">
          <h1>Choker Game</h1>
          <div className="menu-buttons">
            <button 
              onClick={() => handleModeSelect('singleplayer')}
              className="menu-button"
            >
              Single Player
            </button>
            <button 
              onClick={() => handleModeSelect('lobby')}
              className="menu-button"
            >
              Multiplayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === 'singleplayer') {
    return (
      <div className="App">
        <div className="back-button-container">
          <button onClick={() => handleModeSelect('menu')} className="back-button">
            ← Back to Menu
          </button>
        </div>
        <ChessGame />
      </div>
    );
  }

  if (mode === 'lobby') {
    return (
      <div className="App">
        <div className="back-button-container">
          <button onClick={() => handleModeSelect('menu')} className="back-button">
            ← Back to Menu
          </button>
        </div>
        <GameLobby onMatchSelect={handleMatchSelect} />
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
