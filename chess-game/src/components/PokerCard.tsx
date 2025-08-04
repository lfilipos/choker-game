import React from 'react';
import { Card, CardSuit } from '../types/poker';
import './PokerCard.css';

interface PokerCardProps {
  card?: Card;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
  selectable?: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export const PokerCard: React.FC<PokerCardProps> = ({ 
  card, 
  faceDown = false, 
  size = 'medium',
  selectable = false,
  selected = false,
  onClick
}) => {
  const getSuitColor = (suit: CardSuit) => {
    return suit === CardSuit.HEARTS || suit === CardSuit.DIAMONDS ? 'red' : 'black';
  };

  const getSuitSymbol = (suit: CardSuit) => {
    const symbols = {
      [CardSuit.HEARTS]: '♥',
      [CardSuit.DIAMONDS]: '♦',
      [CardSuit.CLUBS]: '♣',
      [CardSuit.SPADES]: '♠'
    };
    return symbols[suit];
  };

  const getRankDisplay = (rank: number) => {
    const displays: { [key: number]: string } = {
      11: 'J',
      12: 'Q',
      13: 'K',
      14: 'A'
    };
    return displays[rank] || rank.toString();
  };

  if (faceDown || !card) {
    return (
      <div className={`poker-card face-down ${size}`}>
        <div className="card-back">
          <div className="card-pattern"></div>
        </div>
      </div>
    );
  }

  const suitColor = getSuitColor(card.suit);
  const classes = [
    'poker-card',
    `suit-${suitColor}`,
    size,
    selectable && 'selectable',
    selected && 'selected'
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={selectable ? onClick : undefined}>
      <div className="card-corner top-left">
        <div className="card-rank">{getRankDisplay(card.rank)}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
      </div>
      <div className="card-center">
        <div className="center-suit">{getSuitSymbol(card.suit)}</div>
      </div>
      <div className="card-corner bottom-right">
        <div className="card-rank">{getRankDisplay(card.rank)}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
      </div>
    </div>
  );
};