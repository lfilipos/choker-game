// Poker card types and enums
const CardSuit = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades'
};

const CardRank = {
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14  // Ace high for easier comparison
};

// Reverse mapping for display
const RankDisplay = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A'
};

const HandRank = {
  HIGH_CARD: 1,
  PAIR: 2,
  TWO_PAIR: 3,
  THREE_OF_A_KIND: 4,
  STRAIGHT: 5,
  FLUSH: 6,
  FULL_HOUSE: 7,
  FOUR_OF_A_KIND: 8,
  STRAIGHT_FLUSH: 9,
  ROYAL_FLUSH: 10
};

class Card {
  constructor(suit, rank) {
    if (!Object.values(CardSuit).includes(suit)) {
      throw new Error(`Invalid suit: ${suit}`);
    }
    if (!Object.values(CardRank).includes(rank)) {
      throw new Error(`Invalid rank: ${rank}`);
    }
    
    this.suit = suit;
    this.rank = rank;
    this.id = `${suit}_${rank}`;
  }

  toString() {
    return `${RankDisplay[this.rank]}${this.getSuitSymbol()}`;
  }

  getSuitSymbol() {
    const symbols = {
      [CardSuit.HEARTS]: '♥',
      [CardSuit.DIAMONDS]: '♦',
      [CardSuit.CLUBS]: '♣',
      [CardSuit.SPADES]: '♠'
    };
    return symbols[this.suit];
  }

  toJSON() {
    return {
      suit: this.suit,
      rank: this.rank,
      id: this.id,
      display: this.toString()
    };
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.discardPile = [];
    this.burnPile = [];
    this.reset();
  }

  reset() {
    this.cards = [];
    this.discardPile = [];
    this.burnPile = [];
    
    // Create all 52 cards
    for (const suit of Object.values(CardSuit)) {
      for (const rank of Object.values(CardRank)) {
        this.cards.push(new Card(suit, rank));
      }
    }
  }

  shuffle() {
    // Fisher-Yates shuffle algorithm
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(count = 1) {
    if (this.cards.length < count) {
      throw new Error(`Not enough cards in deck. Requested: ${count}, Available: ${this.cards.length}`);
    }
    
    const dealtCards = [];
    for (let i = 0; i < count; i++) {
      dealtCards.push(this.cards.pop());
    }
    
    return count === 1 ? dealtCards[0] : dealtCards;
  }

  burn(count = 1) {
    const burnedCards = this.deal(count);
    if (Array.isArray(burnedCards)) {
      this.burnPile.push(...burnedCards);
    } else {
      this.burnPile.push(burnedCards);
    }
    return burnedCards;
  }

  discard(cards) {
    if (Array.isArray(cards)) {
      this.discardPile.push(...cards);
    } else {
      this.discardPile.push(cards);
    }
  }

  getCardsRemaining() {
    return this.cards.length;
  }

  getState() {
    return {
      cardsRemaining: this.cards.length,
      discardCount: this.discardPile.length,
      burnCount: this.burnPile.length
    };
  }
}

module.exports = {
  CardSuit,
  CardRank,
  RankDisplay,
  HandRank,
  Card,
  Deck
};