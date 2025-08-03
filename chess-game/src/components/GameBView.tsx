import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import TeamEconomy from './TeamEconomy';
import UpgradeStore from './UpgradeStore';
import { ChessPiece, Move, UpgradeState, TeamEconomy as TeamEconomyType } from '../types';
import './GameBView.css';

interface MatchState {
  id: string;
  status: string;
  playerRole: string;
  playerTeam: string;
  playerGameSlot: string;
  teams: {
    white: {
      economy: number;
      upgrades: any;
    };
    black: {
      economy: number;
      upgrades: any;
    };
  };
  currentGame: {
    type: string;
    currentPlayer: string;
    isPlayerTurn: boolean;
    moveHistory?: Move[];
  };
}

interface GameBViewProps {
  matchId: string;
  socket: Socket;
  playerName: string;
  onLeaveGame: () => void;
}

const GameBView: React.FC<GameBViewProps> = ({ matchId, socket, playerName, onLeaveGame }) => {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [showUpgradeStore, setShowUpgradeStore] = useState(false);
  const [chessMoveHistory, setChessMoveHistory] = useState<Move[]>([]);
  const [availableUpgrades, setAvailableUpgrades] = useState<any[]>([]);

  useEffect(() => {
    // Get initial match state
    socket.emit('get_match_state', { matchId });

    // Listen for match updates
    socket.on('match_state', (state: MatchState) => {
      setMatchState(state);
    });

    socket.on('match_state_updated', (data: { matchState: MatchState }) => {
      setMatchState(data.matchState);
    });

    socket.on('move_made', (data: { move: Move; gameSlot: string; matchState: MatchState }) => {
      // Update match state
      setMatchState(data.matchState);
      
      // If the move was from Game A (chess), update our move history
      if (data.gameSlot === 'A' && data.matchState.currentGame?.moveHistory) {
        setChessMoveHistory(data.matchState.currentGame.moveHistory);
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
      alert(`Error: ${error.message}`);
    });

    // Get available upgrades
    socket.emit('get_available_upgrades');
    
    socket.on('available_upgrades', (data: { upgrades: any[] }) => {
      setAvailableUpgrades(data.upgrades);
    });

    return () => {
      socket.off('match_state');
      socket.off('match_state_updated');
      socket.off('move_made');
      socket.off('error');
    };
  }, [matchId, socket]);

  const handlePurchaseUpgrade = (upgradeId: string) => {
    socket.emit('purchase_upgrade', { upgradeId });
  };

  const getPieceSymbol = (piece: ChessPiece): string => {
    const symbols = {
      white: { king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return symbols[piece.color][piece.type];
  };

  const formatMove = (move: Move, index: number): string => {
    const fromCol = String.fromCharCode(97 + move.from.col);
    const fromRow = 10 - move.from.row;
    const toCol = String.fromCharCode(97 + move.to.col);
    const toRow = 10 - move.to.row;
    
    const piece = getPieceSymbol(move.piece);
    const capture = move.capturedPiece ? 'x' : '-';
    
    return `${Math.floor(index / 2) + 1}. ${piece} ${fromCol}${fromRow}${capture}${toCol}${toRow}`;
  };

  if (!matchState) {
    return <div className="game-b-view">Loading...</div>;
  }

  const economy: TeamEconomyType = {
    white: matchState.teams.white.economy,
    black: matchState.teams.black.economy
  };

  const upgrades: UpgradeState = {
    white: matchState.teams.white.upgrades,
    black: matchState.teams.black.upgrades
  };

  return (
    <div className="game-b-view">
      <div className="game-navbar">
        <button onClick={onLeaveGame} className="leave-button">
          Leave Game
        </button>
        <button 
          onClick={() => setShowUpgradeStore(!showUpgradeStore)}
          className="upgrade-button"
        >
          Upgrade Store
        </button>
        {/* Admin Panel disabled in Game B view */}
      </div>

      <div className="game-b-content">
        <div className="game-info">
          <h2>Game B - {matchState.playerTeam} Team</h2>
          <p>You are playing Game B as the {matchState.playerTeam} team</p>
        </div>

        <TeamEconomy economy={economy} playerColor={matchState.playerTeam as 'white' | 'black'} />

        <div className="chess-move-history">
          <h3>Chess Game (Game A) Move History</h3>
          <div className="move-list">
            {chessMoveHistory.length === 0 ? (
              <p>No moves yet in the chess game</p>
            ) : (
              chessMoveHistory.map((move, index) => (
                <div key={index} className={`move-item ${move.piece.color}`}>
                  {formatMove(move, index)}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="game-b-placeholder">
          <h3>Game B Play Area</h3>
          <p>Game B mechanics will be implemented here</p>
          <p>For now, you can:</p>
          <ul>
            <li>View the shared team economy</li>
            <li>Purchase upgrades that affect both games</li>
            <li>Watch the chess game progress</li>
          </ul>
        </div>
      </div>

      {showUpgradeStore && (
        <div className="modal-overlay" onClick={() => setShowUpgradeStore(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <UpgradeStore
              economy={economy}
              upgrades={upgrades}
              playerColor={matchState.playerTeam as 'white' | 'black'}
              onPurchaseUpgrade={handlePurchaseUpgrade}
              availableUpgrades={availableUpgrades}
            />
            <button 
              className="close-modal"
              onClick={() => setShowUpgradeStore(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Admin panel not available in Game B */}
    </div>
  );
};

export default GameBView;