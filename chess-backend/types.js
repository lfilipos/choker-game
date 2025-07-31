// Shared types for chess game (JavaScript version for backend)

const GameStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

const PieceType = {
  KING: 'king',
  QUEEN: 'queen',
  ROOK: 'rook',
  BISHOP: 'bishop',
  KNIGHT: 'knight',
  PAWN: 'pawn'
};

const PieceColor = {
  WHITE: 'white',
  BLACK: 'black'
};

const ControlZoneType = {
  A: 'A',
  B: 'B',
  C: 'C'
};

// Control zones definition
const CONTROL_ZONES = [
  {
    id: 'A',
    name: 'Control Zone A',
    color: '#3498db',
    squares: [
      { row: 5, col: 1 }, // b5
      { row: 4, col: 1 }, // b6
      { row: 5, col: 2 }, // c5
      { row: 4, col: 2 }  // c6
    ]
  },
  {
    id: 'B',
    name: 'Control Zone B',
    color: '#e74c3c',
    squares: [
      { row: 5, col: 7 }, // h5
      { row: 4, col: 7 }, // h6
      { row: 5, col: 8 }, // i5
      { row: 4, col: 8 }  // i6
    ]
  },
  {
    id: 'C',
    name: 'Control Zone C',
    color: '#27ae60',
    squares: [
      { row: 5, col: 13 }, // n5
      { row: 4, col: 13 }, // n6
      { row: 5, col: 14 }, // o5
      { row: 4, col: 14 }  // o6
    ]
  }
];

const UpgradeType = {
  MOVEMENT: 'movement',
  ATTACK: 'attack',
  DEFENSE: 'defense',
  SPECIAL: 'special'
};

const ActivationMethod = {
  PURCHASE: 'purchase',
  CONTROL_ZONE: 'control_zone',
  ACHIEVEMENT: 'achievement',
  TIMED: 'timed'
};

module.exports = {
  GameStatus,
  PieceType,
  PieceColor,
  ControlZoneType,
  CONTROL_ZONES,
  UpgradeType,
  ActivationMethod
};