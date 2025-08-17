const { PieceType, PieceColor, RequirementType, UpgradeTier } = require('./types');

/**
 * Requirement Validator
 * Handles validation of upgrade requirements including capture, purchase, treasury, and control zone
 */
class RequirementValidator {
  constructor() {
    this.requirementTrackers = new Map(); // Track requirements per match
  }

  /**
   * Check if an upgrade is available based on all requirements
   */
  isUpgradeAvailable(matchState, upgradeId) {
    const { matchId, currentPlayer } = matchState;
    
    // Get the upgrade definition
    const upgrade = this.getUpgradeById(upgradeId);
    if (!upgrade) {
      return false;
    }

    // Check all requirements
    for (const requirement of upgrade.requirements) {
      if (!this.validateRequirement(matchState, requirement)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Validate a single requirement
   */
  validateRequirement(matchState, requirement) {
    switch (requirement.type) {
      case RequirementType.CAPTURE:
        return this.validateCaptureRequirement(matchState, requirement);
      case RequirementType.PURCHASE:
        return this.validatePurchaseRequirement(matchState, requirement);
      case RequirementType.TREASURY:
        return this.validateTreasuryRequirement(matchState, requirement);
      case RequirementType.CONTROL_ZONE:
        return this.validateControlZoneRequirement(matchState, requirement);
      default:
        return false;
    }
  }

  /**
   * Validate capture requirement
   */
  validateCaptureRequirement(matchState, requirement) {
    const { matchId, currentPlayer } = matchState;
    const tracker = this.getRequirementTracker(matchId);
    
    if (!tracker) {
      return false;
    }

    const captureCount = tracker.getCaptureCount(currentPlayer, requirement.pieceType);
    return captureCount >= requirement.count;
  }

  /**
   * Validate purchase requirement
   */
  validatePurchaseRequirement(matchState, requirement) {
    const { matchId, currentPlayer } = matchState;
    const tracker = this.getRequirementTracker(matchId);
    
    if (!tracker) {
      return false;
    }

    return tracker.hasPurchasedUpgrade(currentPlayer, requirement.upgradeId);
  }

  /**
   * Validate treasury requirement
   */
  validateTreasuryRequirement(matchState, requirement) {
    const { economy, currentPlayer } = matchState;
    return economy[currentPlayer] >= requirement.amount;
  }

  /**
   * Validate control zone requirement
   */
  validateControlZoneRequirement(matchState, requirement) {
    // This would need to be implemented based on the game state
    // For now, return true to allow progression
    return true;
  }

  /**
   * Get or create requirement tracker for a match
   */
  getRequirementTracker(matchId) {
    if (!this.requirementTrackers.has(matchId)) {
      this.requirementTrackers.set(matchId, new RequirementTracker());
    }
    return this.requirementTrackers.get(matchId);
  }

  /**
   * Track a capture for requirement validation
   */
  trackCapture(matchId, color, pieceType) {
    const tracker = this.getRequirementTracker(matchId);
    tracker.updateCaptureCount(color, pieceType);
  }

  /**
   * Track an upgrade purchase for requirement validation
   */
  trackUpgradePurchase(matchId, color, upgradeId) {
    const tracker = this.getRequirementTracker(matchId);
    tracker.addPurchasedUpgrade(color, upgradeId);
  }

  /**
   * Get upgrade by ID from tiered system
   */
  getUpgradeById(upgradeId) {
    const { TIERED_UPGRADES } = require('./upgradeDefinitions');
    
    for (const pieceType in TIERED_UPGRADES) {
      for (const tier in TIERED_UPGRADES[pieceType]) {
        if (TIERED_UPGRADES[pieceType][tier].id === upgradeId) {
          return TIERED_UPGRADES[pieceType][tier];
        }
      }
    }
    return null;
  }

  /**
   * Serialize requirement trackers
   */
  serialize() {
    const serialized = {};
    for (const [matchId, tracker] of this.requirementTrackers) {
      serialized[matchId] = tracker.serialize();
    }
    return serialized;
  }

  /**
   * Deserialize requirement trackers
   */
  deserialize(data) {
    this.requirementTrackers.clear();
    for (const [matchId, trackerData] of Object.entries(data)) {
      const tracker = new RequirementTracker();
      tracker.deserialize(trackerData);
      this.requirementTrackers.set(matchId, tracker);
    }
  }
}

/**
 * Requirement Tracker
 * Tracks capture counts and purchased upgrades per match/player
 */
class RequirementTracker {
  constructor() {
    this.captureCounts = {
      white: {
        [PieceType.PAWN]: 0,
        [PieceType.KNIGHT]: 0,
        [PieceType.BISHOP]: 0,
        [PieceType.ROOK]: 0,
        [PieceType.QUEEN]: 0,
        [PieceType.KING]: 0
      },
      black: {
        [PieceType.PAWN]: 0,
        [PieceType.KNIGHT]: 0,
        [PieceType.BISHOP]: 0,
        [PieceType.ROOK]: 0,
        [PieceType.QUEEN]: 0,
        [PieceType.KING]: 0
      }
    };
    
    this.purchasedUpgrades = {
      white: [],
      black: []
    };
  }

  /**
   * Update capture count for a piece type
   */
  updateCaptureCount(color, pieceType) {
    if (this.captureCounts[color] && this.captureCounts[color][pieceType] !== undefined) {
      this.captureCounts[color][pieceType]++;
    }
  }

  /**
   * Get capture count for a piece type
   */
  getCaptureCount(color, pieceType) {
    return this.captureCounts[color]?.[pieceType] || 0;
  }

  /**
   * Add purchased upgrade
   */
  addPurchasedUpgrade(color, upgradeId) {
    if (this.purchasedUpgrades[color]) {
      this.purchasedUpgrades[color].push(upgradeId);
    }
  }

  /**
   * Check if upgrade has been purchased
   */
  hasPurchasedUpgrade(color, upgradeId) {
    return this.purchasedUpgrades[color]?.includes(upgradeId) || false;
  }

  /**
   * Serialize tracker state
   */
  serialize() {
    return {
      captureCounts: this.captureCounts,
      purchasedUpgrades: this.purchasedUpgrades
    };
  }

  /**
   * Deserialize tracker state
   */
  deserialize(data) {
    this.captureCounts = data.captureCounts || this.captureCounts;
    this.purchasedUpgrades = data.purchasedUpgrades || this.purchasedUpgrades;
  }
}

module.exports = {
  RequirementValidator,
  RequirementTracker
};
