const { PieceType, UpgradeType, ActivationMethod } = require('./types');

const UPGRADE_DEFINITIONS = {
  // PAWN UPGRADES
  pawn_speed_boost: {
    id: 'pawn_speed_boost',
    name: 'Swift Advance',
    description: 'Pawns can move up to 3 squares on their first move (normally 2)',
    cost: 250,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 3,
      description: 'Initial move extended to 3 squares'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      captures: { byType: { pawn: 1 } }
    }
  },
  pawn_diagonal_range: {
    id: 'pawn_diagonal_range',
    name: 'Extended Reach',
    description: 'Pawns can capture diagonally from 2 squares away',
    cost: 350,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.ATTACK,
      value: 2,
      description: 'Diagonal capture range increased to 2'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'pawn_speed_boost',
    requirements: {
      captures: { byType: { pawn: 3 } }
    }
  },
  pawn_dual_movement: {
    id: 'pawn_dual_movement',
    name: 'Dual Pawn Movement',
    description: 'Move two pawns in sequence during a single turn',
    cost: 450,
    pieceType: PieceType.PAWN,
    effects: [{
      type: UpgradeType.TURN_MECHANICS,
      value: 'dual_movement',
      description: 'Can move two pawns per turn'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'pawn_diagonal_range',
    requirements: {
      captures: { byType: { pawn: 5 } }
    }
  },

  // KNIGHT UPGRADES
  knight_extended_leap: {
    id: 'knight_extended_leap',
    name: 'Grand Leap',
    description: 'Knights can move in a 3-2 L-shape pattern',
    cost: 300,
    pieceType: PieceType.KNIGHT,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: '3-2',
      description: 'Additional 3-2 movement pattern'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'nimble_knight',
    requirements: {
      captures: { total: 3 }
    }
  },
  knight_double_jump: {
    id: 'knight_double_jump',
    name: 'Double Jump',
    description: 'Knights can move twice per turn (cannot capture twice)',
    cost: 450,
    pieceType: PieceType.KNIGHT,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'double_move',
      description: 'Can move twice per turn'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'knight_extended_leap',
    requirements: {
      captures: { byType: { knight: 2 } }
    }
  },
  nimble_knight: {
    id: 'nimble_knight',
    name: 'Nimble Knight',
    description: 'Knights can move 1 square adjacent then make normal move',
    cost: 150,
    pieceType: PieceType.KNIGHT,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'nimble_move',
      description: 'Move 1 adjacent square, then make normal knight move'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      captures: { byType: { knight: 1 } }
    }
  },

  // BISHOP UPGRADES
  bishop_color_break: {
    id: 'bishop_color_break',
    name: 'Sidestep',
    description: 'Bishops can move one square orthogonally once per turn',
    cost: 200,
    pieceType: PieceType.BISHOP,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'color_change',
      description: 'One orthogonal move per turn'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      captures: { byType: { pawn: 2 } }
    }
  },
  bishop_piercing: {
    id: 'bishop_piercing',
    name: "Bishop's Hop",
    description: 'Bishops can jump over one friendly piece per move',
    cost: 300,
    pieceType: PieceType.BISHOP,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 'jump_one',
      description: 'Can jump over one friendly piece'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'bishop_color_break',
    requirements: {
      captures: { byType: { bishop: 1 } }
    }
  },
  bishop_royal_protection: {
    id: 'bishop_royal_protection',
    name: 'Royal Protection',
    description: 'Bishop near king can protect vs knight attack on the king',
    cost: 400,
    pieceType: PieceType.BISHOP,
    effects: [{
      type: UpgradeType.DEFENSE,
      value: 'royal_protection',
      description: 'Protects king by swapping places when captured'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'bishop_piercing',
    requirements: {
      captures: { byType: { rook: 1, knight: 1 } }
    }
  },

  // ROOK UPGRADES
  rook_pawn_protection: {
    id: 'rook_pawn_protection',
    name: 'Pawn Defense',
    description: 'Rooks can protect friendly pawns positioned directly behind them from capture',
    cost: 200,
    pieceType: PieceType.ROOK,
    effects: [{
      type: UpgradeType.DEFENSE,
      value: 'pawn_protection',
      description: 'Protects pawns directly behind rook from capture'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      captures: { byType: { rook: 1 } }
    }
  },
  rook_wall: {
    id: 'rook_wall',
    name: 'Rook Wall',
    description: 'Link two rooks 2 squares apart to create an impassable wall',
    cost: 400,
    pieceType: PieceType.ROOK,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'wall_link',
      description: 'Can link rooks (2 squares) to create walls'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'rook_pawn_protection',
    requirements: {
      captures: { byType: { rook: 2 } }
    }
  },
  enhanced_rook_wall: {
    id: 'enhanced_rook_wall',
    name: 'Enhanced Rook Wall',
    description: 'Link rooks from up to 4 spaces apart to create extended walls',
    cost: 600,
    pieceType: PieceType.ROOK,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'enhanced_wall_link',
      description: 'Can link rooks up to 4 spaces apart'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'rook_wall',
    requirements: {
      captures: { byType: { rook: 3 } }
    }
  },

  // QUEEN UPGRADES
  queens_hook: {
    id: 'queens_hook',
    name: "Queen's Hook",
    description: 'Queen can move one square in any direction after completing normal move',
    cost: 300,
    pieceType: PieceType.QUEEN,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'hook_move',
      description: 'Optional 1-square move after normal move'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      captures: { byType: { pawn: 5 } }
    }
  },
  enhanced_queens_hook: {
    id: 'enhanced_queens_hook',
    name: "Enhanced Queen's Hook",
    description: 'Queen can move up to three squares in any direction after completing normal move',
    cost: 500,
    pieceType: PieceType.QUEEN,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'enhanced_hook_move',
      description: 'Optional 3-square move after normal move'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'queens_hook',
    requirements: {
      captures: { byType: { knight: 1, rook: 1, bishop: 1 } }
    }
  },
  queen_aura: {
    id: 'queen_aura',
    name: 'Royal Aura',
    description: 'Allied pieces adjacent to Queen attempt to evade backwards when attacked',
    cost: 750,
    pieceType: PieceType.QUEEN,
    effects: [{
      type: UpgradeType.DEFENSE,
      value: 'evasion_aura',
      description: 'Protected pieces evade towards home row if space available'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'enhanced_queens_hook',
    requirements: {
      captures: { byType: { queen: 1 } }
    }
  },

  // KING UPGRADES
  king_double_step: {
    id: 'king_double_step',
    name: 'Royal Stride',
    description: 'King can move 2 squares in any direction',
    cost: 250,
    pieceType: PieceType.KING,
    effects: [{
      type: UpgradeType.MOVEMENT,
      value: 2,
      description: 'Move up to 2 squares'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 1,
    requirements: {
      treasuryMin: 750
    }
  },
  king_swap: {
    id: 'king_swap',
    name: 'Royal Exchange',
    description: 'Select your king, then click a rook to swap positions (400 per use)',
    cost: 450,
    pieceType: PieceType.KING,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'swap_position',
      description: 'Activate Royal Exchange mode to swap king with any friendly rook for 400'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 3,
    requires: 'king_royal_command',
    requirements: {
      treasuryMin: 1250
    }
  },
  king_royal_command: {
    id: 'king_royal_command',
    name: 'Royal Command',
    description: 'King can command any piece within 2 squares to move 1 square',
    cost: 350,
    pieceType: PieceType.KING,
    effects: [{
      type: UpgradeType.SPECIAL,
      value: 'royal_command',
      description: 'Control nearby pieces to move them'
    }],
    activationMethod: ActivationMethod.PURCHASE,
    level: 2,
    requires: 'king_double_step',
    requirements: {
      treasuryMin: 1000
    }
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