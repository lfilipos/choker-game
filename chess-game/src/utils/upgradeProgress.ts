import { PieceType, PieceColor, TeamUpgrades } from '../types';
import { UpgradeDefinition } from '../types/upgrades';

export type PipState = 'empty' | 'partial' | 'ready' | 'completed';

export interface RequirementProgress {
  met: boolean;
  current: number;
  required: number;
  description: string;
}

export interface UpgradeProgress {
  upgradeId: string;
  upgrade: UpgradeDefinition;
  state: PipState;
  progress: number; // 0-100 percentage
  requirements: RequirementProgress[];
}

// Mapping of piece types to their upgrade IDs by level
export const UPGRADE_PATHS: Record<PieceType, Record<number, string>> = {
  pawn: {
    1: 'pawn_speed_boost',
    2: 'pawn_diagonal_range',
    3: 'pawn_dual_movement'
  },
  knight: {
    1: 'nimble_knight',
    2: 'knight_extended_leap',
    3: 'knight_double_jump'
  },
  bishop: {
    1: 'bishop_color_break',
    2: 'bishop_piercing',
    3: 'bishop_royal_protection'
  },
  rook: {
    1: 'rook_pawn_protection',
    2: 'rook_wall',
    3: 'enhanced_rook_wall'
  },
  queen: {
    1: 'queens_hook',
    2: 'enhanced_queens_hook',
    3: 'queen_aura'
  },
  king: {
    1: 'king_double_step',
    2: 'king_royal_command',
    3: 'king_swap'
  }
};

// Static upgrade definitions for tooltip display
const STATIC_UPGRADE_DEFINITIONS: Record<string, { name: string; description: string; effects: any[] }> = {
  'pawn_speed_boost': {
    name: 'Swift Advance',
    description: 'Pawns can move 2 squares forward at any time, not just on their first move.',
    effects: [
      { type: 'movement', description: 'Move 2 squares forward from any position' }
    ]
  },
  'pawn_diagonal_range': {
    name: 'Extended Reach',
    description: 'Pawns can capture diagonally up to 2 squares away.',
    effects: [
      { type: 'attack', description: 'Capture pieces 2 squares diagonally' }
    ]
  },
  'pawn_dual_movement': {
    name: 'Dual Pawn Movement',
    description: 'When moving a pawn, you may immediately move another pawn on the same turn.',
    effects: [
      { type: 'special', description: 'Move two pawns in one turn' }
    ]
  },
  'nimble_knight': {
    name: 'Nimble Knight',
    description: 'After a knight moves, you may immediately move it again if desired.',
    effects: [
      { type: 'movement', description: 'Knights can move twice per turn' }
    ]
  },
  'knight_extended_leap': {
    name: 'Grand Leap',
    description: 'Knights can jump to squares that are 3 squares away in one direction and 2 in another.',
    effects: [
      { type: 'movement', description: 'Extended L-shape movement (3x2 or 2x3)' }
    ]
  },
  'knight_double_jump': {
    name: 'Double Jump',
    description: 'Knights can make two consecutive jumps in a single move.',
    effects: [
      { type: 'movement', description: 'Jump twice in sequence' }
    ]
  },
  'bishop_color_break': {
    name: 'Sidestep',
    description: 'Bishops can move one square orthogonally, allowing them to change square colors.',
    effects: [
      { type: 'movement', description: 'Move 1 square horizontally or vertically' }
    ]
  },
  'bishop_piercing': {
    name: "Bishop's Hop",
    description: 'Bishops can jump over one piece in their diagonal path.',
    effects: [
      { type: 'movement', description: 'Jump over one piece diagonally' }
    ]
  },
  'bishop_royal_protection': {
    name: 'Royal Protection',
    description: 'Bishops adjacent to your King give it immunity from check for that turn.',
    effects: [
      { type: 'defense', description: 'King immune to check when protected by adjacent Bishop' }
    ]
  },
  'rook_pawn_protection': {
    name: 'Pawn Defense',
    description: 'Pawns in the same row or column as a Rook cannot be captured.',
    effects: [
      { type: 'defense', description: 'Pawns protected by Rooks in same row/column' }
    ]
  },
  'rook_wall': {
    name: 'Rook Wall',
    description: 'Place a temporary wall that blocks movement for 2 turns.',
    effects: [
      { type: 'special', description: 'Create blocking wall for 2 turns' }
    ]
  },
  'enhanced_rook_wall': {
    name: 'Enhanced Rook Wall',
    description: 'Rook walls now last for 3 turns instead of 2.',
    effects: [
      { type: 'special', description: 'Walls last 3 turns (upgraded from 2)' }
    ]
  },
  'queens_hook': {
    name: "Queen's Hook",
    description: 'After moving the Queen, you may move it one additional square.',
    effects: [
      { type: 'movement', description: 'Queens get bonus move after initial movement' }
    ]
  },
  'enhanced_queens_hook': {
    name: "Enhanced Queen's Hook",
    description: 'The Queen can now make up to 2 additional moves after the initial move.',
    effects: [
      { type: 'movement', description: 'Queens get 2 bonus moves (upgraded from 1)' }
    ]
  },
  'queen_aura': {
    name: 'Royal Aura',
    description: 'Pieces adjacent to your Queen gain +1 movement range.',
    effects: [
      { type: 'special', description: 'Adjacent pieces get extended movement' }
    ]
  },
  'king_double_step': {
    name: 'Royal Stride',
    description: 'King can move up to 2 squares in any direction.',
    effects: [
      { type: 'movement', description: 'Move 2 squares instead of 1' }
    ]
  },
  'king_royal_command': {
    name: 'Royal Command',
    description: 'The King can command an adjacent piece to move on the King\'s turn.',
    effects: [
      { type: 'special', description: 'Command adjacent piece to move' }
    ]
  },
  'king_swap': {
    name: 'Royal Exchange',
    description: 'King can swap positions with any friendly piece for a cost.',
    effects: [
      { type: 'special', description: 'Swap positions with friendly pieces' }
    ]
  }
};

// Static upgrade names for backward compatibility
const UPGRADE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(STATIC_UPGRADE_DEFINITIONS).map(([id, def]) => [id, def.name])
);

interface TeamStats {
  economy: number;
  captureCount: Record<string, number>;
  totalCaptures: number;
  upgrades: TeamUpgrades;
}

/**
 * Calculate the progress state of a single upgrade
 */
export function calculateUpgradeProgress(
  upgrade: UpgradeDefinition,
  teamStats: TeamStats
): UpgradeProgress {
  const ownedUpgrades = teamStats.upgrades[upgrade.pieceType] || [];
  
  // Check if already purchased
  if (ownedUpgrades.includes(upgrade.id)) {
    return {
      upgradeId: upgrade.id,
      upgrade,
      state: 'completed',
      progress: 100,
      requirements: []
    };
  }

  const requirements: RequirementProgress[] = [];
  let totalRequirements = 0;
  let metRequirements = 0;
  let partialProgress = 0;

  // Check prerequisite upgrade
  if (upgrade.requires) {
    totalRequirements++;
    const hasPrereq = ownedUpgrades.includes(upgrade.requires);
    if (hasPrereq) {
      metRequirements++;
      partialProgress += 100;
    }
    requirements.push({
      met: hasPrereq,
      current: hasPrereq ? 1 : 0,
      required: 1,
      description: `Requires: ${upgrade.requires}`
    });
  }

  // Check capture requirements
  if (upgrade.requirements?.captures?.byType) {
    for (const [pieceType, count] of Object.entries(upgrade.requirements.captures.byType)) {
      totalRequirements++;
      const captured = teamStats.captureCount[pieceType] || 0;
      const met = captured >= count;
      
      if (met) {
        metRequirements++;
        partialProgress += 100;
      } else if (captured > 0) {
        partialProgress += (captured / count) * 100;
      }
      
      requirements.push({
        met,
        current: captured,
        required: count,
        description: `Capture ${count} ${pieceType}(s)`
      });
    }
  }

  // Check total captures requirement
  if (upgrade.requirements?.captures?.total) {
    totalRequirements++;
    const required = upgrade.requirements.captures.total;
    const current = teamStats.totalCaptures || 0;
    const met = current >= required;
    
    if (met) {
      metRequirements++;
      partialProgress += 100;
    } else if (current > 0) {
      partialProgress += (current / required) * 100;
    }
    
    requirements.push({
      met,
      current,
      required,
      description: `Capture ${required} pieces total`
    });
  }

  // Check treasury minimum
  if (upgrade.requirements?.treasuryMin) {
    totalRequirements++;
    const required = upgrade.requirements.treasuryMin;
    const current = teamStats.economy;
    const met = current >= required;
    
    if (met) {
      metRequirements++;
      partialProgress += 100;
    } else if (current > 0) {
      partialProgress += (current / required) * 100;
    }
    
    requirements.push({
      met,
      current,
      required,
      description: `Treasury must reach ${required}`
    });
  }

  // Calculate overall progress
  const progress = totalRequirements > 0 ? partialProgress / totalRequirements : 0;

  // Determine state
  let state: PipState;
  if (metRequirements === totalRequirements && totalRequirements > 0) {
    state = 'ready';
  } else if (progress > 0) {
    state = 'partial';
  } else {
    state = 'empty';
  }

  return {
    upgradeId: upgrade.id,
    upgrade,
    state,
    progress,
    requirements
  };
}

/**
 * Get all upgrade progressions for a piece type and team
 */
export function getPieceUpgradeProgress(
  pieceType: PieceType,
  teamStats: TeamStats,
  availableUpgrades: UpgradeDefinition[]
): UpgradeProgress[] {
  const upgradePath = UPGRADE_PATHS[pieceType];
  const progressList: UpgradeProgress[] = [];
  const ownedUpgrades = teamStats.upgrades[pieceType] || [];

  for (let level = 1; level <= 3; level++) {
    const upgradeId = upgradePath[level];
    
    // Check if this upgrade is already owned
    if (ownedUpgrades.includes(upgradeId)) {
      // Create a completed progress entry for owned upgrades
      const upgrade = availableUpgrades.find(u => u.id === upgradeId);
      
      // If we have the upgrade definition, use it; otherwise create one from static definitions
      const upgradeDefinition: UpgradeDefinition = upgrade || {
        id: upgradeId,
        name: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.name || UPGRADE_NAMES[upgradeId] || `Level ${level}`,
        description: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.description || 'Upgrade purchased',
        cost: 0,
        pieceType: pieceType,
        effects: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.effects || [],
        activationMethod: 'purchase' as any,
        level: level
      };
      
      progressList.push({
        upgradeId: upgradeId,
        upgrade: upgradeDefinition,
        state: 'completed',
        progress: 100,
        requirements: []
      });
    } else {
      // Not owned - check if it's available for purchase
      const upgrade = availableUpgrades.find(u => u.id === upgradeId);
      
      if (upgrade) {
        // Found in available upgrades - calculate progress
        progressList.push(calculateUpgradeProgress(upgrade, teamStats));
      } else {
        // Not found in available upgrades - create a minimal empty pip from static definitions
        // This can happen when viewing opponent's path and they haven't unlocked it yet
        const upgradeDefinition: UpgradeDefinition = {
          id: upgradeId,
          name: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.name || UPGRADE_NAMES[upgradeId] || `Level ${level}`,
          description: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.description || 'Not yet available',
          cost: 0,
          pieceType: pieceType,
          effects: STATIC_UPGRADE_DEFINITIONS[upgradeId]?.effects || [],
          activationMethod: 'purchase' as any,
          level: level
        };
        
        progressList.push({
          upgradeId: upgradeId,
          upgrade: upgradeDefinition,
          state: 'empty',
          progress: 0,
          requirements: []
        });
      }
    }
  }

  return progressList;
}

/**
 * Get all upgrade progressions for all pieces of a team
 */
export function getAllUpgradeProgress(
  teamStats: TeamStats,
  availableUpgrades: UpgradeDefinition[]
): Record<string, UpgradeProgress[]> {
  const pieceTypes: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];
  const result: Record<string, UpgradeProgress[]> = {};

  for (const pieceType of pieceTypes) {
    result[pieceType] = getPieceUpgradeProgress(pieceType, teamStats, availableUpgrades);
  }

  return result;
}

/**
 * Get the next unpurchased upgrade for a piece type
 */
export function getNextUpgrade(
  pieceType: PieceType,
  teamStats: TeamStats,
  availableUpgrades: UpgradeDefinition[]
): UpgradeDefinition | null {
  const progressList = getPieceUpgradeProgress(pieceType, teamStats, availableUpgrades);
  
  // Find first upgrade that's not completed
  for (const progress of progressList) {
    if (progress.state !== 'completed') {
      return progress.upgrade;
    }
  }
  
  return null;
}

