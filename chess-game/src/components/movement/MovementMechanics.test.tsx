import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MovementMechanics } from './MovementMechanics';
import { DualMoveSelector } from './DualMoveSelector';
import { KnightAdjacentMovement } from './KnightAdjacentMovement';
import { BishopOrthogonalMovement } from './BishopOrthogonalMovement';
import { RookProtectionMechanics } from './RookProtectionMechanics';
import { QueenExtendedMovement } from './QueenExtendedMovement';
import { KingEnhancedMovement } from './KingEnhancedMovement';
import { TieredUpgradeDefinition } from '../../types/upgrades';
import { ChessPiece, Position } from '../../types';

// Mock data for testing
const mockUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'pawn_tier3',
    name: 'Dual Pawn Movement',
    description: 'Move two pawns in one turn.',
    summary: 'Move two pawns in one turn',
    cost: 500,
    pieceType: 'pawn',
    tier: 3,
    requirements: [{ type: 'capture', pieceType: 'pawn', count: 3 }],
    effects: [{ type: 'special', value: 'dual_move', description: 'Can move two pawns per turn' }],
    isAvailable: true,
    isPurchased: true,
  }
];

const mockBoard: (ChessPiece | null)[][] = Array(10).fill(null).map(() => Array(16).fill(null));
const mockPiece: ChessPiece = { type: 'pawn', color: 'white' };
const mockPosition: Position = { row: 5, col: 8 };

const mockProps = {
  onMoveComplete: jest.fn(),
  onCancel: jest.fn(),
};

describe('MovementMechanics Components', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MovementMechanics', () => {
    test('renders nothing when no piece is selected', () => {
      const { container } = render(
        <MovementMechanics
          selectedPiece={null}
          piecePosition={null}
          upgrades={mockUpgrades}
          board={mockBoard}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });

    test('renders nothing when piece has no relevant upgrades', () => {
      const { container } = render(
        <MovementMechanics
          selectedPiece={mockPiece}
          piecePosition={mockPosition}
          upgrades={[]}
          board={mockBoard}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('DualMoveSelector', () => {
    test('renders when pawn has dual movement upgrade', () => {
      render(
        <DualMoveSelector
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={mockUpgrades}
          availablePawns={[{ row: 6, col: 7 }, { row: 6, col: 8 }]}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('Dual Pawn Movement')).toBeInTheDocument();
      expect(screen.getByText('Select two pawns and their destinations')).toBeInTheDocument();
    });

    test('does not render when piece is not a pawn', () => {
      const { container } = render(
        <DualMoveSelector
          piece={{ type: 'knight', color: 'white', position: mockPosition }}
          upgrades={mockUpgrades}
          availablePawns={[]}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('KnightAdjacentMovement', () => {
    const knightUpgrades: TieredUpgradeDefinition[] = [
      {
        id: 'knight_tier1',
        name: 'Adjacent Movement',
        description: 'Knights can move to adjacent squares.',
        summary: 'Move to adjacent squares',
        cost: 300,
        pieceType: 'knight',
        tier: 1,
        requirements: [{ type: 'capture', pieceType: 'knight', count: 1 }],
        effects: [{ type: 'movement', value: 'adjacent', description: 'Can move to adjacent squares' }],
        isAvailable: true,
        isPurchased: true,
      }
    ];

    test('renders when knight has adjacent movement upgrade', () => {
      render(
        <KnightAdjacentMovement
          piece={{ type: 'knight', color: 'white', position: mockPosition }}
          upgrades={knightUpgrades}
          adjacentSquares={[{ row: 4, col: 8 }, { row: 6, col: 8 }]}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('Knight Adjacent Movement')).toBeInTheDocument();
      expect(screen.getByText('Select adjacent square for enhanced movement')).toBeInTheDocument();
    });

    test('does not render when piece is not a knight', () => {
      const { container } = render(
        <KnightAdjacentMovement
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={knightUpgrades}
          adjacentSquares={[]}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('BishopOrthogonalMovement', () => {
    const bishopUpgrades: TieredUpgradeDefinition[] = [
      {
        id: 'bishop_tier1',
        name: 'Orthogonal Movement',
        description: 'Bishops can move orthogonally.',
        summary: 'Move horizontally and vertically',
        cost: 300,
        pieceType: 'bishop',
        tier: 1,
        requirements: [{ type: 'capture', pieceType: 'bishop', count: 1 }],
        effects: [{ type: 'movement', value: 'orthogonal', description: 'Can move horizontally and vertically' }],
        isAvailable: true,
        isPurchased: true,
      }
    ];

    test('renders when bishop has orthogonal movement upgrade', () => {
      render(
        <BishopOrthogonalMovement
          piece={{ type: 'bishop', color: 'white', position: mockPosition }}
          upgrades={bishopUpgrades}
          orthogonalSquares={[{ row: 0, col: 8 }, { row: 9, col: 8 }]}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('Bishop Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Choose movement type and destination')).toBeInTheDocument();
    });

    test('does not render when piece is not a bishop', () => {
      const { container } = render(
        <BishopOrthogonalMovement
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={bishopUpgrades}
          orthogonalSquares={[]}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('RookProtectionMechanics', () => {
    const rookUpgrades: TieredUpgradeDefinition[] = [
      {
        id: 'rook_tier2',
        name: 'Protection Mechanics',
        description: 'Rooks can protect squares.',
        summary: 'Protect squares from attacks',
        cost: 400,
        pieceType: 'rook',
        tier: 2,
        requirements: [{ type: 'capture', pieceType: 'rook', count: 2 }],
        effects: [{ type: 'special', value: 'protection', description: 'Can protect squares' }],
        isAvailable: true,
        isPurchased: true,
      }
    ];

    test('renders when rook has protection mechanics upgrade', () => {
      render(
        <RookProtectionMechanics
          piece={{ type: 'rook', color: 'white', position: mockPosition }}
          upgrades={rookUpgrades}
          protectedSquares={[{ row: 0, col: 8 }, { row: 9, col: 8 }]}
          onProtectionComplete={jest.fn()}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('Rook Protection Mechanics')).toBeInTheDocument();
      expect(screen.getByText('Advanced protection and control capabilities')).toBeInTheDocument();
    });

    test('does not render when piece is not a rook', () => {
      const { container } = render(
        <RookProtectionMechanics
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={rookUpgrades}
          protectedSquares={[]}
          onProtectionComplete={jest.fn()}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('QueenExtendedMovement', () => {
    const queenUpgrades: TieredUpgradeDefinition[] = [
      {
        id: 'queen_tier2',
        name: 'Extended Movement',
        description: 'Queens have extended movement.',
        summary: 'Extended movement patterns',
        cost: 500,
        pieceType: 'queen',
        tier: 2,
        requirements: [{ type: 'capture', pieceType: 'queen', count: 2 }],
        effects: [{ type: 'movement', value: 'extended_movement', description: 'Extended movement capabilities' }],
        isAvailable: true,
        isPurchased: true,
      }
    ];

    test('renders when queen has extended movement upgrade', () => {
      render(
        <QueenExtendedMovement
          piece={{ type: 'queen', color: 'white', position: mockPosition }}
          upgrades={queenUpgrades}
          extendedSquares={[{ row: 0, col: 0 }, { row: 9, col: 15 }]}
          onMovementComplete={jest.fn()}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('Queen Extended Movement')).toBeInTheDocument();
      expect(screen.getByText('Advanced movement patterns and capabilities')).toBeInTheDocument();
    });

    test('does not render when piece is not a queen', () => {
      const { container } = render(
        <QueenExtendedMovement
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={queenUpgrades}
          extendedSquares={[]}
          onMovementComplete={jest.fn()}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('KingEnhancedMovement', () => {
    const kingUpgrades: TieredUpgradeDefinition[] = [
      {
        id: 'king_tier2',
        name: 'Enhanced Movement',
        description: 'Kings have enhanced movement.',
        summary: 'Enhanced movement abilities',
        cost: 600,
        pieceType: 'king',
        tier: 2,
        requirements: [{ type: 'capture', pieceType: 'king', count: 2 }],
        effects: [{ type: 'movement', value: 'enhanced_movement', description: 'Enhanced movement capabilities' }],
        isAvailable: true,
        isPurchased: true,
      }
    ];

    test('renders when king has enhanced movement upgrade', () => {
      render(
        <KingEnhancedMovement
          piece={{ type: 'king', color: 'white', position: mockPosition }}
          upgrades={kingUpgrades}
          enhancedSquares={[{ row: 4, col: 7 }, { row: 6, col: 9 }]}
          onMovementComplete={jest.fn()}
          {...mockProps}
        />
      );
      
      expect(screen.getByText('King Enhanced Movement')).toBeInTheDocument();
      expect(screen.getByText('Royal abilities and strategic movement')).toBeInTheDocument();
    });

    test('does not render when piece is not a king', () => {
      const { container } = render(
        <KingEnhancedMovement
          piece={{ type: 'pawn', color: 'white', position: mockPosition }}
          upgrades={kingUpgrades}
          enhancedSquares={[]}
          onMovementComplete={jest.fn()}
          {...mockProps}
        />
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
