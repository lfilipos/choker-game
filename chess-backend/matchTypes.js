// Match types and structures for dual-game system

const MatchStatus = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  COMPLETED: 'completed'
};

const GameType = {
  CHESS: 'chess',
  GAME_B: 'gameB' // Placeholder for the second game type
};

const TeamColor = {
  WHITE: 'white',
  BLACK: 'black'
};

const GameSlot = {
  A: 'A',
  B: 'B'
};

const PlayerRole = {
  WHITE_A: 'white_A',
  WHITE_B: 'white_B',
  BLACK_A: 'black_A',
  BLACK_B: 'black_B'
};

// Helper function to get team from player role
function getTeamFromRole(role) {
  return role.startsWith('white') ? TeamColor.WHITE : TeamColor.BLACK;
}

// Helper function to get game slot from player role
function getGameSlotFromRole(role) {
  return role.endsWith('A') ? GameSlot.A : GameSlot.B;
}

// Helper function to create player role from team and game slot
function createPlayerRole(team, gameSlot) {
  return `${team}_${gameSlot}`;
}

module.exports = {
  MatchStatus,
  GameType,
  TeamColor,
  GameSlot,
  PlayerRole,
  getTeamFromRole,
  getGameSlotFromRole,
  createPlayerRole
};