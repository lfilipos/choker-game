const { PieceType, PieceColor, ActivationMethod } = require('./types');
const { UPGRADE_DEFINITIONS, CONTROL_ZONE_UPGRADES, STARTING_ECONOMY, INCOME_RATES } = require('./upgradeDefinitions');

class UpgradeManager {
  constructor() {
    this.upgrades = {
      white: this.initializeTeamUpgrades(),
      black: this.initializeTeamUpgrades()
    };
    
    this.economy = {
      white: STARTING_ECONOMY.white,
      black: STARTING_ECONOMY.black
    };
    
    this.temporaryUpgrades = new Map(); // Track temporary upgrades with expiration
    this.usedOnceUpgrades = new Map(); // Track one-time use upgrades
  }

  initializeTeamUpgrades() {
    return {
      [PieceType.PAWN]: [],
      [PieceType.KNIGHT]: [],
      [PieceType.BISHOP]: [],
      [PieceType.ROOK]: [],
      [PieceType.QUEEN]: [],
      [PieceType.KING]: []
    };
  }

  // Get current upgrade state
  getUpgradeState() {
    return {
      upgrades: this.upgrades,
      economy: this.economy
    };
  }

  // Check if a team can afford an upgrade
  canAfford(color, cost) {
    return this.economy[color] >= cost;
  }

  // Purchase an upgrade
  purchaseUpgrade(color, upgradeId) {
    const upgrade = UPGRADE_DEFINITIONS[upgradeId];
    
    if (!upgrade) {
      throw new Error('Invalid upgrade ID');
    }
    
    if (upgrade.activationMethod !== ActivationMethod.PURCHASE) {
      throw new Error('This upgrade cannot be purchased');
    }
    
    if (!this.canAfford(color, upgrade.cost)) {
      throw new Error('Insufficient funds');
    }
    
    if (this.hasUpgrade(color, upgrade.pieceType, upgradeId)) {
      throw new Error('Upgrade already owned');
    }
    
    // Deduct cost and add upgrade
    this.economy[color] -= upgrade.cost;
    this.upgrades[color][upgrade.pieceType].push(upgradeId);
    
    // Track temporary upgrades
    if (upgrade.duration) {
      this.temporaryUpgrades.set(`${color}_${upgradeId}`, {
        turnsRemaining: upgrade.duration,
        color,
        pieceType: upgrade.pieceType,
        upgradeId
      });
    }
    
    return true;
  }

  // Activate control zone upgrades
  activateControlZoneUpgrades(controlZones, board) {
    const zoneControl = this.calculateZoneControl(controlZones, board);
    
    Object.entries(zoneControl).forEach(([zoneId, controller]) => {
      if (controller && CONTROL_ZONE_UPGRADES[zoneId]) {
        CONTROL_ZONE_UPGRADES[zoneId].forEach(upgradeId => {
          const upgrade = UPGRADE_DEFINITIONS[upgradeId];
          if (upgrade && !this.hasUpgrade(controller, upgrade.pieceType, upgradeId)) {
            this.upgrades[controller][upgrade.pieceType].push(upgradeId);
            
            if (upgrade.duration) {
              this.temporaryUpgrades.set(`${controller}_${upgradeId}_zone`, {
                turnsRemaining: upgrade.duration,
                color: controller,
                pieceType: upgrade.pieceType,
                upgradeId
              });
            }
          }
        });
      }
    });
  }

  // Calculate which team controls each zone
  calculateZoneControl(controlZones, board) {
    const zoneControl = {};
    
    controlZones.forEach(zone => {
      let whitePieces = 0;
      let blackPieces = 0;
      
      zone.squares.forEach(square => {
        const piece = board[square.row][square.col];
        if (piece) {
          if (piece.color === PieceColor.WHITE) whitePieces++;
          else if (piece.color === PieceColor.BLACK) blackPieces++;
        }
      });
      
      if (whitePieces > blackPieces) {
        zoneControl[zone.id] = PieceColor.WHITE;
      } else if (blackPieces > whitePieces) {
        zoneControl[zone.id] = PieceColor.BLACK;
      } else {
        zoneControl[zone.id] = null; // Neutral
      }
    });
    
    return zoneControl;
  }

  // Process turn income and temporary upgrade expiration
  processTurnEnd(color, controlledZones) {
    // Add turn income
    this.economy[color] += INCOME_RATES.per_turn;
    
    // Add control zone income
    this.economy[color] += controlledZones * INCOME_RATES.per_control_zone;
    
    // Process temporary upgrades
    const expiredUpgrades = [];
    this.temporaryUpgrades.forEach((tempUpgrade, key) => {
      if (tempUpgrade.color === color) {
        tempUpgrade.turnsRemaining--;
        
        if (tempUpgrade.turnsRemaining <= 0) {
          expiredUpgrades.push(key);
          // Remove the upgrade
          const index = this.upgrades[tempUpgrade.color][tempUpgrade.pieceType].indexOf(tempUpgrade.upgradeId);
          if (index > -1) {
            this.upgrades[tempUpgrade.color][tempUpgrade.pieceType].splice(index, 1);
          }
        }
      }
    });
    
    // Remove expired upgrades from tracking
    expiredUpgrades.forEach(key => this.temporaryUpgrades.delete(key));
  }

  // Award capture income
  awardCaptureIncome(color) {
    this.economy[color] += INCOME_RATES.per_capture;
  }

  // Check if a team has a specific upgrade
  hasUpgrade(color, pieceType, upgradeId) {
    return this.upgrades[color][pieceType].includes(upgradeId);
  }

  // Get all active upgrades for a piece
  getPieceUpgrades(color, pieceType) {
    return this.upgrades[color][pieceType].map(upgradeId => UPGRADE_DEFINITIONS[upgradeId]);
  }

  // Check if a one-time upgrade has been used
  hasUsedOnceUpgrade(color, pieceType, upgradeId, piecePosition) {
    const key = `${color}_${pieceType}_${upgradeId}_${piecePosition.row}_${piecePosition.col}`;
    return this.usedOnceUpgrades.has(key);
  }

  // Mark a one-time upgrade as used
  markOnceUpgradeUsed(color, pieceType, upgradeId, piecePosition) {
    const key = `${color}_${pieceType}_${upgradeId}_${piecePosition.row}_${piecePosition.col}`;
    this.usedOnceUpgrades.set(key, true);
  }

  // Get available upgrades for purchase
  getAvailableUpgrades(color) {
    const available = [];
    
    Object.entries(UPGRADE_DEFINITIONS).forEach(([id, upgrade]) => {
      if (upgrade.activationMethod === ActivationMethod.PURCHASE && 
          !this.hasUpgrade(color, upgrade.pieceType, id)) {
        available.push({
          ...upgrade,
          canAfford: this.canAfford(color, upgrade.cost)
        });
      }
    });
    
    return available;
  }

  // Serialize state for network transmission
  serialize() {
    return {
      upgrades: this.upgrades,
      economy: this.economy,
      temporaryUpgrades: Array.from(this.temporaryUpgrades.entries()),
      usedOnceUpgrades: Array.from(this.usedOnceUpgrades.entries())
    };
  }

  // Restore state from serialized data
  deserialize(data) {
    this.upgrades = data.upgrades;
    this.economy = data.economy;
    this.temporaryUpgrades = new Map(data.temporaryUpgrades);
    this.usedOnceUpgrades = new Map(data.usedOnceUpgrades);
  }
}

module.exports = UpgradeManager;