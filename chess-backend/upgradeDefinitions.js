const { PieceType, UpgradeType, RequirementType, UpgradeTier } = require('./types');

// New tiered upgrade definitions with sequential unlocking and requirement-based access
const TIERED_UPGRADES = {
  pawn: {
    tier1: {
      id: 'pawn_tier1',
      name: 'Enhanced Movement',
      description: 'Pawns can move up to 3 squares on their first move',
      summary: 'Move two spaces on first move',
      cost: 250,
      pieceType: PieceType.PAWN,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.PAWN, count: 1 }],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 3,
        description: 'Initial move extended to 3 squares'
      }]
    },
    tier2: {
      id: 'pawn_tier2',
      name: 'Extended Capture Range',
      description: 'Pawns can capture diagonally from 2 squares away',
      summary: 'Capture from two squares away',
      cost: 350,
      pieceType: PieceType.PAWN,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'pawn_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.PAWN, count: 2 }
      ],
      effects: [{
        type: UpgradeType.ATTACK,
        value: 2,
        description: 'Diagonal capture range increased to 2'
      }]
    },
    tier3: {
      id: 'pawn_tier3',
      name: 'Dual Pawn Movement',
      description: 'Pawns can move two pawns in one turn',
      summary: 'Move two pawns in one turn',
      cost: 500,
      pieceType: PieceType.PAWN,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'pawn_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.PAWN, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'dual_movement',
        description: 'Can move two pawns in one turn'
      }]
    }
  },
  rook: {
    tier1: {
      id: 'rook_tier1',
      name: 'Defensive Protection',
      description: 'Rooks can protect pieces behind them from capture',
      summary: 'Defend piece behind it',
      cost: 200,
      pieceType: PieceType.ROOK,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.ROOK, count: 1 }],
      effects: [{
        type: UpgradeType.DEFENSE,
        value: 'protection',
        description: 'Protects pieces behind rook from capture'
      }]
    },
    tier2: {
      id: 'rook_tier2',
      name: 'Rook Linking',
      description: 'Rooks can link with one other rook within 2 squares to create a wall',
      summary: 'Link with one other rook within 2 squares',
      cost: 400,
      pieceType: PieceType.ROOK,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'rook_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.ROOK, count: 2 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'rook_linking',
        description: 'Can link with other rooks to create walls'
      }]
    },
    tier3: {
      id: 'rook_tier3',
      name: 'Extended Rook Linking',
      description: 'Rooks can link with one other rook within 3 squares',
      summary: 'Link with one other rook within 3 squares',
      cost: 600,
      pieceType: PieceType.ROOK,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'rook_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.ROOK, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'extended_rook_linking',
        description: 'Extended linking range to 3 squares'
      }]
    }
  },
  knight: {
    tier1: {
      id: 'knight_tier1',
      name: 'Adjacent Movement',
      description: 'Knights can move to adjacent squares in addition to L-shape moves',
      summary: 'Move to adjacent squares',
      cost: 300,
      pieceType: PieceType.KNIGHT,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.KNIGHT, count: 1 }],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 'adjacent',
        description: 'Can move to adjacent squares like a king'
      }]
    },
    tier2: {
      id: 'knight_tier2',
      name: 'Extended Leap',
      description: 'Knights can move in extended L-shape patterns (3-2, 2-3)',
      summary: 'Extended L-shape movement patterns',
      cost: 450,
      pieceType: PieceType.KNIGHT,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'knight_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.KNIGHT, count: 2 }
      ],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 'extended_leap',
        description: 'Additional 3-2 and 2-3 L-shape movement patterns'
      }]
    },
    tier3: {
      id: 'knight_tier3',
      name: 'Double Movement',
      description: 'Knights can move twice per turn (cannot capture twice)',
      summary: 'Move twice per turn',
      cost: 700,
      pieceType: PieceType.KNIGHT,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'knight_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.KNIGHT, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'double_movement',
        description: 'Can move twice per turn'
      }]
    }
  },
  bishop: {
    tier1: {
      id: 'bishop_tier1',
      name: 'Orthogonal Movement',
      description: 'Bishops can move one square orthogonally once per game',
      summary: 'Move one square orthogonally once per game',
      cost: 250,
      pieceType: PieceType.BISHOP,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.BISHOP, count: 1 }],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'orthogonal_once',
        description: 'One orthogonal move per game'
      }]
    },
    tier2: {
      id: 'bishop_tier2',
      name: 'Piercing Vision',
      description: 'Bishops can jump over one piece per move',
      summary: 'Jump over one piece per move',
      cost: 400,
      pieceType: PieceType.BISHOP,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'bishop_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.BISHOP, count: 2 }
      ],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 'jump_one',
        description: 'Can jump over one piece per move'
      }]
    },
    tier3: {
      id: 'bishop_tier3',
      name: 'Color Transcendence',
      description: 'Bishops can move on both colored squares freely',
      summary: 'Move freely on both colored squares',
      cost: 650,
      pieceType: PieceType.BISHOP,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'bishop_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.BISHOP, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'color_transcendence',
        description: 'Can move on both colored squares without restriction'
      }]
    }
  },
  queen: {
    tier1: {
      id: 'queen_tier1',
      name: 'Extended Movement',
      description: 'Queen can move up to 2 squares in any direction',
      summary: 'Move up to 2 squares in any direction',
      cost: 400,
      pieceType: PieceType.QUEEN,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.QUEEN, count: 1 }],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 2,
        description: 'Can move up to 2 squares in any direction'
      }]
    },
    tier2: {
      id: 'queen_tier2',
      name: 'Advanced Capture',
      description: 'Queen can capture through pawns and evade capture more effectively',
      summary: 'Capture through pawns and evade capture',
      cost: 550,
      pieceType: PieceType.QUEEN,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'queen_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.QUEEN, count: 2 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'advanced_capture',
        description: 'Can capture through pawns and has enhanced evasion'
      }]
    },
    tier3: {
      id: 'queen_tier3',
      name: 'Royal Teleport',
      description: 'Queen can teleport to any empty square once per game',
      summary: 'Teleport to any empty square once per game',
      cost: 750,
      pieceType: PieceType.QUEEN,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'queen_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.QUEEN, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'teleport_once',
        description: 'One teleport to any empty square per game'
      }]
    }
  },
  king: {
    tier1: {
      id: 'king_tier1',
      name: 'Enhanced Movement',
      description: 'King can move 2 squares in any direction',
      summary: 'Move 2 squares in any direction',
      cost: 350,
      pieceType: PieceType.KING,
      tier: UpgradeTier.TIER_1,
      requirements: [{ type: RequirementType.CAPTURE, pieceType: PieceType.KING, count: 1 }],
      effects: [{
        type: UpgradeType.MOVEMENT,
        value: 2,
        description: 'Can move up to 2 squares in any direction'
      }]
    },
    tier2: {
      id: 'king_tier2',
      name: 'Piece Manipulation',
      description: 'King can swap positions with any allied piece once per game',
      summary: 'Swap positions with any allied piece once per game',
      cost: 500,
      pieceType: PieceType.KING,
      tier: UpgradeTier.TIER_2,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'king_tier1' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.KING, count: 2 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'piece_swap',
        description: 'Can swap positions with any allied piece once per game'
      }]
    },
    tier3: {
      id: 'king_tier3',
      name: 'Royal Command',
      description: 'King can move any allied piece to an adjacent square once per turn',
      summary: 'Move any allied piece to adjacent square once per turn',
      cost: 700,
      pieceType: PieceType.KING,
      tier: UpgradeTier.TIER_3,
      requirements: [
        { type: RequirementType.PURCHASE, upgradeId: 'king_tier2' },
        { type: RequirementType.CAPTURE, pieceType: PieceType.KING, count: 3 }
      ],
      effects: [{
        type: UpgradeType.SPECIAL,
        value: 'royal_command',
        description: 'Can move any allied piece to adjacent square once per turn'
      }]
    }
  }
};

// Starting economy values
const STARTING_ECONOMY = {
  white: 500,
  black: 500
};

// Income rates
const INCOME_RATES = {
  per_turn: 10,
  per_capture: 50,
  per_control_zone: 25
};

module.exports = {
  TIERED_UPGRADES,
  STARTING_ECONOMY,
  INCOME_RATES
};