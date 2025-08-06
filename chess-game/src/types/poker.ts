// Poker game types for frontend

export enum CardSuit {
  HEARTS = 'hearts',
  DIAMONDS = 'diamonds',
  CLUBS = 'clubs',
  SPADES = 'spades'
}

export enum PokerPhase {
  WAITING = 'waiting',
  PRE_HAND = 'pre_hand',
  DEALING = 'dealing',
  PRE_FLOP = 'pre_flop',
  FLOP = 'flop',
  TURN = 'turn',
  RIVER = 'river',
  SHOWDOWN = 'showdown',
  HAND_COMPLETE = 'hand_complete',
  WAITING_FOR_READY = 'waiting_for_ready'
}

export enum BettingAction {
  CHECK = 'check',
  BET = 'bet',
  CALL = 'call',
  RAISE = 'raise',
  FOLD = 'fold',
  ALL_IN = 'all_in'
}

export enum Position {
  DEALER = 'dealer',
  SMALL_BLIND = 'small_blind',
  BIG_BLIND = 'big_blind',
  NONE = 'none'
}

export interface Card {
  suit: CardSuit;
  rank: number;
  id: string;
  display: string;
}

export interface PokerPlayer {
  team: string;
  name: string;
  position: Position;
  currentBet: number;
  totalBetThisRound: number;
  folded: boolean;
  allIn: boolean;
  handSize: number;
}

export interface PokerPlayerWithHand extends PokerPlayer {
  hand: Card[];
}

export interface HandResult {
  hand: {
    rank: number;
    name: string;
    cards: Card[];
  };
  holeCards: Card[];
  description: string;
}

export interface ShowdownResult {
  winners: string[];
  winningHand: HandResult | null;
  playerHands: Record<string, HandResult>;
  winReason?: 'fold' | 'showdown';
}

export interface PokerGameState {
  phase: PokerPhase;
  handNumber: number;
  pot: number;
  currentBet: number;
  currentTurn: string | null;
  communityCards: Card[];
  player: PokerPlayerWithHand;
  opponent: PokerPlayer;
  validActions: BettingAction[];
  minimumRaise: number;
  deckState: {
    cardsRemaining: number;
    discardCount: number;
    burnCount: number;
  };
  lastAction: any;
  lastShowdownResult?: ShowdownResult | null;
  bettingHistory?: any[];
  playersReady?: Array<[string, boolean]> | null;
}

export interface PokerMatchState {
  type: string;
  pokerState: PokerGameState | null;
  isPlayerTurn: boolean;
}