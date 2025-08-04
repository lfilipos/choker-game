// Poker hand rankings
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

const HandRankNames = {
  [HandRank.HIGH_CARD]: 'High Card',
  [HandRank.PAIR]: 'Pair',
  [HandRank.TWO_PAIR]: 'Two Pair',
  [HandRank.THREE_OF_A_KIND]: 'Three of a Kind',
  [HandRank.STRAIGHT]: 'Straight',
  [HandRank.FLUSH]: 'Flush',
  [HandRank.FULL_HOUSE]: 'Full House',
  [HandRank.FOUR_OF_A_KIND]: 'Four of a Kind',
  [HandRank.STRAIGHT_FLUSH]: 'Straight Flush',
  [HandRank.ROYAL_FLUSH]: 'Royal Flush'
};

// Import rank display from pokerTypes
const { RankDisplay } = require('./pokerTypes');

// Card rank values for comparison
const RankValues = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  11: 11,  // Jack
  12: 12,  // Queen
  13: 13,  // King
  14: 14   // Ace
};

class HandEvaluator {
  // Evaluate a 5-card poker hand
  static evaluateHand(cards) {
    if (cards.length !== 5) {
      throw new Error('Hand must contain exactly 5 cards');
    }

    // Sort cards by rank (highest to lowest)
    const sortedCards = [...cards].sort((a, b) => 
      b.rank - a.rank
    );

    // Check for flush
    const isFlush = this.isFlush(sortedCards);
    
    // Check for straight
    const straightHighCard = this.getStraightHighCard(sortedCards);
    const isStraight = straightHighCard !== null;

    // Count ranks
    const rankCounts = this.getRankCounts(sortedCards);
    const counts = Object.values(rankCounts).sort((a, b) => b - a);

    // Determine hand rank
    if (isStraight && isFlush) {
      if (straightHighCard === 14) { // Ace high straight
        return {
          rank: HandRank.ROYAL_FLUSH,
          name: HandRankNames[HandRank.ROYAL_FLUSH],
          cards: sortedCards,
          tiebreakers: []
        };
      }
      return {
        rank: HandRank.STRAIGHT_FLUSH,
        name: HandRankNames[HandRank.STRAIGHT_FLUSH],
        cards: sortedCards,
        tiebreakers: [straightHighCard]
      };
    }

    if (counts[0] === 4) {
      return {
        rank: HandRank.FOUR_OF_A_KIND,
        name: HandRankNames[HandRank.FOUR_OF_A_KIND],
        cards: sortedCards,
        tiebreakers: this.getFourOfAKindTiebreakers(sortedCards, rankCounts)
      };
    }

    if (counts[0] === 3 && counts[1] === 2) {
      return {
        rank: HandRank.FULL_HOUSE,
        name: HandRankNames[HandRank.FULL_HOUSE],
        cards: sortedCards,
        tiebreakers: this.getFullHouseTiebreakers(sortedCards, rankCounts)
      };
    }

    if (isFlush) {
      return {
        rank: HandRank.FLUSH,
        name: HandRankNames[HandRank.FLUSH],
        cards: sortedCards,
        tiebreakers: this.getFlushTiebreakers(sortedCards)
      };
    }

    if (isStraight) {
      return {
        rank: HandRank.STRAIGHT,
        name: HandRankNames[HandRank.STRAIGHT],
        cards: sortedCards,
        tiebreakers: [straightHighCard]
      };
    }

    if (counts[0] === 3) {
      return {
        rank: HandRank.THREE_OF_A_KIND,
        name: HandRankNames[HandRank.THREE_OF_A_KIND],
        cards: sortedCards,
        tiebreakers: this.getThreeOfAKindTiebreakers(sortedCards, rankCounts)
      };
    }

    if (counts[0] === 2 && counts[1] === 2) {
      return {
        rank: HandRank.TWO_PAIR,
        name: HandRankNames[HandRank.TWO_PAIR],
        cards: sortedCards,
        tiebreakers: this.getTwoPairTiebreakers(sortedCards, rankCounts)
      };
    }

    if (counts[0] === 2) {
      return {
        rank: HandRank.PAIR,
        name: HandRankNames[HandRank.PAIR],
        cards: sortedCards,
        tiebreakers: this.getPairTiebreakers(sortedCards, rankCounts)
      };
    }

    return {
      rank: HandRank.HIGH_CARD,
      name: HandRankNames[HandRank.HIGH_CARD],
      cards: sortedCards,
      tiebreakers: this.getHighCardTiebreakers(sortedCards)
    };
  }

  // Find the best 5-card hand from 7 cards (2 hole + 5 community)
  static findBestHand(holeCards, communityCards) {
    const allCards = [...holeCards, ...communityCards];
    if (allCards.length < 5) {
      throw new Error('Not enough cards to make a hand');
    }

    let bestHand = null;
    let bestHandCards = null;

    // Generate all possible 5-card combinations
    const combinations = this.getCombinations(allCards, 5);

    for (const combination of combinations) {
      const hand = this.evaluateHand(combination);
      
      if (!bestHand || this.compareHands(hand, bestHand) > 0) {
        bestHand = hand;
        bestHandCards = combination;
      }
    }

    return bestHand;
  }

  // Compare two hands, returns positive if hand1 wins, negative if hand2 wins, 0 if tie
  static compareHands(hand1, hand2) {
    // First compare by rank
    if (hand1.rank !== hand2.rank) {
      return hand1.rank - hand2.rank;
    }

    // If same rank, compare tiebreakers
    for (let i = 0; i < Math.max(hand1.tiebreakers.length, hand2.tiebreakers.length); i++) {
      const tb1 = hand1.tiebreakers[i] || 0;
      const tb2 = hand2.tiebreakers[i] || 0;
      
      if (tb1 !== tb2) {
        return tb1 - tb2;
      }
    }

    return 0; // Complete tie
  }

  // Helper methods
  static isFlush(cards) {
    const suit = cards[0].suit;
    return cards.every(card => card.suit === suit);
  }

  static getStraightHighCard(cards) {
    const ranks = cards.map(card => card.rank);
    
    // Check for regular straight
    let consecutive = 1;
    for (let i = 1; i < ranks.length; i++) {
      if (ranks[i] === ranks[i-1] - 1) {
        consecutive++;
        if (consecutive === 5) {
          return ranks[0]; // High card of straight
        }
      } else if (ranks[i] !== ranks[i-1]) {
        consecutive = 1;
      }
    }

    // Check for A-2-3-4-5 straight (wheel)
    const hasAce = ranks.includes(14);
    const hasTwo = ranks.includes(2);
    const hasThree = ranks.includes(3);
    const hasFour = ranks.includes(4);
    const hasFive = ranks.includes(5);

    if (hasAce && hasTwo && hasThree && hasFour && hasFive) {
      return 5; // In a wheel, 5 is the high card
    }

    return null;
  }

  static getRankCounts(cards) {
    const counts = {};
    for (const card of cards) {
      counts[card.rank] = (counts[card.rank] || 0) + 1;
    }
    return counts;
  }

  // Tiebreaker methods
  static getFourOfAKindTiebreakers(cards, rankCounts) {
    const fourOfAKindRank = Object.entries(rankCounts)
      .find(([rank, count]) => count === 4)[0];
    const kicker = cards.find(card => card.rank !== fourOfAKindRank);
    
    const fourOfAKindRankValue = parseInt(fourOfAKindRank);
    return [
      fourOfAKindRankValue,
      kicker.rank
    ];
  }

  static getFullHouseTiebreakers(cards, rankCounts) {
    const threeOfAKindRank = Object.entries(rankCounts)
      .find(([rank, count]) => count === 3)[0];
    const pairRank = Object.entries(rankCounts)
      .find(([rank, count]) => count === 2)[0];
    
    const threeOfAKindRankValue = parseInt(threeOfAKindRank);
    const pairRankValue = parseInt(pairRank);
    return [
      threeOfAKindRankValue,
      pairRankValue
    ];
  }

  static getFlushTiebreakers(cards) {
    return cards.map(card => card.rank);
  }

  static getThreeOfAKindTiebreakers(cards, rankCounts) {
    const threeOfAKindRank = Object.entries(rankCounts)
      .find(([rank, count]) => count === 3)[0];
    const threeOfAKindRankValue = parseInt(threeOfAKindRank);
    const kickers = cards
      .filter(card => card.rank !== threeOfAKindRankValue)
      .map(card => card.rank)
      .sort((a, b) => b - a);
    
    return [threeOfAKindRankValue, ...kickers];
  }

  static getTwoPairTiebreakers(cards, rankCounts) {
    const pairs = Object.entries(rankCounts)
      .filter(([rank, count]) => count === 2)
      .map(([rank, count]) => parseInt(rank))
      .sort((a, b) => b - a);
    const kicker = cards.find(card => 
      rankCounts[card.rank] === 1
    );
    
    return [...pairs, kicker.rank];
  }

  static getPairTiebreakers(cards, rankCounts) {
    const pairRank = Object.entries(rankCounts)
      .find(([rank, count]) => count === 2)[0];
    const pairRankValue = parseInt(pairRank);
    const kickers = cards
      .filter(card => card.rank !== pairRankValue)
      .map(card => card.rank)
      .sort((a, b) => b - a);
    
    return [pairRankValue, ...kickers];
  }

  static getHighCardTiebreakers(cards) {
    return cards.map(card => card.rank);
  }

  // Generate all combinations of k items from array
  static getCombinations(array, k) {
    const combinations = [];
    
    function combine(start, combo) {
      if (combo.length === k) {
        combinations.push([...combo]);
        return;
      }
      
      for (let i = start; i < array.length; i++) {
        combo.push(array[i]);
        combine(i + 1, combo);
        combo.pop();
      }
    }
    
    combine(0, []);
    return combinations;
  }

  // Format hand for display
  static formatHand(hand) {
    const cardSymbols = hand.cards.map(card => {
      const suitSymbols = {
        'hearts': '♥',
        'diamonds': '♦',
        'clubs': '♣',
        'spades': '♠'
      };
      const rankDisplay = RankDisplay[card.rank] || card.rank;
      return `${rankDisplay}${suitSymbols[card.suit]}`;
    }).join(' ');

    return `${hand.name} (${cardSymbols})`;
  }
}

module.exports = {
  HandRank,
  HandRankNames,
  RankValues,
  HandEvaluator
};