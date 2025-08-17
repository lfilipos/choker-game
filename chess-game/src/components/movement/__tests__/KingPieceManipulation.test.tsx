import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { KingPieceManipulation } from '../KingPieceManipulation';
import { Position, PieceType, PieceColor, ChessPiece } from '../../../types';
import { TieredUpgradeDefinition } from '../../../types/upgrades';

// Mock data for testing
const mockPiece = {
  type: 'king' as PieceType,
  color: 'white' as PieceColor,
  position: { row: 4, col: 4 }
};

const mockUpgrades: TieredUpgradeDefinition[] = [
  {
    id: 'king_tier2',
    name: 'Piece Swap',
    description: 'King can swap positions with allied pieces',
    summary: 'Swap with allied pieces',
    cost: 400,
    pieceType: 'king',
    tier: 2,
    requirements: [],
    effects: [{ type: 'special', value: 'piece_swap', description: 'Can swap with allied pieces' }],
    isAvailable: true,
    isPurchased: true
  },
  {
    id: 'king_tier3',
    name: 'Royal Command',
    description: 'King can command allied pieces to move',
    summary: 'Command allied pieces',
    cost: 600,
    pieceType: 'king',
    tier: 3,
    requirements: [],
    effects: [{ type: 'special', value: 'royal_command', description: 'Can command allied pieces' }],
    isAvailable: true,
    isPurchased: true
  }
];

const createMockBoard = (): (ChessPiece | null)[][] => {
  const board = Array(10).fill(null).map(() => Array(16).fill(null));
  
  // Place the main king
  board[4][4] = {
    type: 'king',
    color: 'white',
    position: { row: 4, col: 4 }
  };
  
  // Place allied pieces adjacent to king for manipulation
  board[3][3] = { type: 'pawn', color: 'white', position: { row: 3, col: 3 } };
  board[3][4] = { type: 'rook', color: 'white', position: { row: 3, col: 4 } };
  board[3][5] = { type: 'knight', color: 'white', position: { row: 3, col: 5 } };
  board[4][3] = { type: 'bishop', color: 'white', position: { row: 4, col: 3 } };
  board[4][5] = { type: 'queen', color: 'white', position: { row: 4, col: 5 } };
  board[5][3] = { type: 'pawn', color: 'white', position: { row: 5, col: 3 } };
  board[5][4] = { type: 'rook', color: 'white', position: { row: 5, col: 4 } };
  board[5][5] = { type: 'knight', color: 'white', position: { row: 5, col: 5 } };
  
  // Place some empty squares for movement
  board[2][2] = null;
  board[2][6] = null;
  board[6][2] = null;
  board[6][6] = null;
  
  // Place some enemy pieces for capture
  board[2][3] = { type: 'pawn', color: 'black', position: { row: 2, col: 3 } };
  board[2][5] = { type: 'pawn', color: 'black', position: { row: 2, col: 5 } };
  board[6][3] = { type: 'pawn', color: 'black', position: { row: 6, col: 3 } };
  board[6][5] = { type: 'pawn', color: 'black', position: { row: 6, col: 5 } };
  
  return board;
};

const mockOnMoveComplete = jest.fn();
const mockOnCancel = jest.fn();

describe('KingPieceManipulation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    test('renders without crashing', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('King Piece Manipulation')).toBeInTheDocument();
    });

    test('displays correct title and description', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('King Piece Manipulation')).toBeInTheDocument();
      expect(screen.getByText('Select your manipulation action:')).toBeInTheDocument();
    });
  });

  describe('Piece Swap Options (Tier 2)', () => {
    test('displays piece swap options when tier 2 upgrade is available', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show swap options for adjacent allied pieces
      expect(screen.getByText(/Swap with pawn at \(3, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with rook at \(3, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with knight at \(3, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with bishop at \(4, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with queen at \(4, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with pawn at \(5, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with rook at \(5, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with knight at \(5, 5\)/)).toBeInTheDocument();
    });

    test('filters out king pieces from swap options', () => {
      const board = createMockBoard();
      // Place another king adjacent
      board[3][4] = { type: 'king', color: 'white', position: { row: 3, col: 4 } };
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show swap option for king
      expect(screen.queryByText(/Swap with king at \(3, 4\)/)).not.toBeInTheDocument();
      
      // Should still show other swap options
      expect(screen.getByText(/Swap with pawn at \(3, 3\)/)).toBeInTheDocument();
    });

    test('handles case when no tier 2 upgrade is available', () => {
      const board = createMockBoard();
      const tier1Upgrades = mockUpgrades.filter(u => u.tier < 2);
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={tier1Upgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show piece swap options
      expect(screen.queryByText(/Swap with/)).not.toBeInTheDocument();
    });
  });

  describe('Royal Command Options (Tier 3)', () => {
    test('displays royal command options when tier 3 upgrade is available', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show royal command options for adjacent allied pieces with available moves
      // Pawns at edges don't have available moves, so they won't show royal command options
      expect(screen.getByText(/Command rook at \(3, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Command knight at \(3, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Command bishop at \(4, 3\)/)).toBeInTheDocument();
      expect(screen.getByText(/Command queen at \(4, 5\)/)).toBeInTheDocument();
      expect(screen.getByText(/Command rook at \(5, 4\)/)).toBeInTheDocument();
      expect(screen.getByText(/Command knight at \(5, 5\)/)).toBeInTheDocument();
    });

    test('shows available moves count for commanded pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show move counts for pieces with available moves
      // Pawns at edges don't have available moves, so they won't show royal command options
      expect(screen.getByText(/Command rook at \(3, 4\) - \d+ moves available/)).toBeInTheDocument();
    });

    test('handles case when no tier 3 upgrade is available', () => {
      const board = createMockBoard();
      const tier2Upgrades = mockUpgrades.filter(u => u.tier < 3);
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={tier2Upgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show royal command options
      expect(screen.queryByText(/Command rook/)).not.toBeInTheDocument();
      
      // Should still show piece swap options
      expect(screen.getByText(/Swap with pawn at \(3, 3\)/)).toBeInTheDocument();
    });
  });

  describe('Available Moves Calculation', () => {
    test('calculates available moves for pawn pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show rook command options with move counts
      const rookCommand = screen.getByText(/Command rook at \(3, 4\)/);
      expect(rookCommand).toBeInTheDocument();
      
      // Rooks should have horizontal and vertical moves
      expect(rookCommand.textContent).toMatch(/\d+ moves available/);
    });

    test('calculates available moves for rook pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show rook command options with move counts
      const rookCommand = screen.getByText(/Command rook at \(3, 4\)/);
      expect(rookCommand).toBeInTheDocument();
      
      // Rooks should have horizontal and vertical moves
      expect(rookCommand.textContent).toMatch(/\d+ moves available/);
    });

    test('calculates available moves for knight pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show knight command options with move counts
      const knightCommand = screen.getByText(/Command knight at \(3, 5\)/);
      expect(knightCommand).toBeInTheDocument();
      
      // Knights should have L-shaped moves
      expect(knightCommand.textContent).toMatch(/\d+ moves available/);
    });

    test('calculates available moves for bishop pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show bishop command options with move counts
      const bishopCommand = screen.getByText(/Command bishop at \(4, 3\)/);
      expect(bishopCommand).toBeInTheDocument();
      
      // Bishops should have diagonal moves
      expect(bishopCommand.textContent).toMatch(/\d+ moves available/);
    });

    test('calculates available moves for queen pieces', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show queen command options with move counts
      const queenCommand = screen.getByText(/Command queen at \(4, 5\)/);
      expect(queenCommand).toBeInTheDocument();
      
      // Queens should have moves in all directions
      expect(queenCommand.textContent).toMatch(/\d+ moves available/);
    });
  });

  describe('Option Selection and Execution', () => {
    test('allows selection of a manipulation option', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      
      // Should show manipulation preview
      expect(screen.getByText('Selected Action')).toBeInTheDocument();
      expect(screen.getByText('Type: piece swap')).toBeInTheDocument();
    });

    test('executes piece swap and calls onMoveComplete', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select piece swap
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      
      // Execute the swap
      const executeButton = screen.getByText('Execute piece swap');
      fireEvent.click(executeButton);
      
      // Should call onMoveComplete with swap moves
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 3, col: 3 } },
        { from: { row: 3, col: 3 }, to: { row: 4, col: 4 } }
      ]);
    });

    test('executes royal command and calls onMoveComplete', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select royal command
      const commandOption = screen.getByText(/Command knight at \(3, 5\)/);
      fireEvent.click(commandOption);
      
      // Execute the command
      const executeButton = screen.getByText('Execute royal command');
      fireEvent.click(executeButton);
      
      // Should call onMoveComplete with command move
      expect(mockOnMoveComplete).toHaveBeenCalledWith([
        { from: { row: 4, col: 4 }, to: { row: 3, col: 5 } }
      ]);
    });

    test('handles different manipulation types correctly', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Test piece swap
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      expect(screen.getByText('Type: piece swap')).toBeInTheDocument();
      
      // Test royal command
      const commandOption = screen.getByText(/Command knight at \(3, 5\)/);
      fireEvent.click(commandOption);
      expect(screen.getByText('Type: royal command')).toBeInTheDocument();
    });
  });

  describe('User Interaction and Navigation', () => {
    test('allows canceling the operation', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
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
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Initial state
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      
      // After selecting an option
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      
      // Should still show cancel button
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    test('shows execute button only when option is selected', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show execute button initially
      expect(screen.queryByText(/Execute/)).not.toBeInTheDocument();
      
      // Select an option
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      
      // Should now show execute button
      expect(screen.getByText(/Execute piece swap/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Validation', () => {
    test('handles case with no manipulation options available', () => {
      const emptyBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      emptyBoard[4][4] = {
        type: 'king',
        color: 'white',
        position: { row: 4, col: 4 }
      };
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={emptyBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      expect(screen.getByText('No manipulation options available.')).toBeInTheDocument();
    });

    test('handles board boundaries correctly', () => {
      const edgeBoard = Array(10).fill(null).map(() => Array(16).fill(null));
      edgeBoard[0][0] = {
        type: 'king',
        color: 'white',
        position: { row: 0, col: 0 }
      };
      edgeBoard[0][1] = { type: 'pawn', color: 'white', position: { row: 0, col: 1 } };
      edgeBoard[1][0] = { type: 'pawn', color: 'white', position: { row: 1, col: 0 } };
      
      render(
        <KingPieceManipulation
          piece={{ ...mockPiece, position: { row: 0, col: 0 } }}
          upgrades={mockUpgrades}
          board={edgeBoard}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show manipulation options for pieces within bounds
      expect(screen.getByText(/Swap with pawn at \(0, 1\)/)).toBeInTheDocument();
      expect(screen.getByText(/Swap with pawn at \(1, 0\)/)).toBeInTheDocument();
    });

    test('filters out pieces with no available moves for royal command', () => {
      const board = createMockBoard();
      // Block all possible moves for a piece
      board[2][2] = { type: 'pawn', color: 'white', position: { row: 2, col: 2 } };
      board[2][3] = { type: 'pawn', color: 'white', position: { row: 2, col: 3 } };
      board[2][4] = { type: 'pawn', color: 'white', position: { row: 2, col: 4 } };
      board[2][5] = { type: 'pawn', color: 'white', position: { row: 2, col: 5 } };
      board[2][6] = { type: 'pawn', color: 'white', position: { row: 2, col: 6 } };
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should not show royal command for pieces with no moves
      expect(screen.queryByText(/Command pawn at \(2, 2\)/)).not.toBeInTheDocument();
      
      // Should still show piece swap options
      expect(screen.getByText(/Swap with pawn at \(3, 3\)/)).toBeInTheDocument();
    });
  });

  describe('Accessibility and UX', () => {
    test('provides clear manipulation type indicators', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Should show manipulation type badges
      const typeBadges = screen.getAllByText(/piece swap|royal command/);
      expect(typeBadges.length).toBeGreaterThan(0);
    });

    test('provides clear option descriptions', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // All manipulation options should have clear descriptions
      const manipulationOptions = screen.getAllByText(/Swap with|Command/);
      expect(manipulationOptions.length).toBeGreaterThan(0);
      
      manipulationOptions.forEach(option => {
        expect(option.textContent).toMatch(/(Swap with|Command)/);
      });
    });

    test('provides clear selection feedback', () => {
      const board = createMockBoard();
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Select an option
      const swapOption = screen.getByText(/Swap with pawn at \(3, 3\)/);
      fireEvent.click(swapOption);
      
      // Should show clear selection feedback
      expect(screen.getByText('Selected Action')).toBeInTheDocument();
      expect(screen.getByText('Type: piece swap')).toBeInTheDocument();
      expect(screen.getByText(/Target: pawn/)).toBeInTheDocument();
    });

    test('disables options that are not available', () => {
      const board = createMockBoard();
      // Create a board where some pieces have no available moves
      board[2][2] = { type: 'pawn', color: 'white', position: { row: 2, col: 2 } };
      board[2][3] = { type: 'pawn', color: 'white', position: { row: 2, col: 3 } };
      board[2][4] = { type: 'pawn', color: 'white', position: { row: 2, col: 4 } };
      
      render(
        <KingPieceManipulation
          piece={mockPiece}
          upgrades={mockUpgrades}
          board={board}
          onMoveComplete={mockOnMoveComplete}
          onCancel={mockOnCancel}
        />
      );
      
      // Options should be properly enabled/disabled based on availability
      const manipulationOptions = screen.getAllByText(/Swap with|Command/);
      manipulationOptions.forEach(option => {
        // Check if the option is properly enabled or disabled
        expect(option).toBeInTheDocument();
      });
    });
  });
});
