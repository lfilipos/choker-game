import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RookLinkingMechanics } from '../RookLinkingMechanics';
import { Position, PieceType, PieceColor, ChessPiece } from '../../../types';
import { TieredUpgradeDefinition } from '../../../types/upgrades';

// Mock data for testing
const mockPiece = {
  type: 'rook' as PieceType,
  color: 'white' as PieceColor,
  position: { row: 4, col: 4 }
};

const mockUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'rook_tier2',
    name: 'Rook Linking',
    description: 'Link with other rooks to create walls',
    summary: 'Link with other rooks',
    cost: 400,
    pieceType: 'rook',
    tier: 2,
    requirements: [],
    effects: [{ type: 'special', value: 'rook_linking', description: 'Can link with other rooks' }],
    isAvailable: true,
    isPurchased: true
  }
];

const createMockBoard = (): (ChessPiece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place the main rook
  board[4][4] = {
    type: 'rook',
    color: 'white',
    position: { row: 4, col: 4 }
  };
  
  // Place linked rooks at different distances
  board[2][4] = { type: 'rook', color: 'white', position: { row: 2, col: 4 } }; // 2 squares away
  board[6][4] = { type: 'rook', color: 'white', position: { row: 6, col: 4 } }; // 2 squares away
  board[4][2] = { type: 'rook', color: 'white', position: { row: 4, col: 2 } }; // 2 squares away
  board[4][6] = { type: 'rook', color: 'white', position: { row: 4, col: 6 } }; // 2 squares away
  
  // Place some enemy pieces (but not blocking the path between rooks)
  board[3][3] = { type: 'pawn', color: 'black', position: { row: 3, col: 3 } };
  board[5][5] = { type: 'pawn', color: 'black', position: { row: 5, col: 5 } };
  
  return board;
};

const mockOnMoveComplete = jest.fn();
const mockOnCancel = jest.fn();

describe('RookLinkingMechanics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Rook Linking')).toBeInTheDocument();
    });

    test('displays correct title and description', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Rook Linking')).toBeInTheDocument();
      expect(screen.getByText('Select a rook to link with and create a wall:')).toBeInTheDocument();
    });
  });

  describe('Linked Rook Detection', () => {
    test('finds rooks within linking distance', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should find the linked rooks at 2 squares distance
      // Component displays coordinates as (row, col)
      expect(screen.getByText(/Rook at \(2, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Rook at \(6, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Rook at \(4, 2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Rook at \(4, 6\)/)).toBeInTheDocument();
    });

    test('shows distance information for each linked rook', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Check that distance badges are displayed
      const distanceBadges = screen.getAllByText(/2 square/);
      expect(distanceBadges).toHaveLength(4); // 4 rooks at 2 squares distance
    });

    test('handles case with no available linked rooks', () => {
      const emptyBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      emptyBoard[4][4] = {
        type: 'rook',
        color: 'white',
        position: { row: 4, col: 4 }
      };
      
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={emptyBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('No rooks available for linking within range.')).toBeInTheDocument();
    });
  });

  describe('Rook Selection and Wall Creation', () => {
    test('allows selection of a linked rook', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const firstRookButton = screen.getByText(/Rook at \(2, 4\)/);
      fireEvent.click(firstRookButton);
      
      // Should show wall creation interface
      expect(screen.getByText('Wall Creation')).toBeInTheDocument();
      expect(screen.getByText(/Selected rook: \(4, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Linked rook: \(2, 4\)/)).toBeInTheDocument();
    });

    test('calculates wall positions correctly for horizontal linking', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select horizontal rook
      const horizontalRookButton = screen.getByText(/Rook at \(4, 2\)/);
      fireEvent.click(horizontalRookButton);
      
      // Should show wall positions
      expect(screen.getByText(/Wall will be created at:/)).toBeInTheDocument();
      expect(screen.getByText(/\(4, 3\)/)).toBeInTheDocument(); // Wall position between rooks
    });

    test('calculates wall positions correctly for vertical linking', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select vertical rook
      const verticalRookButton = screen.getByText(/Rook at \(2, 4\)/);
      fireEvent.click(verticalRookButton);
      
      // Should show wall positions
      expect(screen.getByText(/Wall will be created at:/)).toBeInTheDocument();
      expect(screen.getByText(/\(3, 4\)/)).toBeInTheDocument(); // Wall position between rooks
    });

    test('enables wall creation button when rook is selected', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const firstRookButton = screen.getByText(/Rook at \(2, 4\)/);
      fireEvent.click(firstRookButton);
      
      const createWallButton = screen.getByText('Create Wall');
      expect(createWallButton).toBeEnabled();
    });
  });

  describe('Wall Creation Execution', () => {
    test('executes wall creation and calls onMoveComplete', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select a rook
      const firstRookButton = screen.getByText(/Rook at \(2, 4\)/);
      fireEvent.click(firstRookButton);
      
      // Create the wall
      const createWallButton = screen.getByText('Create Wall');
      fireEvent.click(createWallButton);
      
      // Should call onMoveComplete with wall moves
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 3, col: 4 } }
      ]);
    });

    test('handles multiple wall positions correctly', () => {
      const board = createMockBoard();
      // Place rooks further apart to create multiple wall positions
      board[1][4] = { type: 'rook', color: 'white', position: { row: 1, col: 4 } };
      
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select the distant rook
      const distantRookButton = screen.getByText(/Rook at \(6, 4\)/);
      fireEvent.click(distantRookButton);
      
      // Create the wall
      const createWallButton = screen.getByText('Create Wall');
      fireEvent.click(createWallButton);
      
      // Should call onMoveComplete with wall moves
      // The wall between (4,4) and (6,4) should be at (5,4)
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 5, col: 4 } }
      ]);
    });
  });

  describe('User Interaction and Navigation', () => {
    test('allows canceling the operation', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    test('shows cancel button in both states', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Initial state
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // After selecting a rook
      const firstRookButton = screen.getByText(/Rook at \(4, 2\)/);
      fireEvent.click(firstRookButton);
      
      // Should still show cancel button (there are now two - one in initial state, one in wall creation)
      expect(screen.getAllByText('Cancel')).toHaveLength(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles board boundaries correctly', () => {
      const edgeBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      edgeBoard[0][0] = { type: 'rook', color: 'white', position: { row: 0, col: 0 } };
      edgeBoard[0][2] = { type: 'rook', color: 'white', position: { row: 0, col: 2 } };
      
      render(
        <RookLinkingMechanics
          piece={{ ...mockPiece, position: { row: 0, col: 0 } }}
          upgrades={mockUpgrades}
          board={edgeBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should find the linked rook
      expect(screen.getByText(/Rook at \(0, 2\)/)).toBeInTheDocument();
    });

    test('handles pieces blocking the path', () => {
      const blockedBoard = createMockBoard();
      // Place a piece between the rooks
      blockedBoard[3][4] = { type: 'pawn', color: 'black', position: { row: 3, col: 4 } };
      
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={blockedBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not find the blocked rook
      expect(screen.queryByText(/Rook at \(2, 4\)/)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    test('provides clear visual feedback for selected rooks', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const firstRookButton = screen.getByText(/Rook at \(4, 2\)/);
      fireEvent.click(firstRookButton);
      
      // Should show clear selection feedback
      expect(screen.getByText('Wall Creation')).toBeInTheDocument();
      expect(screen.getByText(/Selected rook: \(4, 4\)/)).toBeInTheDocument();
    });

    test('provides clear instructions for wall creation', () => {
      const board = createMockBoard();
      render(
        <RookLinkingMechanics
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const firstRookButton = screen.getByText(/Rook at \(4, 2\)/);
      fireEvent.click(firstRookButton);
      
      expect(screen.getByText('Wall Creation')).toBeInTheDocument();
      expect(screen.getByText(/Creating wall between rooks at:/)).toBeInTheDocument();
    });
  });
});
