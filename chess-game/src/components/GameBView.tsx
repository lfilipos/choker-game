import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import UpgradeStore from './UpgradeStore';
import MiniChessBoard from './MiniChessBoard';
import MiniControlZoneStatus from './MiniControlZoneStatus';
import { PokerTable } from './PokerTable';
import { PokerGameState, PokerMatchState } from '../types/poker';
import { ChessPiece, Move, UpgradeState, TeamEconomy as TeamEconomyType, ControlZone, ControlZoneStatus } from '../types';
import './GameBView2.css';

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
    currentPlayer?: string;
    isPlayerTurn: boolean;
    moveHistory?: Move[];
    pokerState?: PokerGameState;
  } | PokerMatchState;
  chessGameInfo?: {
    moveHistory: Move[];
    currentPlayer: string;
    board: any;
    controlZones?: ControlZone[];
    controlZoneStatuses?: ControlZoneStatus[];
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
  const [chessBoard, setChessBoard] = useState<(ChessPiece | null)[][] | null>(null);
  const [chessCurrentPlayer, setChessCurrentPlayer] = useState<string>('white');
  const [controlZones, setControlZones] = useState<ControlZone[]>([]);
  const [controlZoneStatuses, setControlZoneStatuses] = useState<ControlZoneStatus[]>([]);
  const [pokerState, setPokerState] = useState<PokerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial match state
    socket.emit('get_match_state', { matchId });

    // Listen for match updates
    socket.on('match_state', (state: MatchState) => {
      console.log('Received match state:', state);
      console.log('Current game:', state.currentGame);
      setMatchState(state);
      
      // Extract poker state if available
      const currentGame = state.currentGame as any;
      console.log('Current game type:', currentGame?.type);
      console.log('Poker state available:', !!currentGame?.pokerState);
      if (currentGame && currentGame.pokerState) {
        console.log('Setting poker state:', currentGame.pokerState);
        console.log('Poker phase:', currentGame.pokerState.phase);
        // Include playersReady if available
        if (currentGame.playersReady) {
          currentGame.pokerState.playersReady = currentGame.playersReady;
          console.log('Players ready status:', currentGame.playersReady);
        }
        setPokerState(currentGame.pokerState);
      }
      
      // Update chess move history and board from the dedicated field
      if (state.chessGameInfo) {
        if (state.chessGameInfo.moveHistory) {
          setChessMoveHistory(state.chessGameInfo.moveHistory);
        }
        if (state.chessGameInfo.board) {
          setChessBoard(state.chessGameInfo.board);
        }
        if (state.chessGameInfo.currentPlayer) {
          setChessCurrentPlayer(state.chessGameInfo.currentPlayer);
        }
        if (state.chessGameInfo.controlZones) {
          setControlZones(state.chessGameInfo.controlZones);
        }
        if (state.chessGameInfo.controlZoneStatuses) {
          setControlZoneStatuses(state.chessGameInfo.controlZoneStatuses);
        }
      }
    });

    socket.on('match_state_updated', (data: { matchState: MatchState }) => {
      console.log('Match state updated:', data);
      console.log('Updated current game:', data.matchState.currentGame);
      setMatchState(data.matchState);
      
      const currentGame = data.matchState.currentGame as any;
      console.log('Updated current game type:', currentGame?.type);
      console.log('Updated poker state available:', !!currentGame?.pokerState);
      if (currentGame && currentGame.pokerState) {
        console.log('Setting updated poker state:', currentGame.pokerState);
        console.log('Updated poker phase:', currentGame.pokerState.phase);
        // Include playersReady if available
        if (currentGame.playersReady) {
          currentGame.pokerState.playersReady = currentGame.playersReady;
          console.log('Updated players ready status:', currentGame.playersReady);
        }
        setPokerState(currentGame.pokerState);
      }
      
      // Update chess move history and board from the dedicated field
      if (data.matchState.chessGameInfo) {
        if (data.matchState.chessGameInfo.moveHistory) {
          setChessMoveHistory(data.matchState.chessGameInfo.moveHistory);
        }
        if (data.matchState.chessGameInfo.board) {
          setChessBoard(data.matchState.chessGameInfo.board);
        }
        if (data.matchState.chessGameInfo.currentPlayer) {
          setChessCurrentPlayer(data.matchState.chessGameInfo.currentPlayer);
        }
        if (data.matchState.chessGameInfo.controlZones) {
          setControlZones(data.matchState.chessGameInfo.controlZones);
        }
        if (data.matchState.chessGameInfo.controlZoneStatuses) {
          setControlZoneStatuses(data.matchState.chessGameInfo.controlZoneStatuses);
        }
      }
    });

    socket.on('move_made', (data: { move: Move; gameSlot: string; matchState: MatchState }) => {
      // Update match state
      setMatchState(data.matchState);
      
      // If the move was from Game A (chess), update our move history and board
      if (data.gameSlot === 'A' && data.matchState.chessGameInfo) {
        if (data.matchState.chessGameInfo.moveHistory) {
          setChessMoveHistory(data.matchState.chessGameInfo.moveHistory);
        }
        if (data.matchState.chessGameInfo.board) {
          setChessBoard(data.matchState.chessGameInfo.board);
        }
        if (data.matchState.chessGameInfo.currentPlayer) {
          setChessCurrentPlayer(data.matchState.chessGameInfo.currentPlayer);
        }
        if (data.matchState.chessGameInfo.controlZones) {
          setControlZones(data.matchState.chessGameInfo.controlZones);
        }
        if (data.matchState.chessGameInfo.controlZoneStatuses) {
          setControlZoneStatuses(data.matchState.chessGameInfo.controlZoneStatuses);
        }
      }
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error.message);
      setError(error.message);
    });

    socket.on('poker_error', (error: { message: string }) => {
      console.error('Poker error:', error.message);
      setError(error.message);
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
      socket.off('poker_error');
    };
  }, [matchId, socket]);

  const handlePurchaseUpgrade = (upgradeId: string) => {
    socket.emit('purchase_upgrade', { upgradeId });
  };

  const handlePokerAction = useCallback((action: string, amount?: number) => {
    console.log('Poker action:', action, 'amount:', amount);
    setError(null);
    
    // Send poker action to server
    socket.emit('poker_action', { action, amount: amount || 0 });
  }, [socket]);

  const handlePokerReady = useCallback(() => {
    console.log('Sending ready signal');
    setError(null);
    socket.emit('poker_ready', { ready: true });
  }, [socket]);

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
        <div className="info-sidebar">
          <div className="team-economy-box">
            <h3>Team Economy</h3>
            <div className="treasury-item">
              <span className="treasury-label">Your treasury</span>
              <span className="treasury-value">
                <span className="currency-symbol">₿</span>
                {economy[matchState.playerTeam as 'white' | 'black']}
              </span>
            </div>
            <div className="treasury-item">
              <span className="treasury-label">Opponent's</span>
              <span className="treasury-value">
                <span className="currency-symbol">₿</span>
                {economy[matchState.playerTeam === 'white' ? 'black' : 'white']}
              </span>
            </div>
          </div>
          
          <div className="control-zones-box">
            <h3>Control zones</h3>
            {controlZoneStatuses.length > 0 ? (
              <div className="zone-list">
                {controlZoneStatuses.map((status, index) => (
                  <div key={index} className="zone-item">
                    <span className="zone-label">Zone {String.fromCharCode(65 + index)}</span>
                    <span className="zone-value">{status.controlledBy || 'Neutral'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="zone-list">
                <div className="zone-item">
                  <span className="zone-label">Zone A</span>
                  <span className="zone-value">-</span>
                </div>
                <div className="zone-item">
                  <span className="zone-label">Zone B</span>
                  <span className="zone-value">-</span>
                </div>
                <div className="zone-item">
                  <span className="zone-label">Zone C</span>
                  <span className="zone-value">-</span>
                </div>
              </div>
            )}
          </div>

          <div className="chess-board-box">
            {chessBoard && (
              <MiniChessBoard 
                board={chessBoard} 
                currentPlayer={chessCurrentPlayer}
                controlZones={controlZones}
              />
            )}
          </div>
          
          <div className="chess-moves-box">
            <h3>Chess Moves</h3>
            <div className="move-list">
              {chessMoveHistory.length === 0 ? (
                <p className="no-moves">No moves yet</p>
              ) : (
                chessMoveHistory.slice(-10).map((move, index) => (
                  <div key={chessMoveHistory.length - 10 + index} className={`move-entry ${move.piece.color}`}>
                    {formatMove(move, chessMoveHistory.length - 10 + index)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="poker-game-section">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError(null)} className="dismiss-error">✕</button>
            </div>
          )}
          {pokerState ? (
            <PokerTable 
              gameState={pokerState} 
              onAction={handlePokerAction}
              onReady={handlePokerReady}
            />
          ) : (
            <div className="game-b-placeholder">
              <p>Waiting for poker game to start...</p>
              <p>Both poker players must join before the game begins.</p>
              {process.env.NODE_ENV === 'development' && (
                <button 
                  onClick={() => {
                    console.log('Sending debug_start_poker');
                    socket.emit('debug_start_poker');
                  }}
                  style={{ marginTop: '20px', padding: '10px 20px' }}
                >
                  Debug: Start Poker Game
                </button>
              )}
            </div>
          )}
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