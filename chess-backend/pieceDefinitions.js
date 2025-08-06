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

// Check if a team can afford a piece
function canAffordPiece(pieceType, teamEconomy) {
  const price = PIECE_PRICES[pieceType];
  return price !== undefined && teamEconomy >= price;
}

// Get the price of a piece
function getPiecePrice(pieceType) {
  return PIECE_PRICES[pieceType] || 0;
}

module.exports = {
  PIECE_PRICES,
  getPurchasablePieces,
  canAffordPiece,
  getPiecePrice
};