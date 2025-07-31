import { io, Socket } from 'socket.io-client';
import { GameState, Position, Move, ControlZoneStatus } from '../types';
import { UpgradeDefinition, UpgradeState, TeamEconomy } from '../types/upgrades';

export interface MultiplayerGameState extends Omit<GameState, 'selectedSquare' | 'possibleMoves'> {
  id: string;
  status: string;
  players: Record<string, { name: string; color: string; ready: boolean }>;
  playerColor: string | null;
  isPlayerTurn: boolean;
  controlZoneStatuses: ControlZoneStatus[];
  upgrades: UpgradeState;
  economy: TeamEconomy;
}

export interface WaitingGame {
  id: string;
  status: string;
  playerCount: number;
  createdAt: string;
  creatorName: string;
}

class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:3001';
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket?.id);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      this.socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Game management
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

  makeMove(from: Position, to: Position): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('make_move', { from, to });

      // The response will come through the 'move_made' event listener
      resolve();
    });
  }

  getWaitingGames(): Promise<WaitingGame[]> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Not connected'));
        return;
      }

      this.socket.emit('get_waiting_games');

      this.socket.once('waiting_games', (games) => {
        resolve(games);
      });

      this.socket.once('error', (error) => {
        reject(new Error(error.message));
      });
    });
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

  onGamesUpdated(callback: (games: WaitingGame[]) => void): void {
    this.socket?.on('games_updated', callback);
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

  getPossibleMoves(position: Position): void {
    this.socket?.emit('get_possible_moves', { position });
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
}

export const socketService = new SocketService();