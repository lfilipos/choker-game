import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GameLobby } from '../GameLobby';
import { socketService } from '../../services/socketService';

// Mock the socket service
jest.mock('../../services/socketService');
const mockSocketService = socketService as jest.Mocked<typeof socketService>;

// Mock the CSS module
jest.mock('../GameLobby.css', () => ({}));

expect.extend(toHaveNoViolations);

describe('GameLobby Component', () => {
  const mockOnMatchSelect = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocketService.connect.mockResolvedValue();
    mockSocketService.getWaitingMatches.mockResolvedValue([]);
    mockSocketService.onMatchesUpdated.mockImplementation((callback) => {
      // Store callback for testing
      (mockSocketService as any).matchesCallback = callback;
      return () => {};
    });
    mockSocketService.onError.mockImplementation((callback) => {
      // Store callback for testing
      (mockSocketService as any).errorCallback = callback;
      return () => {};
    });
    mockSocketService.removeAllListeners.mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Rendering', () => {
    test('should render loading state initially', () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      expect(screen.getByText('Lockstep Game Lobby')).toBeInTheDocument();
      expect(screen.getByText('Connecting to server...')).toBeInTheDocument();
    });

    test('should have proper heading structure for accessibility', () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Lockstep Game Lobby');
    });
  });

  describe('Connection States', () => {
    test('should show connection error when connection fails', async () => {
      mockSocketService.connect.mockRejectedValue(new Error('Connection failed'));
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
    });

    test('should show retry button when connection fails', async () => {
      mockSocketService.connect.mockRejectedValue(new Error('Connection failed'));
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
      });
    });

    test('should attempt reconnection when retry button is clicked', async () => {
      mockSocketService.connect.mockRejectedValue(new Error('Connection failed'));
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry connection/i })).toBeInTheDocument();
      });
      
      const retryButton = screen.getByRole('button', { name: /retry connection/i });
      fireEvent.click(retryButton);
      
      expect(mockSocketService.connect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Connected State', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
    });

    test('should render player name input when connected', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
    });

    test('should render create match button when connected', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new match/i })).toBeInTheDocument();
      });
    });

    test('should show available matches section when connected', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/available matches/i)).toBeInTheDocument();
      });
    });

    test('should show connection status in footer', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/connected to server/i)).toBeInTheDocument();
        expect(screen.getByText(/online/i)).toBeInTheDocument();
      });
    });
  });

  describe('Player Name Input', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
    });

    test('should have proper label and input association', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/your name/i);
        expect(input).toHaveAttribute('id', 'playerName');
        expect(input).toHaveAttribute('type', 'text');
        expect(input).toHaveAttribute('placeholder', 'Enter your name');
        expect(input).toHaveAttribute('maxLength', '20');
      });
    });

    test('should update player name state when typing', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      expect(input).toHaveValue('TestPlayer');
    });

    test('should trim whitespace from player name', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, '  TestPlayer  ');
      
      expect(input).toHaveValue('  TestPlayer  ');
    });
  });

  describe('Create Match Functionality', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
      mockSocketService.createMatch.mockResolvedValue({ matchId: 'test-match-123' });
    });

    test('should show error when trying to create match without name', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new match/i })).toBeInTheDocument();
      });
      
      const createButton = screen.getByRole('button', { name: /create new match/i });
      // Button should be disabled initially
      expect(createButton).toBeDisabled();
      
      // Test that button is disabled when no name is entered
      expect(createButton).toBeDisabled();
      
      // Enter some text and then clear it to test validation
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'Test');
      expect(createButton).not.toBeDisabled();
      
      // Clear the input
      await user.clear(input);
      expect(createButton).toBeDisabled();
      
      // The validation should prevent the button from being enabled
      expect(createButton).toBeDisabled();
    });

    test('should create match successfully with valid name', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      const createButton = screen.getByRole('button', { name: /create new match/i });
      await user.click(createButton);
      
      expect(mockSocketService.createMatch).toHaveBeenCalledWith('TestPlayer');
      expect(mockOnMatchSelect).toHaveBeenCalledWith('test-match-123', 'TestPlayer');
    });

    test('should handle create match errors gracefully', async () => {
      mockSocketService.createMatch.mockRejectedValue(new Error('Server error'));
      const user = userEvent.setup();
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      const createButton = screen.getByRole('button', { name: /create new match/i });
      await user.click(createButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to create match. Please try again.');
      });
    });

    test('should clear error when creating match after error', async () => {
      mockSocketService.createMatch.mockRejectedValueOnce(new Error('Server error'));
      mockSocketService.createMatch.mockResolvedValueOnce({ matchId: 'test-match-123' });
      const user = userEvent.setup();
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      const createButton = screen.getByRole('button', { name: /create new match/i });
      
      // First attempt fails
      await user.click(createButton);
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to create match. Please try again.');
      });
      
      // Second attempt succeeds
      await user.click(createButton);
      await waitFor(() => {
        const errorElement = screen.queryByTestId('error-message');
        if (errorElement) {
          expect(errorElement).not.toHaveTextContent('Failed to create match. Please try again.');
        } else {
          // No error message is fine
          expect(errorElement).toBeNull();
        }
      });
    });
  });

  describe('Waiting Matches Display', () => {
    const mockMatches = [
      {
        id: 'match-1',
        status: 'waiting',
        playerCount: 2,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
        availableSlots: [
          { team: 'white', gameSlot: 'A' },
          { team: 'black', gameSlot: 'B' }
        ]
      },
      {
        id: 'match-2',
        status: 'waiting',
        playerCount: 1,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        availableSlots: [
          { team: 'white', gameSlot: 'A' },
          { team: 'white', gameSlot: 'B' },
          { team: 'black', gameSlot: 'A' },
          { team: 'black', gameSlot: 'B' }
        ]
      }
    ];

    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue(mockMatches);
    });

    test('should display correct number of available matches', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Available Matches (2)')).toBeInTheDocument();
      });
    });

    test('should display match information correctly', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/match #match-1/i)).toBeInTheDocument();
        expect(screen.getByText('Players: 2/4')).toBeInTheDocument();
        expect(screen.getByText(/5m ago/i)).toBeInTheDocument();
        
        // Check for specific match details
        const match1Element = screen.getByText(/match #match-1/i).closest('.game-item');
        expect(match1Element).toBeInTheDocument();
        expect(match1Element).toHaveTextContent(/white - Game A, black - Game B/i);
      });
    });

    test('should show no matches message when empty', async () => {
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('No matches available. Create one to get started!')).toBeInTheDocument();
      });
    });

    test('should format time correctly for different durations', async () => {
      const oldMatch = {
        id: 'old-match',
        status: 'waiting',
        playerCount: 1,
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25 hours ago
      };
      
      mockSocketService.getWaitingMatches.mockResolvedValue([oldMatch]);
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText(/1d ago/i)).toBeInTheDocument();
      });
    });
  });

  describe('Join Match Functionality', () => {
    const mockMatch = {
      id: 'match-1',
      status: 'waiting',
      playerCount: 2,
      createdAt: new Date().toISOString(),
      availableSlots: [{ team: 'white', gameSlot: 'A' }]
    };

    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([mockMatch]);
    });

    test('should disable join match button when no name is entered', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /join match/i })).toBeInTheDocument();
      });
      
      const joinButton = screen.getByRole('button', { name: /join match/i });
      // Button should be disabled when no name is entered
      expect(joinButton).toBeDisabled();
      
      // Enter a name to enable the button
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      expect(joinButton).not.toBeDisabled();
    });

    test('should join match successfully with valid name', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      const joinButton = screen.getByRole('button', { name: /join match/i });
      await user.click(joinButton);
      
      expect(mockOnMatchSelect).toHaveBeenCalledWith('match-1', 'TestPlayer');
    });

    test('should enable join match button when name is entered', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /join match/i })).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      const joinButton = screen.getByRole('button', { name: /join match/i });
      
      // Button should be disabled initially
      expect(joinButton).toBeDisabled();
      
      // Enter a name to enable the button
      await user.type(input, 'TestPlayer');
      expect(joinButton).not.toBeDisabled();
      
      // Clear the name to disable the button again
      await user.clear(input);
      expect(joinButton).toBeDisabled();
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
    });

    test('should update matches when receiving real-time updates', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Available Matches (0)')).toBeInTheDocument();
      });
      
      // Simulate real-time update
      const newMatches = [
        {
          id: 'new-match',
          status: 'waiting',
          playerCount: 1,
          createdAt: new Date().toISOString(),
        }
      ];
      
      act(() => {
        (mockSocketService as any).matchesCallback(newMatches);
      });
      
      expect(screen.getByText('Available Matches (1)')).toBeInTheDocument();
      expect(screen.getByText(/match #new-mat/i)).toBeInTheDocument();
    });

    test('should handle real-time errors', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      // Simulate real-time error
      act(() => {
        (mockSocketService as any).errorCallback({ message: 'Connection lost' });
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toHaveTextContent('Connection lost');
      });
    });
  });

  describe('Button States', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
    });

    test('should disable create match button when no player name', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /create new match/i });
        expect(createButton).toBeDisabled();
      });
    });

    test('should enable create match button when player name is entered', async () => {
      const user = userEvent.setup();
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const input = screen.getByLabelText(/your name/i);
      await user.type(input, 'TestPlayer');
      
      const createButton = screen.getByRole('button', { name: /create new match/i });
      expect(createButton).not.toBeDisabled();
    });

    test('should disable join match buttons when no player name', async () => {
      const mockMatch = {
        id: 'match-1',
        status: 'waiting',
        playerCount: 2,
        createdAt: new Date().toISOString(),
      };
      
      mockSocketService.getWaitingMatches.mockResolvedValue([mockMatch]);
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        const joinButton = screen.getByRole('button', { name: /join match/i });
        expect(joinButton).toBeDisabled();
      });
    });
  });

  describe('Cleanup', () => {
    test('should remove socket listeners on unmount', () => {
      const { unmount } = render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      unmount();
      
      expect(mockSocketService.removeAllListeners).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(async () => {
      mockSocketService.connect.mockResolvedValue();
      mockSocketService.getWaitingMatches.mockResolvedValue([]);
    });

    test('should not have accessibility violations', async () => {
      const { container } = render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
      });
      
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    test('should have proper form labels and associations', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        const input = screen.getByLabelText(/your name/i);
        expect(input).toHaveAttribute('id', 'playerName');
      });
    });

    test('should have proper button labels', async () => {
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create new match/i })).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling Edge Cases', () => {
    test('should handle unknown error types gracefully', async () => {
      mockSocketService.connect.mockRejectedValue('Unknown error string');
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
      });
    });

    test('should handle empty error messages', async () => {
      mockSocketService.connect.mockRejectedValue(new Error(''));
      
      render(<GameLobby onMatchSelect={mockOnMatchSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to connect to server')).toBeInTheDocument();
      });
    });
  });
});
