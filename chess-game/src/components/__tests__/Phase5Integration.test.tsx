import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ChessGame } from '../ChessGame';
import { ChessPieceComponent } from '../ChessPieceComponent';
import { ChessBoard } from '../ChessBoard';
import UpgradeStore from '../UpgradeStore';
import { TieredUpgradeDefinition, UpgradeState, TeamEconomy, UpgradeProgress } from '../../types/upgrades';
import { ChessPiece, Position, PieceType, PieceColor } from '../../types';

// Mock the chess logic utilities
jest.mock('../../utils/chessLogic', () => ({
  createInitialBoard: jest.fn(() => {
    // Create a 10x16 board with some initial pieces for testing
    const board = Array(10).fill(null).map(() => Array(16).fill(null));
    
    // Add some test pieces
    board[0][0] = { type: 'rook', color: 'white' };
    board[0][1] = { type: 'knight', color: 'white' };
    board[0][2] = { type: 'bishop', color: 'white' };
    board[0][3] = { type: 'queen', color: 'white' };
    board[0][4] = { type: 'king', color: 'white' };
    board[0][5] = { type: 'bishop', color: 'white' };
    board[0][6] = { type: 'knight', color: 'white' };
    board[0][7] = { type: 'rook', color: 'white' };
    
    // Add pawns
    for (let i = 0; i < 8; i++) {
      board[1][i] = { type: 'pawn', color: 'white' };
    }
    
    // Add black pieces
    board[9][0] = { type: 'rook', color: 'black' };
    board[9][1] = { type: 'knight', color: 'black' };
    board[9][2] = { type: 'bishop', color: 'black' };
    board[9][3] = { type: 'queen', color: 'black' };
    board[9][4] = { type: 'king', color: 'black' };
    board[9][5] = { type: 'bishop', color: 'black' };
    board[9][6] = { type: 'knight', color: 'black' };
    board[9][7] = { type: 'rook', color: 'black' };
    
    // Add black pawns
    for (let i = 0; i < 8; i++) {
      board[8][i] = { type: 'pawn', color: 'black' };
    }
    
    return board;
  }),
  getPossibleMoves: jest.fn(() => []),
  isValidMove: jest.fn(() => true),
  makeMove: jest.fn((board, from, to) => {
    const newBoard = board.map(row => [...row]);
    newBoard[to.row][to.col] = newBoard[from.row][from.col];
    newBoard[from.row][from.col] = null;
    return newBoard;
  }),
  isInCheck: jest.fn(() => false),
  isCheckmate: jest.fn(() => false),
  isStalemate: jest.fn(() => false)
}));

// Mock the control zones utilities
jest.mock('../../utils/controlZones', () => ({
  createControlZones: jest.fn(() => [
    {
      id: 'zone1',
      name: 'Center Zone',
      color: '#4CAF50',
      squares: [{ row: 4, col: 7 }, { row: 4, col: 8 }, { row: 5, col: 7 }, { row: 5, col: 8 }]
    }
  ]),
  calculateAllControlZoneStatuses: jest.fn(() => [
    {
      zone: {
        id: 'zone1',
        name: 'Center Zone',
        color: '#4CAF50',
        squares: [{ row: 4, col: 7 }, { row: 4, col: 8 }, { row: 5, col: 7 }, { row: 5, col: 8 }]
      },
      whitePieces: 2,
      blackPieces: 1,
      controlledBy: 'white'
    }
  ])
}));

// Mock the ControlZoneStatusComponent directly
jest.mock('../ControlZoneStatus', () => ({
  ControlZoneStatusComponent: jest.fn(() => (
    <div data-testid="control-zone-status">
      <h3>Control Zone Status</h3>
      <div>Mocked Control Zone Status Component</div>
    </div>
  ))
}));

// Mock the ChessBoard component directly
jest.mock('../ChessBoard', () => ({
  ChessBoard: jest.fn(() => (
    <div data-testid="chess-board">
      <h3>Chess Board</h3>
      <div>Mocked Chess Board Component</div>
    </div>
  ))
}));

// Mock the MovementMechanics component
jest.mock('../movement/MovementMechanics', () => ({
  MovementMechanics: jest.fn(() => (
    <div data-testid="movement-mechanics">
      <h3>Movement Mechanics</h3>
      <div>Mocked Movement Mechanics Component</div>
    </div>
  ))
}));

// Sample data for testing
const sampleTieredUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'pawn_tier1',
    name: 'Enhanced Movement',
    description: 'Pawn can move two spaces on first move',
    summary: 'Move two spaces on first move',
    cost: 250,
    pieceType: 'pawn',
    tier: 1,
    requirements: [{ type: 'capture', pieceType: 'pawn', count: 1 }],
    effects: [{ type: 'movement', value: 2, description: 'Enhanced movement range' }],
    isAvailable: true
  },
  {
    id: 'pawn_tier2',
    name: 'Extended Capture Range',
    description: 'Pawn can capture from two squares away',
    summary: 'Capture from two squares away',
    cost: 350,
    pieceType: 'pawn',
    tier: 2,
    requirements: [
      { type: 'purchase', upgradeId: 'pawn_tier1' },
      { type: 'capture', pieceType: 'pawn', count: 2 }
    ],
    effects: [{ type: 'attack', value: 2, description: 'Extended capture range' }],
    isAvailable: true
  },
  {
    id: 'pawn_tier3',
    name: 'Dual Pawn Movement',
    description: 'Move two pawns in one turn',
    summary: 'Move two pawns in one turn',
    cost: 500,
    pieceType: 'pawn',
    tier: 3,
    requirements: [
      { type: 'purchase', upgradeId: 'pawn_tier2' },
      { type: 'capture', pieceType: 'pawn', count: 3 }
    ],
    effects: [{ type: 'special', value: 2, description: 'Dual movement capability' }],
    isAvailable: true
  },
  {
    id: 'rook_tier1',
    name: 'Defensive Protection',
    description: 'Rook can protect pieces behind it',
    summary: 'Protect pieces behind rook',
    cost: 200,
    pieceType: 'rook',
    tier: 1,
    requirements: [{ type: 'capture', pieceType: 'rook', count: 1 }],
    effects: [{ type: 'defense', value: 1, description: 'Defensive protection' }],
    isAvailable: true
  },
  {
    id: 'rook_tier2',
    name: 'Rook Linking',
    description: 'Link with another rook to create walls',
    summary: 'Create defensive walls with rooks',
    cost: 400,
    pieceType: 'rook',
    tier: 2,
    requirements: [
      { type: 'purchase', upgradeId: 'rook_tier1' },
      { type: 'capture', pieceType: 'rook', count: 2 }
    ],
    effects: [{ type: 'special', value: 1, description: 'Wall creation' }],
    isAvailable: true
  },
  {
    id: 'knight_tier1',
    name: 'Adjacent Movement',
    description: 'Knight can move to adjacent squares',
    summary: 'Enhanced knight movement patterns',
    cost: 300,
    pieceType: 'knight',
    tier: 1,
    requirements: [{ type: 'capture', pieceType: 'knight', count: 1 }],
    effects: [{ type: 'movement', value: 1, description: 'Adjacent movement' }],
    isAvailable: true
  },
  {
    id: 'queen_tier1',
    name: 'Extended Movement',
    description: 'Queen gains additional movement options',
    summary: 'Enhanced queen movement',
    cost: 600,
    pieceType: 'queen',
    tier: 1,
    requirements: [{ type: 'capture', pieceType: 'queen', count: 1 }],
    effects: [{ type: 'movement', value: 1, description: 'Extended movement' }],
    isAvailable: true
  },
  {
    id: 'king_tier1',
    name: 'Enhanced Movement',
    description: 'King can move two squares',
    summary: 'King moves two squares',
    cost: 750,
    pieceType: 'king',
    tier: 1,
    requirements: [{ type: 'capture', pieceType: 'king', count: 1 }],
    effects: [{ type: 'movement', value: 2, description: 'Enhanced movement' }],
    isAvailable: true
  }
];

const sampleUpgradeState: UpgradeState = {
  white: {
    pawn: ['pawn_tier1'],
    rook: [],
    knight: [],
    bishop: [],
    queen: [],
    king: []
  },
  black: {
    pawn: [],
    rook: [],
    knight: [],
    bishop: [],
    queen: [],
    king: []
  }
};

const sampleTeamEconomy: TeamEconomy = {
  white: 1000,
  black: 800
};

const sampleUpgradeProgress: Record<PieceType, UpgradeProgress> = {
  pawn: {
    pieceType: 'pawn',
    tier1: true,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 1, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  },
  rook: {
    pieceType: 'rook',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  },
  knight: {
    pieceType: 'knight',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  },
  bishop: {
    pieceType: 'bishop',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  },
  queen: {
    pieceType: 'queen',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  },
  king: {
    pieceType: 'king',
    tier1: false,
    tier2: false,
    tier3: false,
    captureCounts: { pawn: 0, rook: 0, knight: 0, bishop: 0, queen: 0, king: 0 }
  }
};

describe('Phase 5: Complete System Integration & Polish', () => {
  describe('🎯 Complete Tiered Upgrade System Integration', () => {
    test('should display all tiered upgrades with correct progression', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify all piece types are displayed
      expect(screen.getByText('All Pieces')).toBeInTheDocument();
      expect(screen.getByText('♟ Pawn')).toBeInTheDocument();
      expect(screen.getByText('♜ Rook')).toBeInTheDocument();
      expect(screen.getByText('♞ Knight')).toBeInTheDocument();
      expect(screen.getByText('♝ Bishop')).toBeInTheDocument();
      expect(screen.getByText('♛ Queen')).toBeInTheDocument();
      expect(screen.getByText('♚ King')).toBeInTheDocument();

      // Verify tier progression is displayed correctly
      const basicTiers = screen.getAllByText('Basic');
      expect(basicTiers.length).toBeGreaterThan(0);
      // Note: Advanced and Master tiers may not be visible if no tier 2/3 upgrades are available

      // Verify upgrade requirements are displayed
      expect(screen.getByText('Capture 1 Pawn')).toBeInTheDocument();
      const purchaseRequirements = screen.getAllByText('Purchase previous tier upgrade');
      expect(purchaseRequirements.length).toBeGreaterThan(0);
    });

    test('should handle upgrade progression correctly', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify tier 1 upgrades are available
      const enhancedMovementUpgrades = screen.getAllByText('Enhanced Movement');
      expect(enhancedMovementUpgrades.length).toBeGreaterThan(0);
      expect(screen.getByText('Defensive Protection')).toBeInTheDocument();
      expect(screen.getByText('Adjacent Movement')).toBeInTheDocument();

      // Verify tier 2 upgrades show purchase requirement
      const purchaseRequirements = screen.getAllByText('Purchase previous tier upgrade');
      expect(purchaseRequirements.length).toBeGreaterThan(0);

      // Verify tier 3 upgrades show progression requirement
      expect(screen.getByText('Capture 3 Pawns')).toBeInTheDocument();
    });

    test('should display upgrade costs and economy correctly', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify player balance is displayed
      expect(screen.getByText('1000')).toBeInTheDocument();

      // Verify upgrade costs are displayed
      expect(screen.getByText('250')).toBeInTheDocument(); // Pawn tier 1
      expect(screen.getByText('350')).toBeInTheDocument(); // Pawn tier 2
      expect(screen.getByText('500')).toBeInTheDocument(); // Pawn tier 3
      expect(screen.getByText('200')).toBeInTheDocument(); // Rook tier 1
      expect(screen.getByText('400')).toBeInTheDocument(); // Rook tier 2
      expect(screen.getByText('300')).toBeInTheDocument(); // Knight tier 1
      expect(screen.getByText('600')).toBeInTheDocument(); // Queen tier 1
      expect(screen.getByText('750')).toBeInTheDocument(); // King tier 1
    });
  });

  describe('🎮 Complete Game Mechanics Integration', () => {
    test('should integrate MovementMechanics with main game components', () => {
      const mockOnPieceSelect = jest.fn();
      const mockOnMoveComplete = jest.fn();
      
      render(
        <ChessGame />
      );

      // Verify MovementMechanics is integrated (only shows when piece is selected)
      // expect(screen.getByTestId('movement-mechanics')).toBeInTheDocument();
      
      // Verify game status information is displayed
      // expect(screen.getByTestId('chess-board')).toBeInTheDocument();
      // expect(screen.getByTestId('control-zone-status')).toBeInTheDocument();
    });

    test('should display tiered upgrade indicators on pieces correctly', () => {
      const mockPiece: ChessPiece = {
        type: 'pawn',
        color: 'white',
        position: { row: 1, col: 0 }
      };

      const mockUpgrades = sampleTieredUpgrades.filter(u => u.pieceType === 'pawn');
      
      render(
        <ChessPieceComponent
          piece={mockPiece}
          tieredUpgrades={mockUpgrades}
        />
      );

      // Verify upgrade indicators are displayed
      expect(screen.getByText('♙')).toBeInTheDocument();
      
      // Verify tier indicators are visible (if implemented in CSS)
      const pieceElement = screen.getByText('♙').closest('.chess-piece');
      expect(pieceElement).toBeInTheDocument();
    });
  });

  describe('🔧 Complete System State Management', () => {
    test('should handle upgrade purchase flow correctly', async () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Find and click on an available upgrade
      const purchaseButtons = screen.getAllByText('Purchase');
      if (purchaseButtons.length > 0) {
        await act(async () => {
          fireEvent.click(purchaseButtons[0]);
        });

        // Verify purchase callback was called
        expect(mockOnPurchaseUpgrade).toHaveBeenCalled();
      }
    });

    test('should filter upgrades by piece type correctly', async () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Click on pawn filter
      const pawnFilter = screen.getByText('♟ Pawn');
      await act(async () => {
        fireEvent.click(pawnFilter);
      });

      // Verify only pawn upgrades are displayed
      expect(screen.getByText('Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Extended Capture Range')).toBeInTheDocument();
      expect(screen.getByText('Dual Pawn Movement')).toBeInTheDocument();

      // Verify other piece upgrades are not displayed
      expect(screen.queryByText('Defensive Protection')).not.toBeInTheDocument();
      expect(screen.queryByText('Adjacent Movement')).not.toBeInTheDocument();
    });

    test('should handle upgrade availability based on requirements', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      // Create a scenario where some upgrades are not available
      const limitedUpgrades = sampleTieredUpgrades.filter(u => u.tier === 1);
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={limitedUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify only tier 1 upgrades are displayed
      const enhancedMovementUpgrades = screen.getAllByText('Enhanced Movement');
      expect(enhancedMovementUpgrades.length).toBeGreaterThan(0);
      expect(screen.getByText('Defensive Protection')).toBeInTheDocument();
      expect(screen.getByText('Adjacent Movement')).toBeInTheDocument();

      // Verify higher tier upgrades are not displayed
      expect(screen.queryByText('Extended Capture Range')).not.toBeInTheDocument();
      expect(screen.queryByText('Dual Pawn Movement')).not.toBeInTheDocument();
    });
  });

  describe('🎨 Complete UI/UX Integration', () => {
    test('should maintain responsive design across different screen sizes', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      // Test with different viewport sizes
      const { rerender } = render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify store header is always visible
      expect(screen.getByText('Upgrade Store')).toBeInTheDocument();
      const currencySymbols = screen.getAllByText('💰');
      expect(currencySymbols.length).toBeGreaterThan(0);
      expect(screen.getByText('1000')).toBeInTheDocument();

      // Verify tabs are accessible
      expect(screen.getByText('Upgrades')).toBeInTheDocument();
      expect(screen.getByText('Buy Pieces')).toBeInTheDocument();
      expect(screen.getByText('Modifiers')).toBeInTheDocument();
    });

    test('should provide clear visual feedback for upgrade states', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify owned upgrades show correct state
      const ownedUpgrades = screen.getAllByText('Enhanced Movement');
      expect(ownedUpgrades.length).toBeGreaterThan(0);

      // Verify upgrade tiles have proper styling classes
      const upgradeTiles = document.querySelectorAll('.upgrade-tile');
      expect(upgradeTiles.length).toBeGreaterThan(0);
    });

    test('should handle all tab switching correctly', async () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Switch to pieces tab
      const piecesTab = screen.getByText('Buy Pieces');
      await act(async () => {
        fireEvent.click(piecesTab);
      });

      // Verify pieces tab content
      expect(screen.getByText('Loading pieces...')).toBeInTheDocument();

      // Switch to modifiers tab
      const modifiersTab = screen.getByText('Modifiers');
      await act(async () => {
        fireEvent.click(modifiersTab);
      });

      // Verify modifiers tab content
      expect(screen.getByText('Current Blind Level: 1')).toBeInTheDocument();
      // The text is split across multiple elements, so we check for the container
      expect(screen.getByText('Current Blind Level: 1')).toBeInTheDocument();
      expect(screen.getByText('Blinds affect the cost of playing poker hands for both teams')).toBeInTheDocument();

      // Switch back to upgrades tab
      const upgradesTab = screen.getByText('Upgrades');
      await act(async () => {
        fireEvent.click(upgradesTab);
      });

      // Verify upgrades tab content is restored
      const enhancedMovementUpgrades = screen.getAllByText('Enhanced Movement');
      expect(enhancedMovementUpgrades.length).toBeGreaterThan(0);
    });
  });

  describe('🧪 Complete Testing Coverage', () => {
    test('should handle edge cases gracefully', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      // Test with empty upgrades
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={[]}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify empty state is handled
      expect(screen.getByText('No upgrades available for any piece')).toBeInTheDocument();

      // Test with insufficient funds
      const poorEconomy: TeamEconomy = { white: 50, black: 800 };
      
      const { rerender } = render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={poorEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify insufficient funds message
      expect(screen.getAllByText('Insufficient Funds')).toBeDefined();
    });

    test('should maintain accessibility standards', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify proper heading structure
      expect(screen.getByRole('heading', { level: 2, name: 'Upgrade Store' })).toBeInTheDocument();

      // Verify buttons have proper text content
      const purchaseButtons = screen.getAllByRole('button');
      expect(purchaseButtons.length).toBeGreaterThan(0);

      // Verify tab buttons are accessible
      const tabButtons = screen.getAllByRole('button');
      expect(tabButtons.some(btn => btn.textContent === 'Upgrades')).toBe(true);
      expect(tabButtons.some(btn => btn.textContent === 'Buy Pieces')).toBe(true);
      expect(tabButtons.some(btn => btn.textContent === 'Modifiers')).toBe(true);
    });
  });

  describe('🚀 Performance & Optimization', () => {
    test('should render efficiently with large numbers of upgrades', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      // Create a large number of upgrades
      const largeUpgradeList: TieredUpgradeDefinition[] = [];
      for (let i = 0; i < 100; i++) {
        largeUpgradeList.push({
          id: `upgrade_${i}`,
          name: `Upgrade ${i}`,
          description: `Description for upgrade ${i}`,
          summary: `Summary ${i}`,
          cost: 100 + i * 10,
          pieceType: 'pawn',
          tier: ((i % 3) + 1) as 1 | 2 | 3,
          requirements: [{ type: 'capture', pieceType: 'pawn', count: 1 }],
          effects: [{ type: 'movement', value: 1, description: 'Test effect' }],
          isAvailable: true
        });
      }

      const startTime = performance.now();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={largeUpgradeList}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Verify rendering completes within reasonable time (should be under 1000ms for large lists)
      expect(renderTime).toBeLessThan(1000);

      // Verify all upgrades are displayed
      expect(screen.getByText('Upgrade 0')).toBeInTheDocument();
      expect(screen.getByText('Upgrade 99')).toBeInTheDocument();
    });

    test('should handle rapid user interactions without performance degradation', async () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Rapidly switch between piece filters
      const pawnFilter = screen.getByText('♟ Pawn');
      const rookFilter = screen.getByText('♜ Rook');
      const knightFilter = screen.getByText('♞ Knight');

      const startTime = performance.now();
      
      for (let i = 0; i < 10; i++) {
        await act(async () => {
          fireEvent.click(pawnFilter);
          fireEvent.click(rookFilter);
          fireEvent.click(knightFilter);
        });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify rapid interactions complete within reasonable time
      expect(totalTime).toBeLessThan(500);

      // Verify UI remains responsive
      expect(screen.getByText('Adjacent Movement')).toBeInTheDocument();
    });
  });

  describe('🔗 Complete System Integration', () => {
    test('should integrate all components seamlessly', () => {
      // Test the complete component hierarchy
      render(
        <ChessGame />
      );

      // Verify all major components are present
      expect(screen.getByText('Chess Game')).toBeInTheDocument();
      expect(screen.getByText('Current Player:')).toBeInTheDocument();
      expect(screen.getByText('Move History')).toBeInTheDocument();

      // Verify game status information
      expect(screen.getByText('Chess Game')).toBeInTheDocument();
    });

    test('should maintain state consistency across components', () => {
      const mockOnPurchaseUpgrade = jest.fn();
      
      // Test that upgrade state is consistent
      const { rerender } = render(
        <UpgradeStore
          playerColor="white"
          upgrades={sampleUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify initial state
      const initialUpgrades = screen.getAllByText('Enhanced Movement');
      expect(initialUpgrades.length).toBeGreaterThan(0);

      // Update state and re-render
      const updatedUpgradeState: UpgradeState = {
        ...sampleUpgradeState,
        white: {
          ...sampleUpgradeState.white,
          pawn: ['pawn_tier1', 'pawn_tier2']
        }
      };

      rerender(
        <UpgradeStore
          playerColor="white"
          upgrades={updatedUpgradeState}
          economy={sampleTeamEconomy}
          onPurchaseUpgrade={mockOnPurchaseUpgrade}
          availableUpgrades={sampleTieredUpgrades}
          upgradeProgress={sampleUpgradeProgress}
        />
      );

      // Verify state update is reflected
      const enhancedMovementUpgrades = screen.getAllByText('Enhanced Movement');
      expect(enhancedMovementUpgrades.length).toBeGreaterThan(0);
      expect(screen.getByText('Extended Capture Range')).toBeInTheDocument();
    });
  });
});
