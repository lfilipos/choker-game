import React, { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import MiniChessBoard from './MiniChessBoard';
import MiniControlZoneStatus from './MiniControlZoneStatus';
import CompactStore from './CompactStore';
import { PokerTable } from './PokerTable';
import GameOverlay from './GameOverlay';
import { PokerGameState, PokerMatchState } from '../types/poker';
import { ChessPiece, Move, UpgradeState, TeamEconomy as TeamEconomyType, ControlZone, ControlZoneStatus, PurchasablePiece, PieceType } from '../types';
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
  winCondition?: string | null;
  winReason?: string | null;
  controlZonePokerEffects?: Record<string, any>;
}

interface GameBViewProps {
  matchId: string;
  socket: Socket;
  playerName: string;
  onLeaveGame: () => void;
}

const GameBView: React.FC<GameBViewProps> = ({ matchId, socket, playerName, onLeaveGame }) => {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [chessMoveHistory, setChessMoveHistory] = useState<Move[]>([]);
  const [availableUpgrades, setAvailableUpgrades] = useState<any[]>([]);
  const [purchasablePieces, setPurchasablePieces] = useState<PurchasablePiece[]>([]);
  const [chessBoard, setChessBoard] = useState<(ChessPiece | null)[][] | null>(null);
  const [chessCurrentPlayer, setChessCurrentPlayer] = useState<string>('white');
  const [controlZones, setControlZones] = useState<ControlZone[]>([]);
  const [controlZoneStatuses, setControlZoneStatuses] = useState<ControlZoneStatus[]>([]);
  const [pokerState, setPokerState] = useState<PokerGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameWinner, setGameWinner] = useState<'white' | 'black' | null>(null);
  const [winReason, setWinReason] = useState<string | undefined>(undefined);
  const [controlZonePokerEffects, setControlZonePokerEffects] = useState<Record<string, any>>({});
  const [availableModifiers, setAvailableModifiers] = useState<any[]>([]);
  const [blindLevel, setBlindLevel] = useState<number>(1);
  const [blindAmounts, setBlindAmounts] = useState<{smallBlind: number, bigBlind: number}>({smallBlind: 5, bigBlind: 10});

  useEffect(() => {
    // Get initial match state
    socket.emit('get_match_state', { matchId });

    // Listen for match updates
    socket.on('match_state', (state: MatchState) => {
      console.log('Received match state:', state);
      console.log('Current game:', state.currentGame);
      setMatchState(state);
      
      // Check for game end
      if (state.winCondition) {
        setGameWinner(state.winCondition as 'white' | 'black');
        setWinReason(state.winReason || undefined);
      }
      // Update control zone poker effects
      if (state.controlZonePokerEffects) {
        setControlZonePokerEffects(state.controlZonePokerEffects);
      }
      // Update blind level and amounts if present
      if ((state as any).blindLevel) {
        setBlindLevel((state as any).blindLevel);
      }
      if ((state as any).blindAmounts) {
        setBlindAmounts((state as any).blindAmounts);
      }
      
      // Request modifiers after we have match state
      console.log('Requesting modifiers after match state received');
      socket.emit('get_modifiers');
      
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
      
      // Check for game end
      if (data.matchState.winCondition) {
        setGameWinner(data.matchState.winCondition as 'white' | 'black');
        setWinReason(data.matchState.winReason || undefined);
      }
      
      // Update blind level and amounts if present
      if ((data.matchState as any).blindLevel) {
        setBlindLevel((data.matchState as any).blindLevel);
      }
      if ((data.matchState as any).blindAmounts) {
        setBlindAmounts((data.matchState as any).blindAmounts);
      }
      
      // Request modifiers after state update
      socket.emit('get_modifiers');
      
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
          // Request updated purchasable pieces (prices may have changed due to Zone C)
          socket.emit('get_purchasable_pieces');
        }
      }
    });

    socket.on('move_made', (data: { move: Move; gameSlot: string; matchState: MatchState }) => {
      // Update match state
      setMatchState(data.matchState);
      
      // Check for game end
      if (data.matchState.winCondition) {
        setGameWinner(data.matchState.winCondition as 'white' | 'black');
        setWinReason(data.matchState.winReason || undefined);
      }
      
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
          // Request updated purchasable pieces (prices may have changed due to Zone C)
          socket.emit('get_purchasable_pieces');
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

    // Get available upgrades and purchasable pieces
    console.log('GameBView: Requesting upgrades and purchasable pieces');
    socket.emit('get_available_upgrades');
    socket.emit('get_purchasable_pieces');
    
    socket.on('available_upgrades', (data: { upgrades: any[] }) => {
      setAvailableUpgrades(data.upgrades);
    });

    socket.on('purchasable_pieces', (data: { pieces: PurchasablePiece[] }) => {
      console.log('Received purchasable pieces:', data.pieces);
      setPurchasablePieces(data.pieces);
    });

    socket.on('piece_purchased', (data: any) => {
      console.log('Piece purchased:', data);
      // Update match state if provided
      if (data.matchState) {
        setMatchState(data.matchState);
        // Show success message using the team from the data
        if (data.team === data.matchState.playerTeam) {
          setError(`Successfully purchased ${data.pieceType}!`);
          setTimeout(() => setError(null), 3000);
        }
      }
    });

    socket.on('purchase_error', (error: { message: string }) => {
      setError(error.message);
    });

    // Listen for available modifiers (requested after match state is received)
    socket.on('available_modifiers', (data: { modifiers: any[] }) => {
      console.log('GameBView - Received available modifiers:', data.modifiers);
      console.log('GameBView - First modifier details:', data.modifiers?.[0]);
      setAvailableModifiers(data.modifiers);
    });

    socket.on('modifier_purchased', (data: any) => {
      console.log('Modifier purchased:', data);
      setError(data.message);
      setTimeout(() => setError(null), 3000);
      // Request updated modifiers list
      socket.emit('get_modifiers');
    });

    socket.on('modifier_error', (error: { message: string }) => {
      setError(error.message);
    });

    socket.on('blind_level_changed', (data: { blindLevel: number, blindAmounts: any }) => {
      console.log('Blind level changed:', data);
      setBlindLevel(data.blindLevel);
      setBlindAmounts(data.blindAmounts);
      setError(`Blind level changed to ${data.blindLevel}! SB: ${data.blindAmounts.smallBlind}, BB: ${data.blindAmounts.bigBlind}`);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off('match_state');
      socket.off('match_state_updated');
      socket.off('move_made');
      socket.off('error');
      socket.off('poker_error');
      socket.off('available_upgrades');
      socket.off('purchasable_pieces');
      socket.off('piece_purchased');
      socket.off('purchase_error');
      socket.off('available_modifiers');
      socket.off('modifier_purchased');
      socket.off('modifier_error');
      socket.off('blind_level_changed');
    };
  }, [matchId, socket]);

  const handlePurchaseUpgrade = (upgradeId: string) => {
    socket.emit('purchase_upgrade', { upgradeId });
  };

  const handlePurchaseModifier = (modifierId: string) => {
    console.log('Purchasing modifier:', modifierId);
    socket.emit('purchase_modifier', { modifierId });
  };

  const handlePurchasePiece = (pieceType: PieceType) => {
    console.log('Purchasing piece:', pieceType);
    socket.emit('purchase_piece', {
      matchId: matchId,
      pieceType: pieceType
    });
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
        {/* Admin Panel disabled in Game B view */}
      </div>

      <div className="game-b-content">
        <div className="info-sidebar">
          <div className="control-zones-box">
            <h3>Control zones</h3>
            {controlZoneStatuses.length > 0 ? (
              <div className="zone-list">
                {controlZoneStatuses.map((status, index) => {
                  const zoneId = String.fromCharCode(65 + index);
                  const effect = controlZonePokerEffects[zoneId];
                  return (
                    <div key={index} className={`zone-item ${status.controlledBy === 'neutral' ? 'neutral' : status.controlledBy}`}>
                      <div className="zone-header">
                        <span className="zone-label">Zone {zoneId}</span>
                        <span className="zone-value">{status.controlledBy === 'neutral' ? 'Neutral' : status.controlledBy.charAt(0).toUpperCase() + status.controlledBy.slice(1)}</span>
                      </div>
                      {effect && (
                        <div className="zone-effect-text">
                          {effect.icon && <span className="effect-icon">{effect.icon}</span>}
                          <span className="effect-desc">{effect.description}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
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
          
          <CompactStore
            playerTeam={matchState.playerTeam as 'white' | 'black'}
            economy={economy}
            matchId={matchId}
            purchasablePieces={purchasablePieces}
            onPurchaseUpgrade={handlePurchaseUpgrade}
            onPurchaseModifier={handlePurchaseModifier}
            onPurchasePiece={handlePurchasePiece}
          />
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
              economy={economy}
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

      {/* Admin panel not available in Game B */}
      
      <GameOverlay 
        winner={gameWinner}
        reason={winReason}
        playerTeam={matchState?.playerTeam}
        onClose={onLeaveGame}
      />
    </div>
  );
};

export default GameBView;