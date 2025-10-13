import { io, Socket } from 'socket.io-client';
import { GameState, Position, Move, ControlZoneStatus, PieceColor, BarracksPiece } from '../types';
import { UpgradeDefinition, UpgradeState, TeamEconomy } from '../types/upgrades';

export interface MultiplayerGameState extends Omit<GameState, 'selectedSquare' | 'possibleMoves'> {
  id: string;
  status: string;
  players: Record<string, { name: string; color: string; ready: boolean }>;
  playerColor: PieceColor | null;
  isPlayerTurn: boolean;
  controlZoneStatuses: ControlZoneStatus[];
  upgrades: UpgradeState;
  economy: TeamEconomy;
}

export interface WaitingMatch {
  id: string;
  status: string;
  playerCount: number;
  createdAt: string;
  availableSlots?: Array<{ team: string; gameSlot: string }>;
}

export interface MatchState {
  id: string;
  status: string;
  playerRole: string;
  playerTeam: string;
  playerGameSlot: string;
  teams: {
    white: {
      economy: number;
      upgrades: any;
      barracks?: BarracksPiece[];
      players: {
        A?: { name: string; ready: boolean };
        B?: { name: string; ready: boolean };
      };
    };
    black: {
      economy: number;
      upgrades: any;
      barracks?: BarracksPiece[];
      players: {
        A?: { name: string; ready: boolean };
        B?: { name: string; ready: boolean };
      };
    };
  };
  currentGame?: {
    type: string;
    board?: any;
    currentPlayer: string;
    moveHistory?: Move[];
    controlZones?: any[];
    controlZoneStatuses?: ControlZoneStatus[];
    rookLinks?: any[];
    lastRookLink?: any;
    isPlayerTurn: boolean;
  };
  chessGameInfo?: {
    moveHistory: Move[];
    currentPlayer: string;
    board: any;
    controlZones?: any[];
    controlZoneStatuses?: ControlZoneStatus[];
  };
  winCondition?: string | null;
  winReason?: string | null;
  controlZoneOwnership?: Record<string, string | null>;
  activePokerEffects?: Record<string, any[]>;
  controlZonePokerEffects?: Record<string, any>;
  dualMovementState?: {
    active: boolean;
    firstPawnPosition: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
    playerTeam: string | null;
  };
  isSecondPawnMove?: boolean;
}

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('Attempting to connect to:', this.serverUrl);
      this.socket = io(this.serverUrl, {
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        console.error('Server URL:', this.serverUrl);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });

      // Add timeout for connection attempt
      const timeoutId = setTimeout(() => {
        if (!this.socket?.connected) {
          console.error('Connection timeout - server may not be responding');
          this.socket?.disconnect();
          reject(new Error('Connection timeout - please ensure the server is running on port 3001'));
        }
      }, 20000);
      
      // Clear timeout on successful connection
      this.socket.on('connect', () => {
        clearTimeout(timeoutId);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Match management
  createMatch(playerName: string, preferredTeam?: string, preferredGameSlot?: string): Promise<{ matchId: string; assignedRole: string; matchState: MatchState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('create_match', { playerName, preferredTeam, preferredGameSlot });

      // Listen for both events to ensure we catch the response
      const handleSuccess = (data: any) => {
        this.socket?.off('match_created');
        this.socket?.off('match_joined');
        this.socket?.off('error');
        resolve(data);
      };

      const handleError = (error: any) => {
        this.socket?.off('match_created');
        this.socket?.off('match_joined');
        this.socket?.off('error');
        reject(new Error(error.message));
      };

      this.socket.once('match_created', handleSuccess);
      this.socket.once('match_joined', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  // Legacy game management (for backward compatibility)
  createGame(playerName: string): Promise<{ gameId: string; gameState: MultiplayerGameState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('create_game', { playerName });

      // Listen for both events to ensure we catch the response
      const handleSuccess = (data: any) => {
        this.socket?.off('game_created');
        this.socket?.off('game_joined');
        this.socket?.off('error');
        resolve(data);
      };

      const handleError = (error: any) => {
        this.socket?.off('game_created');
        this.socket?.off('game_joined');
        this.socket?.off('error');
        reject(new Error(error.message));
      };

      this.socket.once('game_created', handleSuccess);
      this.socket.once('game_joined', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  joinMatch(matchId: string, playerName: string, preferredTeam?: string, preferredGameSlot?: string): Promise<{ matchId: string; assignedRole: string; matchState: MatchState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('join_match', { matchId, playerName, preferredTeam, preferredGameSlot });

      const handleSuccess = (data: any) => {
        this.socket?.off('match_joined');
        this.socket?.off('error');
        resolve(data);
      };

      const handleError = (error: any) => {
        this.socket?.off('match_joined');
        this.socket?.off('error');
        reject(new Error(error.message));
      };

      this.socket.once('match_joined', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  joinGame(gameId: string, playerName: string): Promise<{ gameId: string; gameState: MultiplayerGameState }> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('join_game', { gameId, playerName });

      const handleSuccess = (data: any) => {
        this.socket?.off('game_joined');
        this.socket?.off('error');
        resolve(data);
      };

      const handleError = (error: any) => {
        this.socket?.off('game_joined');
        this.socket?.off('error');
        reject(new Error(error.message));
      };

      this.socket.once('game_joined', handleSuccess);
      this.socket.once('error', handleError);
    });
  }

  makeMove(from: Position, to: Position, gameSlot?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('make_move', { from, to, gameSlot: gameSlot || 'A' });

      // The response will come through the 'move_made' event listener
      resolve();
    });
  }

  skipSecondPawnMove(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('skip_second_pawn_move');

      // The response will come through the 'match_state_updated' event listener
      resolve();
    });
  }

  getWaitingMatches(): Promise<WaitingMatch[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('get_waiting_matches');

      // Set up one-time listeners with timeout
      const timeout = setTimeout(() => {
        this.socket?.off('waiting_matches');
        this.socket?.off('error');
        // Fallback to empty array if no response
        resolve([]);
      }, 5000);

      this.socket.once('waiting_matches', (matches) => {
        clearTimeout(timeout);
        resolve(matches);
      });

      this.socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });
    });
  }

  getWaitingGames(): Promise<WaitingMatch[]> {
    // Legacy method for backward compatibility
    return this.getWaitingMatches();
  }

  // Event listeners
  onGameJoined(callback: (data: { gameId: string; gameState: MultiplayerGameState }) => void): void {
    this.socket?.on('game_joined', callback);
  }

  onMoveMade(callback: (data: { move: Move; gameState: MultiplayerGameState }) => void): void {
    this.socket?.on('move_made', callback);
  }

  onPlayerDisconnected(callback: (data: { gameState: MultiplayerGameState }) => void): void {
    this.socket?.on('player_disconnected', callback);
  }

  onMatchesUpdated(callback: (matches: WaitingMatch[]) => void): void {
    this.socket?.on('matches_updated', callback);
  }

  onGamesUpdated(callback: (games: WaitingMatch[]) => void): void {
    // Legacy method for backward compatibility
    this.onMatchesUpdated(callback);
  }

  onError(callback: (error: { message: string }) => void): void {
    this.socket?.on('error', callback);
  }

  onGameStateUpdated(callback: (data: { gameState: MultiplayerGameState }) => void): void {
    this.socket?.on('game_state_updated', callback);
  }

  onAvailableUpgrades(callback: (data: { upgrades: UpgradeDefinition[] }) => void): void {
    this.socket?.on('available_upgrades', callback);
  }

  onUpgradePurchased(callback: (data: { upgradeId: string; upgrades: UpgradeState; economy: TeamEconomy }) => void): void {
    this.socket?.on('upgrade_purchased', callback);
  }

  onUpgradeError(callback: (data: { message: string }) => void): void {
    this.socket?.on('upgrade_error', callback);
  }

  // Upgrade actions
  getAvailableUpgrades(): void {
    this.socket?.emit('get_available_upgrades');
  }

  purchaseUpgrade(upgradeId: string): void {
    this.socket?.emit('purchase_upgrade', { upgradeId });
  }

  getPossibleMoves(position: Position, gameSlot?: string): void {
    this.socket?.emit('get_possible_moves', { position, gameSlot: gameSlot || 'A' });
  }

  onPossibleMoves(callback: (data: { position: Position; moves: Position[] }) => void): void {
    this.socket?.on('possible_moves', callback);
  }

  // Remove event listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketService = new SocketService();