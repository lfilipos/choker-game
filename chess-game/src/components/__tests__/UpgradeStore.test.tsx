import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import UpgradeStore from '../UpgradeStore';
import { TieredUpgradeDefinition, UpgradeState, TeamEconomy, UpgradeProgress } from '../../types/upgrades';
import { PieceColor, PieceType } from '../../types';

// Mock data for testing
const mockTieredUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'pawn_tier1',
    name: 'Enhanced Movement',
    description: 'Your pawns can now move two spaces on their first move.',
    summary: 'Move two spaces on first move',
    cost: 250,
    pieceType: 'pawn',
    tier: 1,
    requirements: [
      { type: 'capture', pieceType: 'pawn', count: 1 }
    ],
    effects: [
      { type: 'movement', value: 2, description: 'First move can be 2 squares' }
    ],
    isAvailable: true,
    isPurchased: false,
  },
  {
    id: 'pawn_tier2',
    name: 'Extended Capture Range',
    description: 'Pawns can now capture pieces from two squares away.',
    summary: 'Capture from two squares away',
    cost: 350,
    pieceType: 'pawn',
    tier: 2,
    requirements: [
      { type: 'purchase', upgradeId: 'pawn_tier1' },
      { type: 'capture', pieceType: 'pawn', count: 2 }
    ],
    effects: [
      { type: 'attack', value: 2, description: 'Capture range increased to 2 squares' }
    ],
    isAvailable: false,
    isPurchased: false,
  },
  {
    id: 'rook_tier1',
    name: 'Defensive Protection',
    description: 'Rooks now provide defensive cover for pieces behind them.',
    summary: 'Defend piece behind it',
    cost: 200,
    pieceType: 'rook',
    tier: 1,
    requirements: [
      { type: 'capture', pieceType: 'rook', count: 1 }
    ],
    effects: [
      { type: 'defense', value: 1, description: 'Protects pieces behind rook' }
    ],
    isAvailable: true,
    isPurchased: false,
  }
];

const mockUpgrades: UpgradeState = {
  white: {},
  black: {}
};

const mockEconomy: TeamEconomy = {
  white: 1000,
  black: 800
};

const mockUpgradeProgress: Record<PieceType, UpgradeProgress> = {
  pawn: {
    pieceType: 'pawn',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  },
  rook: {
    pieceType: 'rook',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  },
  knight: {
    pieceType: 'knight',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  },
  bishop: {
    pieceType: 'bishop',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  },
  queen: {
    pieceType: 'queen',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  },
  king: {
    pieceType: 'king',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, knight: 0, bishop: 0, rook: 0, queen: 0, king: 0 }
  }
};

const mockPurchasablePieces = [
  {
    type: 'pawn' as PieceType,
    price: 100,
    name: 'Pawn',
    description: 'Basic infantry unit with forward movement and diagonal capture.',
    isUnlocked: true,
    isAvailable: true
  }
];

const mockModifiers = [
  {
    id: 'increase_blinds',
    name: 'Increase Blind Level',
    description: 'Increase the current blind level, affecting poker hand costs.',
    cost: 200,
    canPurchase: true,
    type: 'Blind Control'
  }
];

const defaultProps = {
  playerColor: 'white' as PieceColor,
  upgrades: mockUpgrades,
  economy: mockEconomy,
  onPurchaseUpgrade: jest.fn(),
  onPurchasePiece: jest.fn(),
  onPurchaseModifier: jest.fn(),
  availableUpgrades: mockTieredUpgrades,
  purchasablePieces: mockPurchasablePieces,
  availableModifiers: mockModifiers,
  blindLevel: 2,
  blindAmounts: { smallBlind: 10, bigBlind: 20 },
  upgradeProgress: mockUpgradeProgress,
};

describe('UpgradeStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders upgrade store with correct title', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('Upgrade Store')).toBeInTheDocument();
    });

    test('renders player balance correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('1000')).toBeInTheDocument();
      // Check for currency symbol in the balance section specifically
      const balanceSection = screen.getByText('1000').closest('.store-balance');
      expect(balanceSection).toHaveTextContent('💰');
    });

    test('renders all three tabs', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('Upgrades')).toBeInTheDocument();
      expect(screen.getByText('Buy Pieces')).toBeInTheDocument();
      expect(screen.getByText('Modifiers')).toBeInTheDocument();
    });

    test('renders piece type selector with all piece types', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('All Pieces')).toBeInTheDocument();
      expect(screen.getByText('♟ Pawn')).toBeInTheDocument();
      expect(screen.getByText('♞ Knight')).toBeInTheDocument();
      expect(screen.getByText('♝ Bishop')).toBeInTheDocument();
      expect(screen.getByText('♜ Rook')).toBeInTheDocument();
      expect(screen.getByText('♛ Queen')).toBeInTheDocument();
      expect(screen.getByText('♚ King')).toBeInTheDocument();
    });
  });

  describe('Upgrade Display', () => {
    test('renders all available upgrades', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Extended Capture Range')).toBeInTheDocument();
      expect(screen.getByText('Defensive Protection')).toBeInTheDocument();
    });

    test('displays upgrade summaries', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('Move two spaces on first move')).toBeInTheDocument();
      expect(screen.getByText('Capture from two squares away')).toBeInTheDocument();
      expect(screen.getByText('Defend piece behind it')).toBeInTheDocument();
    });

    test('displays upgrade costs correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('250')).toBeInTheDocument();
      expect(screen.getByText('350')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
    });

    test('displays tier badges with correct colors', () => {
      render(<UpgradeStore {...defaultProps} />);
      const tier1Badges = screen.getAllByText('Basic');
      const tier2Badges = screen.getAllByText('Advanced');
      
      expect(tier1Badges).toHaveLength(2); // pawn_tier1 and rook_tier1
      expect(tier2Badges).toHaveLength(1); // pawn_tier2
    });

    test('displays upgrade requirements correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('Capture 1 Pawn')).toBeInTheDocument();
      expect(screen.getByText('Purchase previous tier upgrade')).toBeInTheDocument();
      expect(screen.getByText('Capture 2 Pawns')).toBeInTheDocument();
    });

    test('displays upgrade effects correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      expect(screen.getByText('First move can be 2 squares')).toBeInTheDocument();
      expect(screen.getByText('Capture range increased to 2 squares')).toBeInTheDocument();
      expect(screen.getByText('Protects pieces behind rook')).toBeInTheDocument();
    });
  });

  describe('Piece Type Filtering', () => {
    test('filters upgrades by piece type when pawn is selected', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const pawnButton = screen.getByText('♟ Pawn');
      fireEvent.click(pawnButton);
      
      expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Extended Capture Range')).toBeInTheDocument();
      expect(screen.queryByText('Defensive Protection')).not.toBeInTheDocument();
    });

    test('filters upgrades by piece type when rook is selected', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const rookButton = screen.getByText('♜ Rook');
      fireEvent.click(rookButton);
      
      expect(screen.queryByText('Enhanced Movement')).not.toBeInTheDocument();
      expect(screen.queryByText('Extended Capture Range')).not.toBeInTheDocument();
      expect(screen.getByText('Defensive Protection')).toBeInTheDocument();
    });

    test('shows all upgrades when "All Pieces" is selected', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const allPiecesButton = screen.getByText('All Pieces');
      fireEvent.click(allPiecesButton);
      
      expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Extended Capture Range')).toBeInTheDocument();
      expect(screen.getByText('Defensive Protection')).toBeInTheDocument();
    });
  });

  describe('Purchase Functionality', () => {
    test('calls onPurchaseUpgrade when purchase button is clicked', async () => {
      const user = userEvent.setup();
      
      render(<UpgradeStore {...defaultProps} />);
      
      // Wait for the component to fully render
      await waitFor(() => {
        expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      });
      
      // Get the first purchase button and ensure it's enabled
      const purchaseButtons = screen.getAllByText('Purchase');
      const firstPurchaseButton = purchaseButtons[0];
      expect(firstPurchaseButton).not.toBeDisabled();
      
      // Click the button using userEvent
      await user.click(firstPurchaseButton);
      
      // Verify the callback was called
      expect(defaultProps.onPurchaseUpgrade).toHaveBeenCalledWith('pawn_tier1');
    });

    test('disables purchase button for unaffordable upgrades', () => {
      const limitedEconomyProps = {
        ...defaultProps,
        economy: { white: 100, black: 800 }
      };
      
      render(<UpgradeStore {...limitedEconomyProps} />);
      
      const insufficientFundsButtons = screen.getAllByText('Insufficient Funds');
      expect(insufficientFundsButtons[0]).toBeDisabled();
    });

    test('shows "Owned" button for already purchased upgrades', () => {
      const purchasedUpgradesProps = {
        ...defaultProps,
        upgrades: {
          white: { pawn: ['pawn_tier1'] },
          black: {}
        }
      };
      
      render(<UpgradeStore {...purchasedUpgradesProps} />);
      
      expect(screen.getByText('✓ Owned')).toBeInTheDocument();
    });
  });

  describe('Tab Navigation', () => {
    test('switches to pieces tab when clicked', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const piecesTab = screen.getByText('Buy Pieces');
      fireEvent.click(piecesTab);
      
      expect(screen.getByText('Pawn')).toBeInTheDocument();
      expect(screen.getByText('Basic infantry unit with forward movement and diagonal capture.')).toBeInTheDocument();
    });

    test('switches to modifiers tab when clicked', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const modifiersTab = screen.getByText('Modifiers');
      fireEvent.click(modifiersTab);
      
      expect(screen.getByText('Increase Blind Level')).toBeInTheDocument();
      expect(screen.getByText('Current Blind Level: 2')).toBeInTheDocument();
    });

    test('maintains active tab state', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const piecesTab = screen.getByText('Buy Pieces');
      fireEvent.click(piecesTab);
      
      expect(piecesTab).toHaveClass('active');
      expect(screen.getByText('Upgrades')).not.toHaveClass('active');
    });
  });

  describe('Pieces Tab', () => {
    test('renders purchasable pieces correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const piecesTab = screen.getByText('Buy Pieces');
      fireEvent.click(piecesTab);
      
      expect(screen.getByText('Pawn')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
    });

    test('calls onPurchasePiece when piece purchase button is clicked', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const piecesTab = screen.getByText('Buy Pieces');
      fireEvent.click(piecesTab);
      
      const purchaseButton = screen.getByText('Purchase');
      fireEvent.click(purchaseButton);
      
      expect(defaultProps.onPurchasePiece).toHaveBeenCalledWith('pawn');
    });
  });

  describe('Modifiers Tab', () => {
    test('renders modifiers correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const modifiersTab = screen.getByText('Modifiers');
      fireEvent.click(modifiersTab);
      
      expect(screen.getByText('Increase Blind Level')).toBeInTheDocument();
      expect(screen.getByText('Current Blind Level: 2')).toBeInTheDocument();
      
      // Check for blind amounts with flexible text matching
      const blindAmountsSection = screen.getByText(/Small Blind:/);
      expect(blindAmountsSection).toHaveTextContent('10');
      expect(blindAmountsSection).toHaveTextContent('20');
    });

    test('calls onPurchaseModifier when modifier purchase button is clicked', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      const modifiersTab = screen.getByText('Modifiers');
      fireEvent.click(modifiersTab);
      
      const purchaseButton = screen.getByText('Purchase');
      fireEvent.click(purchaseButton);
      
      expect(defaultProps.onPurchaseModifier).toHaveBeenCalledWith('increase_blinds');
    });
  });

  describe('Edge Cases', () => {
    test('renders correctly when no upgrades are available', () => {
      const noUpgradesProps = {
        ...defaultProps,
        availableUpgrades: []
      };
      
      render(<UpgradeStore {...noUpgradesProps} />);
      expect(screen.getByText('No upgrades available for any piece')).toBeInTheDocument();
    });

    test('renders correctly when no pieces are available', () => {
      const noPiecesProps = {
        ...defaultProps,
        purchasablePieces: []
      };
      
      render(<UpgradeStore {...noPiecesProps} />);
      
      const piecesTab = screen.getByText('Buy Pieces');
      fireEvent.click(piecesTab);
      
      expect(screen.getByText('Loading pieces...')).toBeInTheDocument();
    });

    test('renders correctly when no modifiers are available', () => {
      const noModifiersProps = {
        ...defaultProps,
        availableModifiers: []
      };
      
      render(<UpgradeStore {...noModifiersProps} />);
      
      const modifiersTab = screen.getByText('Modifiers');
      fireEvent.click(modifiersTab);
      
      expect(screen.getByText('No modifiers available')).toBeInTheDocument();
    });

    test('handles null player color gracefully', () => {
      const nullPlayerProps = {
        ...defaultProps,
        playerColor: null
      };
      
      const { container } = render(<UpgradeStore {...nullPlayerProps} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Requirement Display', () => {
    test('displays capture requirements with correct icons and text', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      // Check for requirement icon in the requirements section
      const requirementItems = screen.getAllByText('⚔️');
      expect(requirementItems.length).toBeGreaterThan(0);
      expect(screen.getByText('Capture 1 Pawn')).toBeInTheDocument();
    });

    test('displays purchase requirements correctly', () => {
      render(<UpgradeStore {...defaultProps} />);
      
      // Check for requirement icon in the requirements section
      const requirementItems = screen.getAllByText('🔓');
      expect(requirementItems.length).toBeGreaterThan(0);
      expect(screen.getByText('Purchase previous tier upgrade')).toBeInTheDocument();
    });

    test('handles complex requirements with multiple types', () => {
      const complexUpgrade: TieredUpgradeDefinition = {
        id: 'complex_upgrade',
        name: 'Complex Upgrade',
        description: 'A complex upgrade with multiple requirements.',
        summary: 'Multiple requirement types',
        cost: 750,
        pieceType: 'queen',
        tier: 3,
        requirements: [
          { type: 'capture', pieceType: 'queen', count: 2 },
          { type: 'treasury', amount: 500 },
          { type: 'control_zone', zoneId: 'A' }
        ],
        effects: [
          { type: 'special', value: 'complex', description: 'Advanced abilities' }
        ],
        isAvailable: false,
        isPurchased: false,
      };

      const complexProps = {
        ...defaultProps,
        availableUpgrades: [complexUpgrade]
      };

      render(<UpgradeStore {...complexProps} />);
      
      // Check for requirement icons in the requirements section
      const requirementItems = screen.getAllByText('💰');
      expect(requirementItems.length).toBeGreaterThan(0);
      expect(screen.getByText('Have 500 currency')).toBeInTheDocument();
      expect(screen.getByText('🎯')).toBeInTheDocument();
      expect(screen.getByText('Control zone A')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    test('maintains functionality on smaller screens', async () => {
      const user = userEvent.setup();
      
      // Mock window.innerWidth for mobile testing
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<UpgradeStore {...defaultProps} />);
      
      // Verify all core functionality still works
      expect(screen.getByText('Upgrade Store')).toBeInTheDocument();
      expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      
      // Wait for component to fully render
      await waitFor(() => {
        expect(screen.getAllByText('Purchase').length).toBeGreaterThan(0);
      });
      
      // Get the first purchase button and click it
      const purchaseButtons = screen.getAllByText('Purchase');
      const firstPurchaseButton = purchaseButtons[0];
      await user.click(firstPurchaseButton);
      expect(defaultProps.onPurchaseUpgrade).toHaveBeenCalled();
    });
  });
});
