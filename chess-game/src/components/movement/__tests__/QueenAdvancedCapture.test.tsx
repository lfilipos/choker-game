import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueenAdvancedCapture } from '../QueenAdvancedCapture';
import { Position, PieceType, PieceColor, ChessPiece } from '../../../types';
import { TieredUpgradeDefinition } from '../../../types/upgrades';

// Mock data for testing
const mockPiece = {
  type: 'queen' as PieceType,
  color: 'white' as PieceColor,
  position: { row: 4, col: 4 }
};

const mockUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'queen_tier2',
    name: 'Advanced Capture',
    description: 'Queen can capture through pawns',
    summary: 'Capture through pawns',
    cost: 400,
    pieceType: 'queen',
    tier: 2,
    requirements: [],
    effects: [{ type: 'special', value: 'advanced_capture', description: 'Can capture through pawns' }],
    isAvailable: true,
    isPurchased: true
  },
  {
    id: 'queen_tier3',
    name: 'Royal Teleport',
    description: 'Queen can teleport to any empty square',
    summary: 'Teleport to any square',
    cost: 600,
    pieceType: 'queen',
    tier: 3,
    requirements: [],
    effects: [{ type: 'special', value: 'royal_teleport', description: 'Can teleport anywhere' }],
    isAvailable: true,
    isPurchased: true
  }
];

const createMockBoard = (): (ChessPiece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place the main queen
  board[4][4] = {
    type: 'queen',
    color: 'white',
    position: { row: 4, col: 4 }
  };
  
  // Place pawns for jumping over
  board[3][3] = { type: 'pawn', color: 'black', position: { row: 3, col: 3 } };
  board[3][5] = { type: 'pawn', color: 'black', position: { row: 3, col: 5 } };
  board[5][3] = { type: 'pawn', color: 'black', position: { row: 5, col: 3 } };
  board[5][5] = { type: 'pawn', color: 'black', position: { row: 5, col: 5 } };
  
  // Place enemy pieces for capture
  board[2][2] = { type: 'rook', color: 'black', position: { row: 2, col: 2 } };
  board[2][6] = { type: 'bishop', color: 'black', position: { row: 2, col: 6 } };
  board[6][2] = { type: 'knight', color: 'black', position: { row: 6, col: 2 } };
  board[6][6] = { type: 'pawn', color: 'black', position: { row: 6, col: 6 } };
  
  // Place some empty squares
  board[1][1] = null;
  board[1][7] = null;
  board[7][1] = null;
  board[7][7] = null;
  
  return board;
};

const mockOnMoveComplete = jest.fn();
const mockOnCancel = jest.fn();

describe('QueenAdvancedCapture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Queen Advanced Capture')).toBeInTheDocument();
    });

    test('displays correct title and description', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('Queen Advanced Capture')).toBeInTheDocument();
      expect(screen.getByText('Select your capture move:')).toBeInTheDocument();
    });
  });

  describe('Standard Queen Moves', () => {
    test('displays standard queen movement options', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show standard queen moves in all directions
      expect(screen.getByText(/Capture pawn at \(3, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(3, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(5, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(5, 5\)/)).toBeInTheDocument();
    });

    test('shows capture options for enemy pieces', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show capture options
      expect(screen.getByText(/Capture pawn at \(3, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(3, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(5, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Capture pawn at \(5, 5\)/)).toBeInTheDocument();
    });

    test('filters out moves to allied pieces', () => {
      const alliedBoard = createMockBoard();
      // Place an allied piece at one of the move positions
      alliedBoard[3][3] = { type: 'pawn', color: 'white', position: { row: 3, col: 3 } };
      
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={alliedBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show move to allied piece
      expect(screen.queryByText(/Move to \(3, 3\)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Capture pawn at \(3, 3\)/)).not.toBeInTheDocument();
      
      // Should still show other valid moves
      expect(screen.getByText(/Move to \(3, 4\)/)).toBeInTheDocument();
    });
  });

  describe('Advanced Capture Through Pawns (Tier 2)', () => {
    test('displays pawn jumping options when tier 2 upgrade is available', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show pawn jumping options
      expect(screen.getByText(/Jump over pawn and capture rook at \(2, 2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture bishop at \(2, 6\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture knight at \(6, 2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture pawn at \(6, 6\)/)).toBeInTheDocument();
    });

    test('shows capture options after jumping over pawns', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show capture options after jumping over pawns
      expect(screen.getByText(/Jump over pawn and capture rook at \(2, 2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture bishop at \(2, 6\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture knight at \(6, 2\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture pawn at \(6, 6\)/)).toBeInTheDocument();
    });

    test('handles case when no tier 2 upgrade is available', () => {
      const board = createMockBoard();
      const tier1Upgrades = mockUpgrades.filter(u => u.tier < 2);
      
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={tier1Upgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show pawn jumping options
      expect(screen.queryByText(/Jump over pawn/)).not.toBeInTheDocument();
      
      // Should still show standard moves
      expect(screen.getByText(/Move to \(3, 4\)/)).toBeInTheDocument();
    });
  });

  describe('Royal Teleport (Tier 3)', () => {
    test('displays teleport options when tier 3 upgrade is available', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show royal teleport options to empty squares
      expect(screen.getByText(/Royal Teleport to \(1, 1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Royal Teleport to \(1, 7\)/)).toBeInTheDocument();
      expect(screen.getByText(/Royal Teleport to \(7, 1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Royal Teleport to \(7, 7\)/)).toBeInTheDocument();
    });

    test('only shows teleport to empty squares', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show teleport to occupied squares
      expect(screen.queryByText(/Royal Teleport to \(3, 3\)/)).not.toBeInTheDocument();
      expect(screen.queryByText(/Royal Teleport to \(4, 4\)/)).not.toBeInTheDocument();
      
      // Should only show teleport to empty squares
      expect(screen.getByText(/Royal Teleport to \(1, 1\)/)).toBeInTheDocument();
    });

    test('handles case when no tier 3 upgrade is available', () => {
      const board = createMockBoard();
      const tier2Upgrades = mockUpgrades.filter(u => u.tier < 3);
      
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={tier2Upgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show royal teleport options
      expect(screen.queryByText(/Royal Teleport/)).not.toBeInTheDocument();
      
      // Should still show other moves
      expect(screen.getByText(/Move to \(3, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Jump over pawn and capture rook/)).toBeInTheDocument();
    });
  });

  describe('Move Selection and Execution', () => {
    test('allows selection of a move option', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const moveOption = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(moveOption);
      
      // Should show move preview
      expect(screen.getByText('Selected Move')).toBeInTheDocument();
      expect(screen.getByText('Type: standard')).toBeInTheDocument();
    });

    test('executes selected move and calls onMoveComplete', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select a move
      const moveOption = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(moveOption);
      
      // Execute the move
      const executeButton = screen.getByText('Execute Capture');
      fireEvent.click(executeButton);
      
      // Should call onMoveComplete with the move
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } }
      ]);
    });

    test('handles different move types correctly', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Test standard move
      const standardMove = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(standardMove);
      expect(screen.getByText('Type: standard')).toBeInTheDocument();
      
      // Test pawn jumping move
      const pawnJumpMove = screen.getByText(/Jump over pawn and capture rook at \(2, 2\)/);
      fireEvent.click(pawnJumpMove);
      expect(screen.getByText('Type: through pawn')).toBeInTheDocument();
      
      // Test royal teleport move
      const teleportMove = screen.getByText(/Royal Teleport to \(1, 1\)/);
      fireEvent.click(teleportMove);
      expect(screen.getByText('Type: royal teleport')).toBeInTheDocument();
    });
  });

  describe('User Interaction and Navigation', () => {
    test('allows canceling the operation', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
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
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Initial state
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // After selecting a move
      const moveOption = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(moveOption);
      
      // Should still show cancel button
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows execute button only when move is selected', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show execute button initially
      expect(screen.queryByText('Execute Capture')).not.toBeInTheDocument();
      
      // Select a move
      const moveOption = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(moveOption);
      
      // Should now show execute button
      expect(screen.getByText('Execute Capture')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles case with no valid moves available', () => {
      const blockedBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      blockedBoard[4][4] = {
        type: 'queen',
        color: 'white',
        position: { row: 4, col: 4 }
      };
      // Block all possible moves with allied pieces in a larger area
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 16; col++) {
          if (row !== 4 || col !== 4) {
            blockedBoard[row][col] = { type: 'pawn', color: 'white', position: { row, col } };
          }
        }
      }
      
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={blockedBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('No valid capture moves available.')).toBeInTheDocument();
    });

    test('handles board boundaries correctly', () => {
      const edgeBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      edgeBoard[0][0] = {
        type: 'queen',
        color: 'white',
        position: { row: 0, col: 0 }
      };
      
      render(
        <QueenAdvancedCapture
          piece={{ ...mockPiece, position: { row: 0, col: 0 } }}
          upgrades={mockUpgrades}
          board={edgeBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should only show moves within bounds
      expect(screen.getByText(/Move to \(1, 1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Move to \(1, 0\)/)).toBeInTheDocument();
      expect(screen.getByText(/Move to \(0, 1\)/)).toBeInTheDocument();
      
      // Should not show moves that go out of bounds
      expect(screen.queryByText(/Move to \(-1, -1\)/)).not.toBeInTheDocument();
    });

    test('validates move paths correctly', () => {
      const board = createMockBoard();
      // Place a piece blocking the path
      board[3][3] = { type: 'pawn', color: 'black', position: { row: 3, col: 3 } };
      board[2][2] = { type: 'pawn', color: 'black', position: { row: 2, col: 2 } };
      
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show moves that go through blocking pieces
      expect(screen.queryByText(/Move to \(2, 2\)/)).not.toBeInTheDocument();
      
      // Should still show moves to the blocking piece itself
      expect(screen.getByText(/Capture pawn at \(3, 3\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    test('provides clear move type indicators', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show move type badges
      const typeBadges = screen.getAllByText(/standard|through pawn|royal teleport/);
      expect(typeBadges.length).toBeGreaterThan(0);
    });

    test('provides clear move descriptions', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // All move options should have clear descriptions
      const moveOptions = screen.getAllByText(/Move to|Jump over|Royal Teleport/);
      expect(moveOptions.length).toBeGreaterThan(0);
      
      moveOptions.forEach(option => {
        expect(option.textContent).toMatch(/(Move to|Jump over|Royal Teleport)/);
      });
    });

    test('provides clear selection feedback', () => {
      const board = createMockBoard();
      render(
        <QueenAdvancedCapture
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select a move
      const moveOption = screen.getByText(/Capture pawn at \(3, 3\)/);
      fireEvent.click(moveOption);
      
      // Should show clear selection feedback
      expect(screen.getByText('Selected Move')).toBeInTheDocument();
      expect(screen.getByText('Type: standard')).toBeInTheDocument();
    });
  });
});
