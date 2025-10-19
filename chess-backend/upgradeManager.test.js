const UpgradeManager = require('./upgradeManager');
const { UPGRADE_DEFINITIONS } = require('./upgradeDefinitions');
const { PieceType } = require('./types');

describe('UpgradeManager - Eligibility Checks', () => {
  let upgradeManager;

  beforeEach(() => {
    upgradeManager = new UpgradeManager();
  });

  describe('isEligible', () => {
    it('should return eligible=true when all requirements are met', () => {
      const teamStats = {
        captureCount: { pawn: 1 },
        totalCaptures: 1
      };

      const result = upgradeManager.isEligible('white', 'pawn_speed_boost', teamStats);
      
      expect(result.eligible).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should return eligible=false when capture requirements are not met', () => {
      const teamStats = {
        captureCount: {},
        totalCaptures: 0
      };

      const result = upgradeManager.isEligible('white', 'pawn_speed_boost', teamStats);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(result.reasons[0]).toContain('pawn');
    });

    it('should check prerequisite upgrades', () => {
      const teamStats = {
        captureCount: { pawn: 3 },
        totalCaptures: 3
      };

      // Try to buy level 2 without level 1
      const result = upgradeManager.isEligible('white', 'pawn_diagonal_range', teamStats);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('Requires'))).toBe(true);
    });

    it('should allow level 2 purchase when level 1 is owned', () => {
      const teamStats = {
        captureCount: { pawn: 3 },
        totalCaptures: 3
      };

      // Purchase level 1 first
      upgradeManager.purchaseUpgrade('white', 'pawn_speed_boost', { captureCount: { pawn: 1 }, totalCaptures: 1 });

      // Now check level 2
      const result = upgradeManager.isEligible('white', 'pawn_diagonal_range', teamStats);
      
      expect(result.eligible).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should check treasury minimum requirements', () => {
      const teamStats = {
        captureCount: {},
        totalCaptures: 0
      };

      // King level 1 requires 750 treasury
      const result = upgradeManager.isEligible('white', 'king_double_step', teamStats);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('Treasury'))).toBe(true);
    });

    it('should check multiple piece type capture requirements', () => {
      const teamStats = {
        captureCount: { knight: 1, rook: 1 },
        totalCaptures: 2
      };

      // Enhanced queen's hook requires knight, rook, AND bishop
      const result = upgradeManager.isEligible('white', 'enhanced_queens_hook', teamStats);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('bishop'))).toBe(true);
    });

    it('should check total capture requirements', () => {
      const teamStats = {
        captureCount: { knight: 1 },
        totalCaptures: 2
      };

      // Knight level 2 requires 3 total captures
      const result = upgradeManager.isEligible('white', 'knight_extended_leap', teamStats);
      
      expect(result.eligible).toBe(false);
      expect(result.reasons.some(r => r.includes('total'))).toBe(true);
    });
  });

  describe('purchaseUpgrade', () => {
    it('should reject purchase when requirements are not met', () => {
      const teamStats = {
        captureCount: {},
        totalCaptures: 0
      };

      expect(() => {
        upgradeManager.purchaseUpgrade('white', 'pawn_speed_boost', teamStats);
      }).toThrow('Requirements not met');
    });

    it('should allow purchase when all requirements are met', () => {
      const teamStats = {
        captureCount: { pawn: 1 },
        totalCaptures: 1
      };

      // Ensure enough funds
      upgradeManager.economy.white = 1000;

      const result = upgradeManager.purchaseUpgrade('white', 'pawn_speed_boost', teamStats);
      
      expect(result).toBe(true);
      expect(upgradeManager.hasUpgrade('white', PieceType.PAWN, 'pawn_speed_boost')).toBe(true);
    });

    it('should enforce sequential level requirements', () => {
      const teamStats = {
        captureCount: { pawn: 5 },
        totalCaptures: 5
      };

      upgradeManager.economy.white = 10000;

      // Try to buy level 3 directly
      expect(() => {
        upgradeManager.purchaseUpgrade('white', 'pawn_dual_movement', teamStats);
      }).toThrow('Requirements not met');

      // Buy level 1
      upgradeManager.purchaseUpgrade('white', 'pawn_speed_boost', { ...teamStats, captureCount: { pawn: 1 } });

      // Buy level 2
      upgradeManager.purchaseUpgrade('white', 'pawn_diagonal_range', { ...teamStats, captureCount: { pawn: 3 } });

      // Now level 3 should work
      const result = upgradeManager.purchaseUpgrade('white', 'pawn_dual_movement', teamStats);
      expect(result).toBe(true);
    });
  });

  describe('getAvailableUpgrades', () => {
    it('should attach eligibility information to upgrades', () => {
      const teamStats = {
        captureCount: { pawn: 1 },
        totalCaptures: 1
      };

      upgradeManager.economy.white = 1000;

      const upgrades = upgradeManager.getAvailableUpgrades('white', teamStats);
      
      // All upgrades should have eligibility fields
      upgrades.forEach(upgrade => {
        expect(upgrade).toHaveProperty('eligible');
        expect(upgrade).toHaveProperty('lockedReasons');
      });

      // Pawn level 1 should be eligible
      const pawnL1 = upgrades.find(u => u.id === 'pawn_speed_boost');
      expect(pawnL1.eligible).toBe(true);

      // Pawn level 2 should not be eligible (no prerequisite)
      const pawnL2 = upgrades.find(u => u.id === 'pawn_diagonal_range');
      expect(pawnL2.eligible).toBe(false);
    });
  });
});

