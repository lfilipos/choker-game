import React, { useState } from 'react';
import { ChessGame } from './components/ChessGame';
import { GameLobby } from './components/GameLobby';
import { MultiplayerChessGame } from './components/MultiplayerChessGame';
import './App.css';

type AppMode = 'menu' | 'singleplayer' | 'lobby' | 'multiplayer';

function App() {
  const [mode, setMode] = useState<AppMode>('menu');
  const [gameId, setGameId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('');
  const [initialGameState, setInitialGameState] = useState<any>(null);

  const handleModeSelect = (newMode: AppMode) => {
    setMode(newMode);
  };

  const handleGameStart = (newGameId: string, newPlayerName: string, gameState?: any) => {
    setGameId(newGameId);
    setPlayerName(newPlayerName);
    setInitialGameState(gameState || null);
    setMode('multiplayer');
  };

  const handleLeaveGame = () => {
    setGameId('');
    setPlayerName('');
    setInitialGameState(null);
    setMode('menu');
  };

  if (mode === 'menu') {
    return (
      <div className="App">
        <div className="main-menu">
          <h1>Chess Game</h1>
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
        <GameLobby onGameStart={handleGameStart} />
      </div>
    );
  }

  if (mode === 'multiplayer' && gameId) {
    return (
      <div className="App">
        <MultiplayerChessGame 
          gameId={gameId}
          playerName={playerName}
          initialGameState={initialGameState}
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
