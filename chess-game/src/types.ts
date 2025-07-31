export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';

export interface ChessPiece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: ChessPiece;
  capturedPiece?: ChessPiece;
}

export type Board = (ChessPiece | null)[][];

export type ControlZoneType = 'A' | 'B' | 'C';

export interface ControlZone {
  id: ControlZoneType;
  squares: Position[];
  color: string;
  name: string;
}

export interface ControlZoneStatus {
  zone: ControlZone;
  whitePieces: number;
  blackPieces: number;
  controlledBy: PieceColor | 'neutral';
}

export type UpgradeType = 'movement' | 'attack' | 'defense' | 'special';
export type ActivationMethod = 'purchase' | 'control_zone' | 'achievement' | 'timed';

export interface UpgradeEffect {
  type: UpgradeType;
  value: number | string;
  description: string;
}

export interface UpgradeDefinition {
  id: string;
  name: string;
  description: string;
  cost: number;
  pieceType: PieceType;
  effects: UpgradeEffect[];
  activationMethod: ActivationMethod;
  duration?: number; // For temporary upgrades
}

export interface TeamUpgrades {
  [pieceType: string]: string[]; // Array of upgrade IDs
}

export interface UpgradeState {
  white: TeamUpgrades;
  black: TeamUpgrades;
}

export interface TeamEconomy {
  white: number;
  black: number;
}

export interface GameState {
  board: Board;
  currentPlayer: PieceColor;
  selectedSquare: Position | null;
  possibleMoves: Position[];
  gameStatus: 'playing' | 'check' | 'checkmate' | 'stalemate';
  moveHistory: Move[];
  controlZones: ControlZone[];
  upgrades: UpgradeState;
  economy: TeamEconomy;
}