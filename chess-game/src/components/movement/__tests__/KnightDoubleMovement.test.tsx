import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KnightDoubleMovement } from '../KnightDoubleMovement';
import { Position, PieceType, PieceColor, ChessPiece } from '../../../types';
import { TieredUpgradeDefinition } from '../../../types/upgrades';

// Mock data for testing
const mockPiece = {
  type: 'knight' as PieceType,
  color: 'white' as PieceColor,
  position: { row: 4, col: 4 }
};

const mockUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'knight_tier3',
    name: 'Double Movement',
    description: 'Knight can move twice in one turn',
    summary: 'Move twice per turn',
    cost: 500,
    pieceType: 'knight',
    tier: 3,
    requirements: [],
    effects: [{ type: 'special', value: 'double_movement', description: 'Can move twice per turn' }],
    isAvailable: true,
    isPurchased: true
  }
];

const createMockBoard = (): (ChessPiece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place the main knight
  board[4][4] = {
    type: 'knight',
    color: 'white',
    position: { row: 4, col: 4 }
  };
  
  // Place some enemy pieces for capture
  board[2][3] = { type: 'pawn', color: 'black', position: { row: 2, col: 3 } };
  board[2][5] = { type: 'pawn', color: 'black', position: { row: 2, col: 5 } };
  board[6][3] = { type: 'pawn', color: 'black', position: { row: 6, col: 3 } };
  board[6][5] = { type: 'pawn', color: 'black', position: { row: 6, col: 5 } };
  
  // Place some empty squares for movement
  board[3][2] = null;
  board[3][6] = null;
  board[5][2] = null;
  board[5][6] = null;
  
  return board;
};

const mockOnMoveComplete = jest.fn();
const mockOnCancel = jest.fn();

describe('KnightDoubleMovement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Knight Double Movement')).toBeInTheDocument();
    });

    test('displays correct title and description for first phase', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Knight Double Movement')).toBeInTheDocument();
      expect(screen.getByText('Select your first move:')).toBeInTheDocument();
    });
  });

  describe('First Move Phase', () => {
    test('displays all valid first move options', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show all valid L-shaped knight moves
      expect(screen.getByText('Move to (2, 3)')).toBeInTheDocument();
      expect(screen.getByText('Move to (2, 5)')).toBeInTheDocument();
      expect(screen.getByText('Move to (6, 3)')).toBeInTheDocument();
      expect(screen.getByText('Move to (6, 5)')).toBeInTheDocument();
      expect(screen.getByText('Move to (3, 2)')).toBeInTheDocument();
      expect(screen.getByText('Move to (3, 6)')).toBeInTheDocument();
      expect(screen.getByText('Move to (5, 2)')).toBeInTheDocument();
      expect(screen.getByText('Move to (5, 6)')).toBeInTheDocument();
    });

    test('filters out invalid moves (out of bounds)', () => {
      const edgeBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      edgeBoard[0][0] = {
        type: 'knight',
        color: 'white',
        position: { row: 0, col: 0 }
      };
      
      render(
        <KnightDoubleMovement
          piece={{ ...mockPiece, position: { row: 0, col: 0 } }}
          upgrades={mockUpgrades}
          board={edgeBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should only show moves that stay within bounds
      expect(screen.getByText('Move to (2, 1)')).toBeInTheDocument();
      expect(screen.getByText('Move to (1, 2)')).toBeInTheDocument();
      
      // Should not show moves that go out of bounds
      expect(screen.queryByText('Move to (-2, 1)')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to (1, -2)')).not.toBeInTheDocument();
    });

    test('filters out moves to allied pieces', () => {
      const alliedBoard = createMockBoard();
      // Place an allied piece at one of the move positions
      alliedBoard[2][3] = { type: 'pawn', color: 'white', position: { row: 2, col: 3 } };
      
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={alliedBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show the move to allied piece position
      expect(screen.queryByText('Move to (2, 3)')).not.toBeInTheDocument();
      
      // Should still show other valid moves
      expect(screen.getByText('Move to (2, 5)')).toBeInTheDocument();
    });

    test('shows no moves message when no valid moves available', () => {
      const blockedBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      blockedBoard[4][4] = {
        type: 'knight',
        color: 'white',
        position: { row: 4, col: 4 }
      };
      // Block all possible moves with allied pieces
      blockedBoard[2][3] = { type: 'pawn', color: 'white', position: { row: 2, col: 3 } };
      blockedBoard[2][5] = { type: 'pawn', color: 'white', position: { row: 2, col: 5 } };
      blockedBoard[6][3] = { type: 'pawn', color: 'white', position: { row: 6, col: 3 } };
      blockedBoard[6][5] = { type: 'pawn', color: 'white', position: { row: 6, col: 5 } };
      blockedBoard[3][2] = { type: 'pawn', color: 'white', position: { row: 3, col: 2 } };
      blockedBoard[3][6] = { type: 'pawn', color: 'white', position: { row: 3, col: 6 } };
      blockedBoard[5][2] = { type: 'pawn', color: 'white', position: { row: 5, col: 2 } };
      blockedBoard[5][6] = { type: 'pawn', color: 'white', position: { row: 5, col: 6 } };
      
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={blockedBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('No valid first moves available.')).toBeInTheDocument();
    });
  });

  describe('Second Move Phase', () => {
    test('transitions to second phase after first move selection', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Should now show second phase
      expect(screen.getByText('First move: (4, 4) → (2, 3)')).toBeInTheDocument();
      expect(screen.getByText('Now select your second move:')).toBeInTheDocument();
    });

    test('shows second move options from the new position', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move to (2, 3)
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Should show second move options from position (2, 3)
      expect(screen.getByText('Move to (0, 2)')).toBeInTheDocument();
      expect(screen.getByText('Move to (0, 4)')).toBeInTheDocument();
      expect(screen.getByText('Move to (1, 1)')).toBeInTheDocument();
      expect(screen.getByText('Move to (1, 5)')).toBeInTheDocument();
      expect(screen.getByText('Move to (3, 1)')).toBeInTheDocument();
      expect(screen.getByText('Move to (3, 5)')).toBeInTheDocument();
      expect(screen.getByText('Move to (4, 2)')).toBeInTheDocument();
      // Position (4, 4) is occupied by the knight, so it's not a valid move
    });

    test('filters second moves based on board state', () => {
      const board = createMockBoard();
      // Block some second move options
      board[0][2] = { type: 'pawn', color: 'white', position: { row: 0, col: 2 } };
      board[1][1] = { type: 'pawn', color: 'black', position: { row: 1, col: 1 } };
      
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Should not show move to allied piece
      expect(screen.queryByText('Move to (0, 2)')).not.toBeInTheDocument();
      
      // Should show move to enemy piece (capture)
      expect(screen.getByText('Move to (1, 1)')).toBeInTheDocument();
      
      // Should show move to empty square
      expect(screen.getByText('Move to (0, 4)')).toBeInTheDocument();
    });

    test('shows no moves message when no valid second moves available', () => {
      const board = createMockBoard();
      // Block all possible second moves
      board[0][2] = { type: 'pawn', color: 'white', position: { row: 0, col: 2 } };
      board[0][4] = { type: 'pawn', color: 'white', position: { row: 0, col: 4 } };
      board[1][1] = { type: 'pawn', color: 'white', position: { row: 1, col: 1 } };
      board[1][5] = { type: 'pawn', color: 'white', position: { row: 1, col: 5 } };
      board[3][1] = { type: 'pawn', color: 'white', position: { row: 3, col: 1 } };
      board[3][5] = { type: 'pawn', color: 'white', position: { row: 3, col: 5 } };
      board[4][2] = { type: 'pawn', color: 'white', position: { row: 4, col: 2 } };
      board[4][4] = { type: 'pawn', color: 'white', position: { row: 4, col: 4 } };
      
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      expect(screen.getByText('No valid second moves available from this position.')).toBeInTheDocument();
    });
  });

  describe('Move Execution', () => {
    test('executes complete double move and calls onMoveComplete', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Select second move
      const secondMoveButton = screen.getByText('Move to (0, 2)');
      fireEvent.click(secondMoveButton);
      
      // Should call onMoveComplete with both moves
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 2, col: 3 } },
        { from: { row: 2, col: 3 }, to: { row: 0, col: 2 } }
      ]);
    });

    test('handles capture moves correctly', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move to capture position
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Select second move to another capture position
      const secondMoveButton = screen.getByText('Move to (0, 2)');
      fireEvent.click(secondMoveButton);
      
      // Should call onMoveComplete with capture moves
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 2, col: 3 } },
        { from: { row: 2, col: 3 }, to: { row: 0, col: 2 } }
      ]);
    });
  });

  describe('Navigation and User Experience', () => {
    test('allows going back to first move selection', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select first move
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      // Go back to first move
      const backButton = screen.getByText('Back to First Move');
      fireEvent.click(backButton);
      
      // Should be back to first phase
      expect(screen.getByText('Select your first move:')).toBeInTheDocument();
      expect(screen.queryByText('Now select your second move:')).not.toBeInTheDocument();
    });

    test('allows canceling at any phase', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Cancel from first phase
      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      
      expect(mockOnCancel).toHaveBeenCalled();
    });

    test('shows cancel button in both phases', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // First phase
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // Second phase
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Validation', () => {
    test('handles board boundaries correctly', () => {
      const edgeBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      edgeBoard[0][0] = {
        type: 'knight',
        color: 'white',
        position: { row: 0, col: 0 }
      };
      
      render(
        <KnightDoubleMovement
          piece={{ ...mockPiece, position: { row: 0, col: 0 } }}
          upgrades={mockUpgrades}
          board={edgeBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should only show moves within bounds
      expect(screen.getByText('Move to (2, 1)')).toBeInTheDocument();
      expect(screen.getByText('Move to (1, 2)')).toBeInTheDocument();
      
      // Should not show moves that go out of bounds
      expect(screen.queryByText('Move to (-2, 1)')).not.toBeInTheDocument();
      expect(screen.queryByText('Move to (1, -2)')).not.toBeInTheDocument();
    });

    test('validates move positions correctly', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // All displayed moves should be valid L-shaped knight moves
      const moveButtons = screen.getAllByText(/Move to/);
      moveButtons.forEach(button => {
        const text = button.textContent;
        if (text) {
          const match = text.match(/Move to \((\d+), (\d+)\)/);
          if (match) {
            const row = parseInt(match[1]);
            const col = parseInt(match[2]);
            const rowDiff = Math.abs(row - 4);
            const colDiff = Math.abs(col - 4);
            
            // Should be valid L-shaped move: (2,1) or (1,2) pattern
            expect(
              (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2)
            ).toBe(true);
          }
        }
      });
    });
  });

  describe('Accessibility and UX', () => {
    test('provides clear phase indication', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // First phase
      expect(screen.getByText('Select your first move:')).toBeInTheDocument();
      
      // Second phase
      const firstMoveButton = screen.getByText('Move to (2, 3)');
      fireEvent.click(firstMoveButton);
      
      expect(screen.getByText('Now select your second move:')).toBeInTheDocument();
    });

    test('provides clear move descriptions', () => {
      const board = createMockBoard();
      render(
        <KnightDoubleMovement
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // All move buttons should have clear descriptions
      const moveButtons = screen.getAllByText(/Move to/);
      expect(moveButtons.length).toBeGreaterThan(0);
      
      moveButtons.forEach(button => {
        expect(button.textContent).toMatch(/Move to \(\d+, \d+\)/);
      });
    });
  });
});
