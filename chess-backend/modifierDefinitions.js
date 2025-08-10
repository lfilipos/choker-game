// Modifier definitions for game-wide effects

const ModifierType = {
  INCREASE_BLINDS: 'increase_blinds',
  DECREASE_BLINDS: 'decrease_blinds'
};

// Calculate blind amounts using fibonacci-like sequence
function getBlindAmounts(level) {
  const baseSB = 5;
  const baseBB = 10;
  
  if (level === 1) {
    return { smallBlind: baseSB, bigBlind: baseBB };
  }
  
  // Fibonacci-like progression: 5/10, 10/20, 15/30, 25/50, 40/80, 65/130, etc.
  let prevSB = baseSB;
  let prevBB = baseBB;
  let currentSB = baseBB;
  let currentBB = baseBB * 2;
  
  for (let i = 2; i < level; i++) {
    const tempSB = currentSB;
    const tempBB = currentBB;
    currentSB = prevSB + currentSB;
    currentBB = prevBB + currentBB;
    prevSB = tempSB;
    prevBB = tempBB;
  }
  
  return { smallBlind: currentSB, bigBlind: currentBB };
}

// Calculate cost to increase blinds
function getIncreaseBlindsCost(currentLevel) {
  // Base cost 100, doubles each level: 100, 200, 400, 800, etc.
  return 100 * Math.pow(2, currentLevel - 1);
}

// Calculate cost to decrease blinds
function getDecreaseBlindsCost(currentLevel) {
  if (currentLevel <= 1) return null; // Cannot decrease below level 1
  // Cost to decrease is half the cost of the previous increase
  return 100 * Math.pow(2, currentLevel - 3);
}

const MODIFIERS = {
  [ModifierType.INCREASE_BLINDS]: {
    id: ModifierType.INCREASE_BLINDS,
    name: 'Increase Blinds',
    description: 'Increases blind levels for both teams. Takes effect next hand.',
    type: 'global',
    getCost: (matchState) => {
      const currentLevel = matchState.blindLevel || 1;
      return getIncreaseBlindsCost(currentLevel);
    },
    canPurchase: (matchState, purchasingTeam) => {
      const cost = getIncreaseBlindsCost(matchState.blindLevel || 1);
      const teamMoney = matchState.teams?.[purchasingTeam]?.economy || 0;
      return teamMoney >= cost;
    },
    apply: (matchState, purchasingTeam) => {
      const previousLevel = matchState.blindLevel || 1;
      matchState.blindLevel = previousLevel + 1;
      
      // Store the information about who increased it and the cost for decrease calculation
      matchState.lastBlindIncreaseCost = getIncreaseBlindsCost(previousLevel);
      
      console.log(`Blinds increased to level ${matchState.blindLevel} by ${purchasingTeam} team`);
      
      // The actual blind amounts will be applied at the start of the next poker hand
      return {
        success: true,
        message: `Blinds increased to level ${matchState.blindLevel}`,
        newBlindLevel: matchState.blindLevel,
        blindAmounts: getBlindAmounts(matchState.blindLevel)
      };
    }
  },
  
  [ModifierType.DECREASE_BLINDS]: {
    id: ModifierType.DECREASE_BLINDS,
    name: 'Decrease Blinds',
    description: 'Decreases blind levels for both teams. Takes effect next hand.',
    type: 'global',
    getCost: (matchState) => {
      const currentLevel = matchState.blindLevel || 1;
      return getDecreaseBlindsCost(currentLevel);
    },
    canPurchase: (matchState, purchasingTeam) => {
      const currentLevel = matchState.blindLevel || 1;
      if (currentLevel <= 1) return false; // Cannot decrease below level 1
      
      const cost = getDecreaseBlindsCost(currentLevel);
      const teamMoney = matchState.teams?.[purchasingTeam]?.economy || 0;
      return teamMoney >= cost;
    },
    apply: (matchState, purchasingTeam) => {
      const previousLevel = matchState.blindLevel || 1;
      if (previousLevel <= 1) {
        return {
          success: false,
          message: 'Blinds already at minimum level'
        };
      }
      
      matchState.blindLevel = previousLevel - 1;
      
      console.log(`Blinds decreased to level ${matchState.blindLevel} by ${purchasingTeam} team`);
      
      // The actual blind amounts will be applied at the start of the next poker hand
      return {
        success: true,
        message: `Blinds decreased to level ${matchState.blindLevel}`,
        newBlindLevel: matchState.blindLevel,
        blindAmounts: getBlindAmounts(matchState.blindLevel)
      };
    }
  }
};

// Get all available modifiers with their current costs
function getAvailableModifiers(matchState, team) {
  const modifiers = [];
  const currentLevel = matchState.blindLevel || 1;
  const currentBlinds = getBlindAmounts(currentLevel);
  
  for (const modifierType in MODIFIERS) {
    const modifier = MODIFIERS[modifierType];
    const cost = modifier.getCost(matchState);
    
    if (cost !== null) {
      const modifierData = {
        id: modifier.id,
        name: modifier.name,
        description: modifier.description,
        cost: cost,
        canPurchase: modifier.canPurchase(matchState, team),
        type: modifier.type,
        currentLevel: currentLevel,
        currentBlinds: currentBlinds
      };
      
      // Add preview information for blind modifiers
      if (modifier.id === ModifierType.INCREASE_BLINDS) {
        const newLevel = currentLevel + 1;
        const newBlinds = getBlindAmounts(newLevel);
        modifierData.newLevel = newLevel;
        modifierData.newBlinds = newBlinds;
        modifierData.previewText = `Level ${currentLevel} → Level ${newLevel}`;
        modifierData.blindsPreview = `${currentBlinds.smallBlind}/${currentBlinds.bigBlind} → ${newBlinds.smallBlind}/${newBlinds.bigBlind}`;
      } else if (modifier.id === ModifierType.DECREASE_BLINDS && currentLevel > 1) {
        const newLevel = currentLevel - 1;
        const newBlinds = getBlindAmounts(newLevel);
        modifierData.newLevel = newLevel;
        modifierData.newBlinds = newBlinds;
        modifierData.previewText = `Level ${currentLevel} → Level ${newLevel}`;
        modifierData.blindsPreview = `${currentBlinds.smallBlind}/${currentBlinds.bigBlind} → ${newBlinds.smallBlind}/${newBlinds.bigBlind}`;
      }
      
      modifiers.push(modifierData);
    }
  }
  
  return modifiers;
}

module.exports = {
  ModifierType,
  MODIFIERS,
  getAvailableModifiers,
  getBlindAmounts,
  getIncreaseBlindsCost,
  getDecreaseBlindsCost
};