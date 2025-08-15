const { PieceType } = require('./types');

// Piece purchase prices
const PIECE_PRICES = {
  [PieceType.PAWN]: 100,
  [PieceType.ROOK]: 200,
  [PieceType.KNIGHT]: 300,
  [PieceType.BISHOP]: 400,
  [PieceType.QUEEN]: 500,
  [PieceType.KING]: 1000
};

// Get all purchasable pieces with their prices
function getPurchasablePieces() {
  return Object.entries(PIECE_PRICES).map(([type, price]) => ({
    type,
    price,
    name: type.charAt(0).toUpperCase() + type.slice(1),
    description: `Purchase a new ${type} for your barracks`
  }));
}

// Get purchasable pieces for a specific team (only unlocked types)
function getPurchasablePiecesForTeam(teamUnlockedPieceTypes) {
  return Object.entries(PIECE_PRICES)
    .filter(([type, price]) => teamUnlockedPieceTypes.includes(type))
    .map(([type, price]) => ({
      type,
      price,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      description: `Purchase a new ${type} for your barracks`
    }));
}

// Check if a team can afford a piece
function canAffordPiece(pieceType, teamEconomy) {
  const price = PIECE_PRICES[pieceType];
  return price !== undefined && teamEconomy >= price;
}

// Get the price of a piece
function getPiecePrice(pieceType) {
  return PIECE_PRICES[pieceType] || 0;
}

// Check if a team can purchase a specific piece type
function canPurchasePieceType(pieceType, teamUnlockedPieceTypes) {
  return teamUnlockedPieceTypes.includes(pieceType);
}

// Check if a team can afford and purchase a piece
function canAffordAndPurchasePiece(pieceType, teamEconomy, teamUnlockedPieceTypes) {
  return canAffordPiece(pieceType, teamEconomy) && canPurchasePieceType(pieceType, teamUnlockedPieceTypes);
}

module.exports = {
  PIECE_PRICES,
  getPurchasablePieces,
  getPurchasablePiecesForTeam,
  canAffordPiece,
  canPurchasePieceType,
  canAffordAndPurchasePiece,
  getPiecePrice
};