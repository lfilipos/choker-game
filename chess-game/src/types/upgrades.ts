import { PieceType, PieceColor } from '../types';

export type UpgradeType = 'movement' | 'attack' | 'defense' | 'special';
export type ActivationMethod = 'purchase' | 'control_zone' | 'achievement' | 'timed';

export interface UpgradeRequirement {
  type: 'capture' | 'purchase' | 'treasury' | 'control_zone';
  pieceType?: PieceType;
  count?: number;
  amount?: number;
  zoneId?: string;
  upgradeId?: string; // For purchase requirements (e.g., requires previous tier upgrade)
}

export interface TieredUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  summary: string;
  cost: number;
  pieceType: PieceType;
  tier: 1 | 2 | 3;
  requirements: UpgradeRequirement[];
  effects: UpgradeEffect[];
  isPurchased?: boolean;
  isAvailable?: boolean;
}

export interface UpgradeProgress {
  pieceType: PieceType;
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
  captureCounts: Record<PieceType, number>;
}

export interface UpgradeEffect {
  type: UpgradeType;
  value: number | string;
  description: string;
}

// Legacy types for backward compatibility during transition
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