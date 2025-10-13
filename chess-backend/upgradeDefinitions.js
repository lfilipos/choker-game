const { PieceType, UpgradeType, ActivationMethod } = require('./types');

const UPGRADE_DEFINITIONS = {
  // PAWN UPGRADES
  pawn_speed_boost: {
    id: 'pawn_speed_boost',
    name: 'Swift Advance',
    description: 'Pawns can move up to 3 squares on their first move',
    cost: 100,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 3,
      description: 'Initial move extended to 3 squares'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  pawn_diagonal_range: {
    id: 'pawn_diagonal_range',
    name: 'Extended Reach',
    description: 'Pawns can capture diagonally from 2 squares away',
    cost: 150,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.ATTACK,
      value: 2,
      description: 'Diagonal capture range increased to 2'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  pawn_dual_movement: {
    id: 'pawn_dual_movement',
    name: 'Dual Pawn Movement',
    description: 'Move two pawns in sequence during a single turn',
    cost: 200,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.TURN_MECHANICS,
      value: 'dual_movement',
      description: 'Can move two pawns per turn'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },

  // KNIGHT UPGRADES
  knight_extended_leap: {
    id: 'knight_extended_leap',
    name: 'Grand Leap',
    description: 'Knights can move in a 3-2 L-shape pattern',
    cost: 200,
    pieceType: PieceType.KNIGHT,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: '3-2',
      description: 'Additional 3-2 movement pattern'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  knight_double_jump: {
    id: 'knight_double_jump',
    name: 'Double Jump',
    description: 'Knights can move twice per turn (cannot capture twice)',
    cost: 350,
    pieceType: PieceType.KNIGHT,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'double_move',
      description: 'Can move twice per turn'
    }],
    activationMethod: ActivationMethod.ACHIEVEMENT
  },

  // BISHOP UPGRADES
  bishop_color_break: {
    id: 'bishop_color_break',
    name: 'Color Transcendence',
    description: 'Bishops can move one square orthogonally once per game',
    cost: 250,
    pieceType: PieceType.BISHOP,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'color_change',
      description: 'One orthogonal move per game'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  bishop_piercing: {
    id: 'bishop_piercing',
    name: 'Piercing Gaze',
    description: 'Bishops can jump over one piece per move',
    cost: 300,
    pieceType: PieceType.BISHOP,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 'jump_one',
      description: 'Can jump over one piece'
    }],
    activationMethod: ActivationMethod.CONTROL_ZONE
  },

  // ROOK UPGRADES
  rook_pawn_protection: {
    id: 'rook_pawn_protection',
    name: 'Pawn Protection',
    description: 'Rooks can protect friendly pawns positioned directly behind them from capture',
    cost: 250,
    pieceType: PieceType.ROOK,
    effects: [{
      type: UpgradeType.DEFENSE,
      value: 'pawn_protection',
      description: 'Protects pawns directly behind rook from capture'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  rook_wall: {
    id: 'rook_wall',
    name: 'Rook Wall',
    description: 'Link two rooks to create an impassable wall. Rooks can only move 5 spaces max.',
    cost: 200,
    pieceType: PieceType.ROOK,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'wall_link',
      description: 'Can link rooks to create walls, movement limited to 5 spaces'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },

  // QUEEN UPGRADES
  queen_teleport: {
    id: 'queen_teleport',
    name: 'Royal Teleport',
    description: 'Queen can teleport to any empty square once per game',
    cost: 500,
    pieceType: PieceType.QUEEN,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'teleport_once',
      description: 'One teleport per game'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  queen_aura: {
    id: 'queen_aura',
    name: 'Royal Aura',
    description: 'Allied pieces adjacent to Queen cannot be captured',
    cost: 450,
    pieceType: PieceType.QUEEN,
    effects: [{
      type: UpgradeType.DEFENSE,
      value: 'protection_aura',
      description: 'Protects adjacent allies'
    }],
    activationMethod: ActivationMethod.CONTROL_ZONE,
    duration: 10 // Temporary upgrade lasting 10 turns
  },

  // KING UPGRADES
  king_double_step: {
    id: 'king_double_step',
    name: 'Royal Stride',
    description: 'King can move 2 squares in any direction',
    cost: 350,
    pieceType: PieceType.KING,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 2,
      description: 'Move up to 2 squares'
    }],
    activationMethod: ActivationMethod.PURCHASE
  },
  king_swap: {
    id: 'king_swap',
    name: 'Royal Exchange',
    description: 'King can swap positions with any allied piece once per game',
    cost: 400,
    pieceType: PieceType.KING,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'swap_position',
      description: 'Swap with any ally once'
    }],
    activationMethod: ActivationMethod.ACHIEVEMENT
  }
};

// Control zone specific upgrades - REMOVED: Control zones should not grant piece upgrades
// const CONTROL_ZONE_UPGRADES = {
//   A: ['pawn_dual_movement', 'bishop_piercing'],
//   B: ['queen_aura'],
//   C: ['pawn_dual_movement', 'bishop_piercing']
// };

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
  UPGRADE_DEFINITIONS,
  // CONTROL_ZONE_UPGRADES, // REMOVED: Control zones should not grant piece upgrades
  STARTING_ECONOMY,
  INCOME_RATES
};