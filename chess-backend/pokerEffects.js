// Poker effect types define when in the game flow an effect triggers
const POKER_EFFECT_TYPES = {
  DEAL: 'deal',           // Affects initial card dealing
  POT: 'pot',             // Affects pot calculations and winnings
  BETTING: 'betting',     // Affects betting rules and amounts
  HAND: 'hand',           // Affects hand evaluation
  REVEAL: 'reveal',       // Affects information visibility
  ANTE: 'ante'            // Affects ante/blind requirements
};

// Poker effect definitions
const POKER_EFFECTS = {
  // Third hole card effect for Zone A
  effect_third_hole_card: {
    id: 'effect_third_hole_card',
    name: 'Third Hole Card',
    description: 'Deal an extra hole card (3 total)',
    type: POKER_EFFECT_TYPES.DEAL,
    icon: '🎴',
    apply: (gameState, team) => {
      // This will be handled in the dealing logic
      return gameState;
    }
  },
  
  effect_placeholder_b: {
    id: 'effect_placeholder_b',
    name: 'Zone B Effect',
    description: 'Placeholder for Zone B poker effect',
    type: POKER_EFFECT_TYPES.POT,
    icon: '💰',
    value: 0.25, // Example: 25% bonus
    apply: (winnings, team) => {
      // To be implemented
      return winnings;
    }
  },
  
  effect_piece_discount: {
    id: 'effect_piece_discount',
    name: 'Barracks Discount',
    description: '50% off all piece purchases',
    type: 'ECONOMY', // New type for economy effects
    icon: '💎',
    value: 0.5, // 50% discount
    apply: (price, team) => {
      // Apply 50% discount
      return Math.ceil(price * 0.5);
    }
  }
};

// Mapping of control zones to poker effects
// This can be made dynamic later
const CONTROL_ZONE_POKER_EFFECTS = {
  A: 'effect_third_hole_card',
  B: 'effect_placeholder_b',
  C: 'effect_piece_discount'
};

// Helper function to get effect for a zone
function getPokerEffectForZone(zoneId) {
  const effectId = CONTROL_ZONE_POKER_EFFECTS[zoneId];
  return effectId ? POKER_EFFECTS[effectId] : null;
}

// Helper function to get all active effects for a team
function getActivePokerEffects(controlledZones, team) {
  const effects = [];
  
  Object.entries(controlledZones).forEach(([zoneId, controller]) => {
    if (controller === team) {
      const effect = getPokerEffectForZone(zoneId);
      if (effect) {
        effects.push(effect);
      }
    }
  });
  
  return effects;
}

// Apply all effects of a specific type
function applyPokerEffects(effects, type, target, team) {
  let result = target;
  
  const relevantEffects = effects.filter(effect => effect.type === type);
  
  relevantEffects.forEach(effect => {
    result = effect.apply(result, team);
  });
  
  return result;
}

// Function to randomize zone effects (for future use)
function randomizeZoneEffects(effectPool = null) {
  const pool = effectPool || Object.keys(POKER_EFFECTS);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  
  return {
    A: shuffled[0],
    B: shuffled[1],
    C: shuffled[2]
  };
}

// Function to rotate effects (for future use)
function rotateZoneEffects() {
  const current = CONTROL_ZONE_POKER_EFFECTS;
  return {
    A: current.C,
    B: current.A,
    C: current.B
  };
}

module.exports = {
  POKER_EFFECT_TYPES,
  POKER_EFFECTS,
  CONTROL_ZONE_POKER_EFFECTS,
  getPokerEffectForZone,
  getActivePokerEffects,
  applyPokerEffects,
  randomizeZoneEffects,
  rotateZoneEffects
};