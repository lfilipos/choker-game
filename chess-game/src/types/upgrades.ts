import { PieceType, PieceColor } from '../types';

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
  duration?: number;
  canAfford?: boolean;
}

export interface TeamUpgrades {
  [pieceType: string]: string[];
}

export interface UpgradeState {
  white: TeamUpgrades;
  black: TeamUpgrades;
}

export interface TeamEconomy {
  white: number;
  black: number;
}