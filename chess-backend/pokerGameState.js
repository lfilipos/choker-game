const { Deck, Card } = require('./pokerTypes');
const { HandEvaluator } = require('./pokerHandEvaluator');
const { POKER_EFFECT_TYPES, applyPokerEffects } = require('./pokerEffects');

// Poker game phases
const PokerPhase = {
  WAITING: 'waiting',
  PRE_HAND: 'pre_hand',
  DEALING: 'dealing',
  PRE_FLOP: 'pre_flop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown',
  HAND_COMPLETE: 'hand_complete',
  WAITING_FOR_READY: 'waiting_for_ready'
};

// Betting actions
const BettingAction = {
  CHECK: 'check',
  BET: 'bet',
  CALL: 'call',
  RAISE: 'raise',
  FOLD: 'fold',
  ALL_IN: 'all_in'
};

// Player position
const Position = {
  DEALER: 'dealer',
  SMALL_BLIND: 'small_blind',
  BIG_BLIND: 'big_blind',
  NONE: 'none'
};

class PokerPlayer {
  constructor(team, socketId, playerName = null) {
    this.team = team; // 'white' or 'black'
    this.socketId = socketId;
    this.name = playerName;
    this.hand = [];
    this.position = Position.NONE;
    this.currentBet = 0;
    this.totalBetThisRound = 0;
    this.folded = false;
    this.allIn = false;
    this.hasActedThisRound = false;
    // Note: actual money will come from team economy in match state
  }

  resetForNewHand() {
    this.hand = [];
    this.currentBet = 0;
    this.totalBetThisRound = 0;
    this.folded = false;
    this.allIn = false;
    this.hasActedThisRound = false;
    this.hasThirdHoleCard = false; // Reset third card flag
  }

  resetForNewBettingRound() {
    this.currentBet = 0;
    this.hasActedThisRound = false;
  }

  receiveCards(cards) {
    if (Array.isArray(cards)) {
      this.hand.push(...cards);
    } else {
      this.hand.push(cards);
    }
  }

  toJSON() {
    return {
      team: this.team,
      name: this.name,
      position: this.position,
      currentBet: this.currentBet,
      totalBetThisRound: this.totalBetThisRound,
      folded: this.folded,
      allIn: this.allIn,
      handSize: this.hand.length,
      hasActedThisRound: this.hasActedThisRound
    };
  }
}

class PokerGameState {
  constructor(initialBlindLevel = 1) {
    this.deck = new Deck();
    this.players = new Map(); // Map of team -> PokerPlayer
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = []; // For all-in situations
    this.currentBet = 0;
    this.minimumBet = 10; // Default minimum bet
    
    // Blind level management
    this.blindLevel = initialBlindLevel;
    const { getBlindAmounts } = require('./modifierDefinitions');
    const blindAmounts = getBlindAmounts(this.blindLevel);
    this.smallBlind = blindAmounts.smallBlind;
    this.bigBlind = blindAmounts.bigBlind;
    
    this.phase = PokerPhase.WAITING;
    this.currentTurn = null; // Which team's turn
    this.dealerTeam = null;
    this.handNumber = 0;
    this.lastAction = null;
    this.bettingHistory = [];
    this.lastShowdownResult = null;
    this.playersReady = new Map(); // Map of team -> boolean for ready state
    
    // Game settings that can be modified
    this.settings = {
      cardsPerHand: 2,
      burnBeforeFlop: 3,
      burnBeforeTurn: 1,
      burnBeforeRiver: 1,
      maxBettingRounds: 4
    };
  }

  addPlayer(team, socketId, playerName = null) {
    if (this.players.has(team)) {
      throw new Error(`Player for team ${team} already exists`);
    }
    
    const player = new PokerPlayer(team, socketId, playerName);
    this.players.set(team, player);
    
    // Assign initial positions if both players are present
    if (this.players.size === 2) {
      this.assignInitialPositions();
    }
    
    return player;
  }

  removePlayer(team) {
    return this.players.delete(team);
  }

  assignInitialPositions() {
    const teams = Array.from(this.players.keys());
    
    // Randomly assign dealer
    const dealerIndex = Math.floor(Math.random() * 2);
    this.dealerTeam = teams[dealerIndex];
    
    const dealerPlayer = this.players.get(teams[dealerIndex]);
    const otherPlayer = this.players.get(teams[1 - dealerIndex]);
    
    // In heads-up poker, dealer is small blind
    dealerPlayer.position = Position.DEALER;
    otherPlayer.position = Position.BIG_BLIND;
  }

  // Update blind levels (called when modifiers are purchased)
  updateBlindLevel(newLevel) {
    this.blindLevel = newLevel;
    const { getBlindAmounts } = require('./modifierDefinitions');
    const blindAmounts = getBlindAmounts(this.blindLevel);
    this.smallBlind = blindAmounts.smallBlind;
    this.bigBlind = blindAmounts.bigBlind;
    console.log(`Blind level updated to ${this.blindLevel}: SB=${this.smallBlind}, BB=${this.bigBlind}`);
  }

  startNewHand(teamEconomies = null) {
    if (this.players.size !== 2) {
      throw new Error('Need exactly 2 players to start a hand');
    }
    
    this.handNumber++;
    this.phase = PokerPhase.PRE_HAND;
    
    // Reset deck
    this.deck.reset();
    this.deck.shuffle();
    
    // Reset community cards and pot
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.bettingHistory = [];
    this.lastShowdownResult = null;
    
    // Reset players
    this.players.forEach(player => player.resetForNewHand());
    
    // Rotate positions
    this.rotatePositions();
    
    // Pay blinds if economies provided
    if (teamEconomies) {
      this.payBlinds(teamEconomies);
    }
    
    // Set initial turn (in heads-up, dealer/small blind acts first pre-flop)
    const dealerPlayer = this.getDealerPlayer();
    this.currentTurn = dealerPlayer.team;
    
    return {
      handNumber: this.handNumber,
      dealerTeam: this.dealerTeam,
      phase: this.phase,
      pot: this.pot
    };
  }

  payBlinds(teamEconomies) {
    // In heads-up, dealer is small blind
    const dealerPlayer = this.getDealerPlayer();
    const bigBlindPlayer = this.getBigBlindPlayer();
    
    // Check if teams have enough for blinds
    const dealerTeam = dealerPlayer.team;
    const bigBlindTeam = bigBlindPlayer.team;
    
    if (!teamEconomies[dealerTeam] || teamEconomies[dealerTeam].liquid < this.smallBlind) {
      throw new Error(`${dealerTeam} team cannot afford small blind`);
    }
    
    if (!teamEconomies[bigBlindTeam] || teamEconomies[bigBlindTeam].liquid < this.bigBlind) {
      throw new Error(`${bigBlindTeam} team cannot afford big blind`);
    }
    
    // Pay small blind
    dealerPlayer.currentBet = this.smallBlind;
    dealerPlayer.totalBetThisRound = this.smallBlind;
    this.pot += this.smallBlind;
    
    // Pay big blind
    bigBlindPlayer.currentBet = this.bigBlind;
    bigBlindPlayer.totalBetThisRound = this.bigBlind;
    this.pot += this.bigBlind;
    this.currentBet = this.bigBlind;
    
    // Mark big blind as having acted (they posted blind)
    // Small blind still needs to act
    bigBlindPlayer.hasActedThisRound = true;
    
    // Record blind payments
    this.bettingHistory.push({
      team: dealerTeam,
      action: 'small_blind',
      amount: this.smallBlind,
      timestamp: new Date()
    });
    
    this.bettingHistory.push({
      team: bigBlindTeam,
      action: 'big_blind',
      amount: this.bigBlind,
      timestamp: new Date()
    });
  }

  rotatePositions() {
    console.log('Rotating positions - current dealer:', this.dealerTeam);
    
    // In heads-up, positions alternate
    this.players.forEach(player => {
      if (player.position === Position.DEALER) {
        player.position = Position.BIG_BLIND;
      } else {
        player.position = Position.DEALER;
      }
    });
    
    // Update dealer team
    this.dealerTeam = this.getDealerPlayer().team;
    console.log('New dealer after rotation:', this.dealerTeam);
  }

  getDealerPlayer() {
    for (const [team, player] of this.players) {
      if (player.position === Position.DEALER) {
        return player;
      }
    }
    return null;
  }

  getBigBlindPlayer() {
    for (const [team, player] of this.players) {
      if (player.position === Position.BIG_BLIND) {
        return player;
      }
    }
    return null;
  }

  // Deal hole cards to players
  dealHoleCards(activePokerEffects = null, controlZoneOwnership = null) {
    if (this.phase !== PokerPhase.PRE_HAND) {
      throw new Error('Can only deal hole cards in PRE_HAND phase');
    }
    
    this.phase = PokerPhase.DEALING;
    
    // Store initial control zone ownership for this round
    // This determines who gets the third card and keeps it
    this.roundControlZoneOwnership = controlZoneOwnership || {};
    
    // Deal cards to each player
    this.players.forEach(player => {
      let cardsToDeaclass = this.settings.cardsPerHand;
      
      // Apply DEAL type effects if available
      if (activePokerEffects && activePokerEffects[player.team]) {
        const dealEffects = activePokerEffects[player.team].filter(e => e.type === POKER_EFFECT_TYPES.DEAL);
        if (dealEffects.length > 0) {
          // Check for third hole card effect
          const hasThirdCardEffect = dealEffects.some(e => e.id === 'effect_third_hole_card');
          if (hasThirdCardEffect) {
            cardsToDeaclass = 3; // Deal 3 cards instead of 2
            player.hasThirdHoleCard = true; // Mark that this player has the third card
          }
        }
      }
      
      const cards = this.deck.deal(cardsToDeaclass);
      player.receiveCards(cards);
    });
    
    this.phase = PokerPhase.PRE_FLOP;
    
    return {
      phase: this.phase,
      playersDealt: this.players.size
    };
  }

  // Handle control zone changes during a round
  // If a team loses control of Zone A, they lose their third hole card
  updateControlZoneEffects(currentControlZoneOwnership, activePokerEffects) {
    if (!this.roundControlZoneOwnership) {
      return false; // No initial ownership to compare against
    }
    
    let cardsRemoved = false;
    
    // Check each player to see if they should lose their third card
    this.players.forEach((player, team) => {
      if (player.hasThirdHoleCard) {
        // Check if this team still controls Zone A
        const hadZoneA = this.roundControlZoneOwnership.A === team;
        const hasZoneA = currentControlZoneOwnership.A === team;
        
        if (hadZoneA && !hasZoneA) {
          // Lost control of Zone A - remove third hole card
          if (player.hand.length === 3) {
            // Remove the third card (last dealt card)
            const removedCard = player.hand.pop();
            console.log(`Team ${team} lost Zone A control - removed third hole card`);
            player.hasThirdHoleCard = false;
            cardsRemoved = true;
            
            // Update the round control zone ownership to reflect the loss
            // This prevents the card from being removed multiple times
            this.roundControlZoneOwnership.A = currentControlZoneOwnership.A;
          }
        }
      }
    });
    
    return cardsRemoved;
  }

  // Deal community cards based on current phase
  dealCommunityCards() {
    switch (this.phase) {
      case PokerPhase.PRE_FLOP:
        // Deal flop
        this.deck.burn(this.settings.burnBeforeFlop);
        const flop = this.deck.deal(3);
        this.communityCards.push(...flop);
        this.phase = PokerPhase.FLOP;
        break;
        
      case PokerPhase.FLOP:
        // Deal turn
        this.deck.burn(this.settings.burnBeforeTurn);
        const turn = this.deck.deal(1);
        this.communityCards.push(turn);
        this.phase = PokerPhase.TURN;
        break;
        
      case PokerPhase.TURN:
        // Deal river
        this.deck.burn(this.settings.burnBeforeRiver);
        const river = this.deck.deal(1);
        this.communityCards.push(river);
        this.phase = PokerPhase.RIVER;
        break;
        
      default:
        throw new Error(`Cannot deal community cards in phase: ${this.phase}`);
    }
    
    // Reset betting for new round
    this.players.forEach(player => player.resetForNewBettingRound());
    this.currentBet = 0;
    
    // Set turn to first active player (dealer acts last post-flop)
    const bigBlindPlayer = this.getBigBlindPlayer();
    this.currentTurn = bigBlindPlayer.team;
    
    return {
      phase: this.phase,
      communityCards: this.communityCards.map(card => card.toJSON())
    };
  }

  // Get valid actions for current player
  getValidActions(team, teamEconomy = null) {
    const player = this.players.get(team);
    if (!player || player.folded || player.allIn) {
      return [];
    }
    
    if (team !== this.currentTurn) {
      return [];
    }
    
    const actions = [];
    const hasMoneyLeft = !teamEconomy || teamEconomy.liquid > 0;
    
    // Can always fold (unless all-in)
    actions.push(BettingAction.FOLD);
    
    if (this.currentBet === 0) {
      // No bet to call
      actions.push(BettingAction.CHECK);
      if (hasMoneyLeft) {
        actions.push(BettingAction.BET);
      }
    } else {
      // There's a bet to match
      if (player.currentBet < this.currentBet) {
        if (hasMoneyLeft) {
          const amountToCall = this.currentBet - player.currentBet;
          if (!teamEconomy || teamEconomy.liquid >= amountToCall) {
            actions.push(BettingAction.CALL);
            actions.push(BettingAction.RAISE);
          } else {
            // Can only go all-in if can't afford to call
            // All-in will be added below
          }
        }
      } else if (player.currentBet === this.currentBet) {
        // Player has matched the current bet
        actions.push(BettingAction.CHECK);
        if (hasMoneyLeft) {
          actions.push(BettingAction.RAISE);
        }
      }
    }
    
    // Can go all-in only if have money left
    if (hasMoneyLeft) {
      actions.push(BettingAction.ALL_IN);
    }
    
    return actions;
  }

  // Get the minimum raise amount
  getMinimumRaise() {
    // In no-limit, minimum raise is the size of the last bet/raise
    return Math.max(this.bigBlind, this.currentBet);
  }

  // Get game state for a specific player
  getPlayerGameState(team, teamEconomy = null) {
    const player = this.players.get(team);
    if (!player) {
      return null;
    }
    
    const opponent = this.getOpponent(team);
    
    return {
      phase: this.phase,
      handNumber: this.handNumber,
      pot: this.pot,
      currentBet: this.currentBet,
      currentTurn: this.currentTurn,
      communityCards: this.communityCards.map(card => card.toJSON()),
      player: {
        ...player.toJSON(),
        hand: player.hand.map(card => card.toJSON())
      },
      opponent: opponent ? opponent.toJSON() : null,
      validActions: this.getValidActions(team, teamEconomy),
      minimumRaise: this.getMinimumRaise(),
      deckState: this.deck.getState(),
      lastAction: this.lastAction,
      lastShowdownResult: this.lastShowdownResult,
      bettingHistory: this.bettingHistory
    };
  }

  // Get public game state (no hidden information)
  getPublicGameState() {
    const playersInfo = {};
    this.players.forEach((player, team) => {
      playersInfo[team] = player.toJSON();
    });
    
    return {
      phase: this.phase,
      handNumber: this.handNumber,
      pot: this.pot,
      currentBet: this.currentBet,
      currentTurn: this.currentTurn,
      communityCards: this.communityCards.map(card => card.toJSON()),
      players: playersInfo,
      dealerTeam: this.dealerTeam,
      blinds: {
        small: this.smallBlind,
        big: this.bigBlind
      },
      deckState: this.deck.getState(),
      lastShowdownResult: this.lastShowdownResult,
      bettingHistory: this.bettingHistory
    };
  }

  getOpponent(team) {
    for (const [t, player] of this.players) {
      if (t !== team) return player;
    }
    return null;
  }

  // Check if betting round is complete
  isBettingRoundComplete() {
    let activePlayers = 0;
    let allPlayersActed = true;
    let allBetsEqual = true;
    
    this.players.forEach(player => {
      if (!player.folded && !player.allIn) {
        activePlayers++;
        
        // Check if player has acted this round
        if (!player.hasActedThisRound) {
          allPlayersActed = false;
        }
        
        // Check if bets are equal
        if (player.currentBet !== this.currentBet) {
          allBetsEqual = false;
        }
      }
    });
    
    // Round is complete if:
    // 1. Only one player remains (others folded), OR
    // 2. All active players have acted AND all bets are equal
    return activePlayers <= 1 || (allPlayersActed && allBetsEqual);
  }

  // Check if hand is complete
  isHandComplete() {
    let activePlayers = 0;
    this.players.forEach(player => {
      if (!player.folded) activePlayers++;
    });
    
    return activePlayers === 1 || this.phase === PokerPhase.SHOWDOWN;
  }

  // Process betting action
  processBettingAction(team, action, amount = 0, teamEconomy) {
    const player = this.players.get(team);
    if (!player) {
      throw new Error('Player not found');
    }

    if (team !== this.currentTurn) {
      throw new Error('Not your turn');
    }

    if (player.folded || player.allIn) {
      throw new Error('Cannot act - player folded or all-in');
    }

    // Validate action is allowed
    const validActions = this.getValidActions(team, teamEconomy);
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Valid actions: ${validActions.join(', ')}`);
    }

    // Process the action
    switch (action) {
      case BettingAction.FOLD:
        this.processFold(player);
        break;
      
      case BettingAction.CHECK:
        this.processCheck(player);
        break;
      
      case BettingAction.CALL:
        this.processCall(player, teamEconomy);
        break;
      
      case BettingAction.BET:
        this.processBet(player, amount, teamEconomy);
        break;
      
      case BettingAction.RAISE:
        this.processRaise(player, amount, teamEconomy);
        break;
      
      case BettingAction.ALL_IN:
        this.processAllIn(player, teamEconomy);
        break;
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    // Mark that player has acted
    player.hasActedThisRound = true;
    
    // Record action
    this.lastAction = {
      team,
      action,
      amount: player.currentBet,
      timestamp: new Date()
    };
    this.bettingHistory.push(this.lastAction);

    // Check if betting round is complete
    let enteredShowdown = false;
    if (this.isBettingRoundComplete()) {
      enteredShowdown = this.completeBettingRound();
    } else {
      // Move to next player
      this.advanceTurn();
    }

    return {
      success: true,
      action: this.lastAction,
      pot: this.pot,
      currentBet: this.currentBet,
      nextTurn: this.currentTurn,
      roundComplete: this.isBettingRoundComplete(),
      enteredShowdown: enteredShowdown
    };
  }

  processFold(player) {
    player.folded = true;
  }

  processCheck(player) {
    if (this.currentBet > 0 && player.currentBet < this.currentBet) {
      throw new Error('Cannot check - there is a bet to match');
    }
    // Check is just passing, no bet change
  }

  processCall(player, teamEconomy) {
    const amountToCall = this.currentBet - player.currentBet;
    if (amountToCall <= 0) {
      throw new Error('Nothing to call');
    }

    if (teamEconomy.liquid < amountToCall) {
      throw new Error('Insufficient funds to call');
    }

    player.currentBet = this.currentBet;
    player.totalBetThisRound += amountToCall;
    this.pot += amountToCall;
  }

  processBet(player, amount, teamEconomy) {
    if (this.currentBet > 0) {
      throw new Error('Cannot bet - use raise instead');
    }

    if (amount < this.minimumBet) {
      throw new Error(`Bet must be at least ${this.minimumBet}`);
    }

    if (teamEconomy.liquid < amount) {
      throw new Error('Insufficient funds');
    }

    player.currentBet = amount;
    player.totalBetThisRound += amount;
    this.currentBet = amount;
    this.pot += amount;
  }

  processRaise(player, raiseAmount, teamEconomy) {
    if (this.currentBet === 0) {
      throw new Error('Cannot raise - no bet to raise');
    }

    const callAmount = this.currentBet - player.currentBet;
    const totalAmount = callAmount + raiseAmount;

    if (raiseAmount < this.getMinimumRaise()) {
      throw new Error(`Raise must be at least ${this.getMinimumRaise()}`);
    }

    if (teamEconomy.liquid < totalAmount) {
      throw new Error('Insufficient funds');
    }

    player.currentBet += totalAmount;
    player.totalBetThisRound += totalAmount;
    this.currentBet = player.currentBet;
    this.pot += totalAmount;
  }

  processAllIn(player, teamEconomy) {
    const allInAmount = teamEconomy.liquid;
    const currentBetAmount = player.currentBet;
    const amountToAdd = allInAmount;

    if (amountToAdd <= 0) {
      throw new Error('No money to go all-in');
    }

    player.currentBet += amountToAdd;
    player.totalBetThisRound += amountToAdd;
    player.allIn = true;
    this.pot += amountToAdd;

    // Update current bet if this all-in is higher
    if (player.currentBet > this.currentBet) {
      this.currentBet = player.currentBet;
    }

    // TODO: Handle side pot creation for all-in situations
  }

  // Check if betting should auto-progress (when at least one player is all-in and can't act)
  shouldAutoProgress() {
    let activeCount = 0;
    let allInCount = 0;
    let foldedCount = 0;
    
    this.players.forEach(player => {
      if (player.folded) {
        foldedCount++;
      } else if (player.allIn) {
        allInCount++;
      } else {
        activeCount++;
      }
    });
    
    // Auto-progress if:
    // 1. At least one player is all-in
    // 2. Only one or zero players can still act (the rest are all-in or folded)
    return allInCount > 0 && activeCount <= 1;
  }
  
  // Get delay for auto-progression
  getAutoProgressDelay() {
    if (this.phase === PokerPhase.SHOWDOWN || this.phase === PokerPhase.RIVER) {
      return 5000; // 5 seconds for showdown/final round
    }
    return 3000; // 3 seconds for other rounds
  }
  
  advanceTurn() {
    const teams = Array.from(this.players.keys());
    const currentIndex = teams.indexOf(this.currentTurn);
    let nextIndex = (currentIndex + 1) % teams.length;
    
    // Skip folded/all-in players
    let attempts = 0;
    while (attempts < teams.length) {
      const nextTeam = teams[nextIndex];
      const nextPlayer = this.players.get(nextTeam);
      
      if (!nextPlayer.folded && !nextPlayer.allIn) {
        this.currentTurn = nextTeam;
        return;
      }
      
      nextIndex = (nextIndex + 1) % teams.length;
      attempts++;
    }
    
    // No valid players to act
    this.currentTurn = null;
  }

  completeBettingRound() {
    // Move to next phase
    if (this.phase === PokerPhase.PRE_FLOP) {
      this.dealCommunityCards(); // This will advance to FLOP
    } else if (this.phase === PokerPhase.FLOP) {
      this.dealCommunityCards(); // This will advance to TURN
    } else if (this.phase === PokerPhase.TURN) {
      this.dealCommunityCards(); // This will advance to RIVER
    } else if (this.phase === PokerPhase.RIVER) {
      console.log('River betting complete, moving to SHOWDOWN phase');
      this.phase = PokerPhase.SHOWDOWN;
      // Return true to signal showdown needs handling
      return true;
    }
    return false;
  }

  // Evaluate hands at showdown
  evaluateShowdown() {
    if (this.phase !== PokerPhase.SHOWDOWN) {
      throw new Error('Can only evaluate showdown in SHOWDOWN phase');
    }

    const activePlayers = [];
    this.players.forEach((player, team) => {
      if (!player.folded) {
        activePlayers.push({ team, player });
      }
    });

    if (activePlayers.length === 0) {
      throw new Error('No active players for showdown');
    }

    if (activePlayers.length === 1) {
      // Only one player remains, they win by default
      return {
        winners: [activePlayers[0].team],
        winningHand: null,
        playerHands: {}
      };
    }

    // Evaluate each player's best hand
    const playerHands = {};
    const evaluatedHands = [];

    for (const { team, player } of activePlayers) {
      const bestHand = HandEvaluator.findBestHand(player.hand, this.communityCards);
      playerHands[team] = {
        hand: bestHand,
        holeCards: player.hand.map(card => card.toJSON()),
        description: HandEvaluator.formatHand(bestHand)
      };
      evaluatedHands.push({ team, hand: bestHand });
    }

    // Sort by hand strength (best first)
    evaluatedHands.sort((a, b) => HandEvaluator.compareHands(b.hand, a.hand));

    // Find all winners (could be multiple in case of tie)
    const winners = [evaluatedHands[0].team];
    const winningHand = evaluatedHands[0].hand;

    for (let i = 1; i < evaluatedHands.length; i++) {
      if (HandEvaluator.compareHands(evaluatedHands[i].hand, winningHand) === 0) {
        winners.push(evaluatedHands[i].team);
      } else {
        break;
      }
    }

    return {
      winners,
      winningHand: playerHands[winners[0]],
      playerHands
    };
  }

  // Set player ready status for next hand
  setPlayerReady(team, isReady = true) {
    if (!this.players.has(team)) {
      throw new Error(`Team ${team} not found`);
    }
    
    this.playersReady.set(team, isReady);
    
    // Check if all players are ready
    if (this.areAllPlayersReady()) {
      return true; // Signal that we can start new hand
    }
    return false;
  }

  // Check if all players are ready
  areAllPlayersReady() {
    if (this.players.size !== 2) {
      return false;
    }
    
    let allReady = true;
    this.players.forEach((player, team) => {
      if (!this.playersReady.get(team)) {
        allReady = false;
      }
    });
    
    return allReady;
  }

  // Reset ready states for new hand
  resetReadyStates() {
    this.playersReady.clear();
  }

  // Complete the current hand and prepare for next
  completeHand(showdownResult = null) {
    console.log('Completing hand, transitioning from', this.phase, 'to WAITING_FOR_READY');
    this.phase = PokerPhase.WAITING_FOR_READY;
    this.lastShowdownResult = showdownResult;
    this.resetReadyStates();
    
    // Store the result but don't reset game state yet
    // Wait for players to be ready for next hand
  }

  // Reset for completely new hand when players are ready
  prepareForNewHand() {
    // Reset all players for new hand
    this.players.forEach(player => {
      player.resetForNewHand();
    });
    
    // Clear community cards and reset betting
    this.communityCards = [];
    this.pot = 0;
    this.sidePots = [];
    this.currentBet = 0;
    this.currentTurn = null;
    this.bettingHistory = [];
    this.lastAction = null;
    this.lastShowdownResult = null;  // Clear the showdown result
    this.roundControlZoneOwnership = null; // Clear control zone ownership from previous round
    
    // Rotate positions for next hand
    this.rotatePositions();
    
    // Clear ready states for the new hand
    this.resetReadyStates();
  }
}

module.exports = {
  PokerPhase,
  BettingAction,
  Position,
  PokerPlayer,
  PokerGameState
};