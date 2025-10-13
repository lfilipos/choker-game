import React, { useState, useCallback, useEffect } from 'react';
import { Position, PieceColor, BarracksPiece, PurchasablePiece, PieceType } from '../types';
import { ChessBoard } from './ChessBoard';
import { socketService, MultiplayerGameState, MatchState } from '../services/socketService';
import { UpgradeDefinition } from '../types/upgrades';
import AdminPanel from './AdminPanel';
import GameOverlay from './GameOverlay';
import DualBarracks from './DualBarracks';
import SidebarTreasury from './SidebarTreasury';
import { EnhancedControlZones } from './EnhancedControlZones';
import './ChessGame.css';

interface MultiplayerChessGameProps {
  gameId: string;
  playerName: string;
  initialGameState?: MultiplayerGameState | null;
  onLeaveGame: () => void;
}

export const MultiplayerChessGame: React.FC<MultiplayerChessGameProps> = ({
  gameId, // This is actually the matchId now
  playerName,
  initialGameState,
  onLeaveGame
}) => {
  const [gameState, setGameState] = useState<MultiplayerGameState | null>(initialGameState || null);
  const [selectedSquare, setSelectedSquare] = useState<Position | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Position[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [availableUpgrades, setAvailableUpgrades] = useState<UpgradeDefinition[]>([]);
  const [purchasablePieces, setPurchasablePieces] = useState<PurchasablePiece[]>([]);
  const [availableModifiers, setAvailableModifiers] = useState<any[]>([]);
  const [blindLevel, setBlindLevel] = useState<number>(1);
  const [blindAmounts, setBlindAmounts] = useState<{smallBlind: number, bigBlind: number}>({smallBlind: 5, bigBlind: 10});

  const getPieceSymbol = (piece: any): string => {
    const symbols: Record<string, Record<string, string>> = {
      white: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' },
      black: { king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟' }
    };
    return symbols[piece.color]?.[piece.type] || '?';
  };
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [barracks, setBarracks] = useState<{ white: BarracksPiece[], black: BarracksPiece[] }>({ white: [], black: [] });
  const [selectedBarracksPiece, setSelectedBarracksPiece] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState(false);
  const [gameWinner, setGameWinner] = useState<'white' | 'black' | null>(null);
  const [winReason, setWinReason] = useState<string | undefined>(undefined);
  const [controlZonePokerEffects, setControlZonePokerEffects] = useState<Record<string, any>>({});
  const [linkingMode, setLinkingMode] = useState(false);
  const [selectedRook, setSelectedRook] = useState<Position | null>(null);
  const [rookLinks, setRookLinks] = useState<any[]>([]);
  const [lastRookLink, setLastRookLink] = useState<any>(null);

  // Convert match state to game state format
  const convertMatchStateToGameState = useCallback((matchState: MatchState): MultiplayerGameState | null => {
    if (!matchState || !matchState.currentGame) return null;
    
    const { currentGame, playerTeam, teams } = matchState;
    
    // Always update rookLinks when match state changes (even if empty array)
    setRookLinks(currentGame.rookLinks || []);
    setLastRookLink(currentGame.lastRookLink || null);
    
    return {
      id: matchState.id,
      status: matchState.status,
      board: currentGame.board || [],
      currentPlayer: currentGame.currentPlayer as PieceColor,
      gameStatus: 'playing',
      moveHistory: currentGame.moveHistory || [],
      controlZones: currentGame.controlZones || [],
      controlZoneStatuses: currentGame.controlZoneStatuses || [],
      upgrades: {
        white: teams.white.upgrades,
        black: teams.black.upgrades
      },
      economy: {
        white: teams.white.economy,
        black: teams.black.economy
      },
      players: {},
      playerColor: playerTeam as PieceColor,
      isPlayerTurn: currentGame.isPlayerTurn,
      rookLinks: currentGame.rookLinks || []
    };
  }, []);

  useEffect(() => {
    console.log('MultiplayerChessGame: Setting up socket listeners for match:', gameId);
    
    const socket = socketService.getSocket();
    if (!socket) {
      console.error('No socket connection available');
      setError('Connection error');
      return;
    }

    // Get initial match state
    console.log('Requesting match state...');
    socket.emit('get_match_state', { matchId: gameId });

    // Listen for match state
    socket.on('match_state', (state: MatchState) => {
      console.log('Received match_state:', state);
      setMatchState(state);
      const gameState = convertMatchStateToGameState(state);
      if (gameState) {
        console.log('Converted to game state:', gameState);
        setGameState(gameState);
        setError(null);
      }
      // Update blind level and amounts if present
      if ((state as any).blindLevel) {
        setBlindLevel((state as any).blindLevel);
      }
      if ((state as any).blindAmounts) {
        setBlindAmounts((state as any).blindAmounts);
      }
      
      // Request modifiers after we have match state
      console.log('Requesting modifiers after match state received');
      socket.emit('get_modifiers');
      // Update barracks from match state
      if (state.teams) {
        setBarracks({
          white: state.teams.white.barracks || [],
          black: state.teams.black.barracks || []
        });
      }
      // Check for game end
      if (state.winCondition) {
        setGameWinner(state.winCondition as 'white' | 'black');
        setWinReason(state.winReason || undefined);
      }
      // Update control zone poker effects
      if (state.controlZonePokerEffects) {
        setControlZonePokerEffects(state.controlZonePokerEffects);
      }
    });

    // Listen for moves
    socket.on('move_made', (data: { move: any; gameSlot: string; matchState: MatchState }) => {
      if (data.gameSlot === 'A') {
        console.log('Received move in chess game:', data);
        setMatchState(data.matchState);
        const gameState = convertMatchStateToGameState(data.matchState);
        if (gameState) {
          setGameState(gameState);
          setSelectedSquare(null);
          setPossibleMoves([]);
          setError(null);
        }
        // Update barracks from match state
        if (data.matchState.teams) {
          setBarracks({
            white: data.matchState.teams.white.barracks || [],
            black: data.matchState.teams.black.barracks || []
          });
        }
        // Check for game end
        if (data.matchState.winCondition) {
          setGameWinner(data.matchState.winCondition as 'white' | 'black');
          setWinReason(data.matchState.winReason || undefined);
        }
        // Update control zone poker effects
        if (data.matchState.controlZonePokerEffects) {
          setControlZonePokerEffects(data.matchState.controlZonePokerEffects);
          // Request updated purchasable pieces (prices may have changed due to Zone C)
          socket.emit('get_purchasable_pieces');
        }
      }
    });

    // Listen for match state updates
    socket.on('match_state_updated', (data: { matchState: MatchState }) => {
      console.log('Match state updated:', data);
      setMatchState(data.matchState);
      const gameState = convertMatchStateToGameState(data.matchState);
      if (gameState) {
        setGameState(gameState);
      }
      // Update blind level and amounts if present
      if ((data.matchState as any).blindLevel) {
        setBlindLevel((data.matchState as any).blindLevel);
      }
      if ((data.matchState as any).blindAmounts) {
        setBlindAmounts((data.matchState as any).blindAmounts);
      }
      
      // Request modifiers after state update
      socket.emit('get_modifiers');
      // Update barracks from match state
      if (data.matchState.teams) {
        setBarracks({
          white: data.matchState.teams.white.barracks || [],
          black: data.matchState.teams.black.barracks || []
        });
      }
      // Check for game end
      if (data.matchState.winCondition) {
        setGameWinner(data.matchState.winCondition as 'white' | 'black');
        setWinReason(data.matchState.winReason || undefined);
      }
      // Update control zone poker effects
      if (data.matchState.controlZonePokerEffects) {
        setControlZonePokerEffects(data.matchState.controlZonePokerEffects);
      }
    });

    socket.on('available_upgrades', (data: { upgrades: UpgradeDefinition[] }) => {
      setAvailableUpgrades(data.upgrades);
    });

    socket.on('upgrade_purchased', (data: any) => {
      setGameState(prevState => {
        if (!prevState) return prevState;
        return {
          ...prevState,
          upgrades: data.upgrades,
          economy: data.economy
        };
      });
      socket.emit('get_available_upgrades');
    });

    socket.on('upgrade_error', (error: { message: string }) => {
      setError(error.message);
    });

    socket.on('possible_moves', (data: { position: Position; moves: Position[] }) => {
      console.log('Received possible moves:', data);
      setPossibleMoves(data.moves);
    });

    socket.on('rook_links_updated', (data: { rookLinks: any[]; matchState: MatchState }) => {
      console.log('Rook links updated:', data);
      // rookLinks will be set by convertMatchStateToGameState
      if (data.matchState) {
        setMatchState(data.matchState);
        const gameState = convertMatchStateToGameState(data.matchState);
        if (gameState) {
          setGameState(gameState);
        }
      }
      // Clear linking mode after successful link
      setLinkingMode(false);
      setSelectedRook(null);
    });

    socket.on('error', (error: { message: string }) => {
      console.error('Socket error:', error);
      setError(error.message);
    });

    // Request available upgrades and purchasable pieces
    socket.emit('get_available_upgrades');
    socket.emit('get_purchasable_pieces');

    // Listen for purchasable pieces
    socket.on('purchasable_pieces', (data: { pieces: PurchasablePiece[] }) => {
      setPurchasablePieces(data.pieces);
    });

    // Listen for piece purchases
    socket.on('piece_purchased', (data: any) => {
      console.log('Piece purchased:', data);
      if (data.matchState) {
        setMatchState(data.matchState);
        const gameState = convertMatchStateToGameState(data.matchState);
        if (gameState) {
          setGameState(gameState);
        }
        // Update barracks
        if (data.matchState.teams) {
          const newBarracks = {
            white: data.matchState.teams.white.barracks || [],
            black: data.matchState.teams.black.barracks || []
          };
          console.log('Setting barracks to:', newBarracks);
          setBarracks(newBarracks);
        }
      }
      if (data.team === gameState?.playerColor) {
        setError(`Successfully purchased ${data.pieceType}!`);
        setTimeout(() => setError(null), 3000);
      }
    });

    // Listen for piece placement from barracks
    socket.on('piece_placed_from_barracks', (data: any) => {
      console.log('Piece placed from barracks:', data);
      if (data.matchState) {
        setMatchState(data.matchState);
        const gameState = convertMatchStateToGameState(data.matchState);
        if (gameState) {
          setGameState(gameState);
        }
        // Update barracks
        if (data.matchState.teams) {
          setBarracks({
            white: data.matchState.teams.white.barracks || [],
            black: data.matchState.teams.black.barracks || []
          });
        }
      }
      // Show notification
      const message = data.team === gameState?.playerColor 
        ? `You placed a ${data.piece.type} at ${String.fromCharCode(97 + data.position.col)}${10 - data.position.row}`
        : `Opponent placed a ${data.piece.type}`;
      setError(message);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('purchase_error', (error: { message: string }) => {
      setError(error.message);
    });

    socket.on('placement_error', (error: { message: string }) => {
      setError(error.message);
    });

    socket.on('admin_success', (data: { message: string }) => {
      setError(data.message);
      setTimeout(() => setError(null), 3000);
    });

    // Listen for available modifiers (requested after match state is received)
    socket.on('available_modifiers', (data: { modifiers: any[] }) => {
      console.log('MultiplayerChessGame - Received available modifiers:', data.modifiers);
      console.log('MultiplayerChessGame - First modifier details:', data.modifiers?.[0]);
      setAvailableModifiers(data.modifiers);
    });

    socket.on('modifier_purchased', (data: any) => {
      console.log('Modifier purchased:', data);
      setError(data.message);
      setTimeout(() => setError(null), 3000);
      // Request updated modifiers list
      socket.emit('get_modifiers');
    });

    socket.on('modifier_error', (error: { message: string }) => {
      setError(error.message);
    });

    socket.on('blind_level_changed', (data: { blindLevel: number, blindAmounts: any }) => {
      console.log('Blind level changed:', data);
      setBlindLevel(data.blindLevel);
      setBlindAmounts(data.blindAmounts);
      setError(`Blind level changed to ${data.blindLevel}! SB: ${data.blindAmounts.smallBlind}, BB: ${data.blindAmounts.bigBlind}`);
      setTimeout(() => setError(null), 5000);
    });

    return () => {
      socket.off('match_state');
      socket.off('move_made');
      socket.off('match_state_updated');
      socket.off('available_upgrades');
      socket.off('upgrade_purchased');
      socket.off('upgrade_error');
      socket.off('possible_moves');
      socket.off('error');
      socket.off('purchasable_pieces');
      socket.off('piece_purchased');
      socket.off('piece_placed_from_barracks');
      socket.off('purchase_error');
      socket.off('placement_error');
      socket.off('admin_success');
      socket.off('available_modifiers');
      socket.off('modifier_purchased');
      socket.off('modifier_error');
      socket.off('blind_level_changed');
    };
  }, [gameId, convertMatchStateToGameState]);

  const handleSquareClick = useCallback((position: Position) => {
    console.log('handleSquareClick called:', { position, gameState: gameState?.status, isPlayerTurn: gameState?.isPlayerTurn, playerColor: gameState?.playerColor });
    
    // Handle rook linking mode
    if (linkingMode && gameState) {
      const clickedPiece = gameState.board[position.row][position.col];
      
      // Must be a rook of the player's color
      if (clickedPiece && clickedPiece.type === 'rook' && clickedPiece.color === gameState.playerColor) {
        if (!selectedRook) {
          // First rook selected
          setSelectedRook(position);
          setError('Select second rook to link with (must be within 2 spaces)');
        } else {
          // Second rook selected - link them
          const socket = socketService.getSocket();
          if (socket) {
            socket.emit('link_rooks', {
              rook1Pos: selectedRook,
              rook2Pos: position
            });
            setError('Linking rooks...');
          }
        }
      } else {
        setError('Please select a rook of your color');
      }
      return;
    }
    
    // Handle barracks placement mode
    if (placementMode && selectedBarracksPiece !== null) {
      const backRow = gameState?.playerColor === 'white' ? 9 : 0;
      if (position.row === backRow && !gameState?.board[position.row][position.col]) {
        // Place piece from barracks
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('place_from_barracks', {
            matchId: gameId,
            pieceIndex: selectedBarracksPiece,
            targetPosition: position
          });
        }
        setSelectedBarracksPiece(null);
        setPlacementMode(false);
        return;
      } else {
        setError("Pieces can only be placed on empty squares in your back row");
        return;
      }
    }
    
    if (!gameState || !gameState.isPlayerTurn) {
      setError("It's not your turn!");
      return;
    }

    if (gameState.status !== 'active') {
      setError("Game is not active");
      return;
    }

    const clickedPiece = gameState.board[position.row][position.col];
    console.log('Clicked piece:', clickedPiece, 'Player color:', gameState.playerColor);

    // If no square is selected
    if (!selectedSquare) {
      // Select the square if it has a piece of the current player's color
      if (clickedPiece && clickedPiece.color === gameState.playerColor) {
        // During second pawn move, only allow selecting pawns
        if (matchState?.isSecondPawnMove && clickedPiece.type !== 'pawn') {
          setError("During dual movement, you can only move pawns!");
          return;
        }
        // During second knight move, only allow selecting the knight that moved
        if (matchState?.isSecondKnightMove && clickedPiece.type === 'knight') {
          const knightPos = matchState.knightDoubleJumpState?.firstKnightPosition?.to;
          if (!knightPos || position.row !== knightPos.row || position.col !== knightPos.col) {
            setError("You can only move the same knight during double jump!");
            return;
          }
        } else if (matchState?.isSecondKnightMove && clickedPiece.type !== 'knight') {
          setError("You must complete the knight's double jump or skip the second move!");
          return;
        }
        setSelectedSquare(position);
        setPossibleMoves([]); // Clear moves while we wait for server response
        socketService.getPossibleMoves(position, 'A'); // Request moves from server for chess game
        setError(null);
      }
      return;
    }

    // If clicking the same square, deselect
    if (selectedSquare.row === position.row && selectedSquare.col === position.col) {
      setSelectedSquare(null);
      setPossibleMoves([]);
      return;
    }

    // If clicking on another piece of the same color, select it instead
    if (clickedPiece && clickedPiece.color === gameState.playerColor) {
      // During second pawn move, only allow selecting pawns
      if (matchState?.isSecondPawnMove && clickedPiece.type !== 'pawn') {
        setError("During dual movement, you can only move pawns!");
        return;
      }
      // During second knight move, only allow selecting the knight that moved
      if (matchState?.isSecondKnightMove && clickedPiece.type === 'knight') {
        const knightPos = matchState.knightDoubleJumpState?.firstKnightPosition?.to;
        if (!knightPos || position.row !== knightPos.row || position.col !== knightPos.col) {
          setError("You can only move the same knight during double jump!");
          return;
        }
      } else if (matchState?.isSecondKnightMove && clickedPiece.type !== 'knight') {
        setError("You must complete the knight's double jump or skip the second move!");
        return;
      }
      setSelectedSquare(position);
      setPossibleMoves([]); // Clear moves while we wait for server response
      socketService.getPossibleMoves(position, 'A'); // Request moves from server for chess game
      return;
    }

    // Try to make a move
    console.log('Checking move validity:', { possibleMoves: possibleMoves.length, targetPosition: position });
    const isValidMove = possibleMoves.some(move => move.row === position.row && move.col === position.col);
    
    if (isValidMove) {
      console.log('Valid move, sending to server');
      // Send move to server
      socketService.makeMove(selectedSquare, position, 'A').catch((error) => {
        console.error('Move error:', error);
        setError(error.message);
      });
      
      // Clear selection (will be updated when server responds)
      setSelectedSquare(null);
      setPossibleMoves([]);
    } else {
      console.log('Invalid move - possibleMoves:', possibleMoves);
      // Invalid move, just deselect
      setSelectedSquare(null);
      setPossibleMoves([]);
      setError("Invalid move!");
    }
  }, [gameState, selectedSquare, possibleMoves, placementMode, selectedBarracksPiece, gameId, linkingMode, selectedRook]);

  const handleLeaveGame = () => {
    socketService.disconnect();
    onLeaveGame();
  };

  const handleSkipSecondMove = () => {
    socketService.skipSecondPawnMove().catch((error) => {
      console.error('Skip second move error:', error);
      setError(error.message);
    });
  };

  const handleSkipSecondKnightMove = () => {
    socketService.skipSecondKnightMove().catch((error) => {
      console.error('Skip second knight move error:', error);
      setError(error.message);
    });
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    socketService.purchaseUpgrade(upgradeId);
  };

  const handlePurchaseModifier = (modifierId: string) => {
    console.log('Purchasing modifier:', modifierId);
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('purchase_modifier', { modifierId });
    }
  };

  const handlePurchasePiece = (pieceType: PieceType) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('purchase_piece', {
        matchId: gameId,
        pieceType: pieceType
      });
    }
  };

  const handleBarracksPieceSelect = (index: number | null) => {
    console.log('Barracks piece selected:', index, 'Current barracks:', barracks[gameState?.playerColor || 'white']);
    setSelectedBarracksPiece(index);
    setPlacementMode(index !== null);
  };

  const handleUpdateEconomy = (color: PieceColor, amount: number) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('admin_update_economy', { team: color, amount });
    }
  };

  const handleToggleUpgrade = (color: PieceColor, pieceType: string, upgradeId: string) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('admin_toggle_upgrade', { team: color, pieceType, upgradeId });
    }
  };

  const handleResetUpgrades = (color: PieceColor) => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('admin_reset_upgrades', { team: color });
    }
  };

  if (!gameState) {
    return (
      <div className="chess-game">
        <div className="loading">
          <p>Loading game...</p>
        </div>
      </div>
    );
  }

  const getGameStatusText = () => {
    if (gameState.status === 'waiting') {
      return 'Waiting for another player to join...';
    }
    
    if (gameState.status === 'completed') {
      return 'Game completed';
    }

    if (gameState.gameStatus === 'check') {
      return `${gameState.currentPlayer} is in check!`;
    }

    if (gameState.gameStatus === 'checkmate') {
      const winner = gameState.currentPlayer === 'white' ? 'Black' : 'White';
      return `Checkmate! ${winner} wins!`;
    }

    if (gameState.gameStatus === 'stalemate') {
      return 'Stalemate! It\'s a draw.';
    }

    // Check for dual movement mode
    if (matchState?.isSecondPawnMove) {
      return 'Your turn - Second Pawn Move Available';
    }

    // Check for knight double jump mode
    if (matchState?.isSecondKnightMove) {
      return 'Your turn - Knight Second Jump Available';
    }

    return gameState.isPlayerTurn ? 'Your turn' : 'Opponent\'s turn';
  };

  const getPlayersList = () => {
    return Object.entries(gameState.players).map(([socketId, player]) => (
      <div key={socketId} className="player-info">
        <span className={`player-indicator ${player.color}`}>
          {player.name} ({player.color})
        </span>
        {player.color === gameState.currentPlayer && <span className="turn-indicator">• Current turn</span>}
      </div>
    ));
  };

  return (
    <div className="chess-game">
      <div className="game-header">
        <div className="game-info">
          <div className="players-list">
            {getPlayersList()}
          </div>
          
          <div className="game-status">
            <p className={gameState.isPlayerTurn ? 'your-turn' : 'opponent-turn'}>
              {getGameStatusText()}
            </p>
            {matchState?.isSecondPawnMove && (
              <button 
                onClick={handleSkipSecondMove} 
                className="skip-second-move-button"
                title="Skip moving a second pawn and end your turn"
              >
                Skip Second Pawn Move
              </button>
            )}
            {matchState?.isSecondKnightMove && (
              <button 
                onClick={handleSkipSecondKnightMove} 
                className="skip-second-move-button"
                title="Skip the knight's second jump and end your turn"
              >
                Skip Second Knight Move
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="game-actions">
            <button onClick={handleLeaveGame} className="leave-game-button">
              Leave Game
            </button>
            {gameState.status === 'active' && (
              <>
                {/* Show Link Rooks button if player has the upgrade and it's their turn */}
                {gameState.playerColor && 
                 gameState.upgrades[gameState.playerColor].rook && 
                 gameState.upgrades[gameState.playerColor].rook.includes('rook_wall') &&
                 gameState.isPlayerTurn && (
                  <button 
                    onClick={() => {
                      setLinkingMode(!linkingMode);
                      setSelectedRook(null);
                      setError(linkingMode ? null : 'Click two rooks to link them');
                    }} 
                    className={`link-rooks-button ${linkingMode ? 'active' : ''}`}
                    title="Link two rooks to create a wall"
                  >
                    {linkingMode ? '❌ Cancel Linking' : '🔗 Link Rooks'}
                  </button>
                )}
                <button 
                  onClick={() => setShowAdminPanel(!showAdminPanel)} 
                  className="admin-panel-button"
                >
                  ⚙️ Admin Panel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="game-main-container">
        {/* Left Sidebar */}
        <div className="game-sidebar-left">
          {gameState.status === 'active' && gameState.economy && gameState.playerColor && (
            <>
              <div className="unified-team-barracks">
                {/* Black Team - Always on top */}
                <div className="team-section black-team">
                  <div className="team-header">
                    <h3 className="team-name">Black Team</h3>
                    <div className="team-treasury">
                      <span className="currency-symbol">₿</span>
                      {gameState.economy.black}
                    </div>
                  </div>
                  <div className="team-barracks-area">
                    {barracks.black && barracks.black.length > 0 ? (
                      <div className="barracks-grid">
                        {barracks.black.map((piece, index) => (
                          <div
                            key={index}
                            className={`barracks-piece team-piece ${gameState.playerColor} ${selectedBarracksPiece === index ? 'selected' : ''} ${placementMode ? 'placement-mode' : ''}`}
                                                         onClick={() => gameState.playerColor === 'black' ? handleBarracksPieceSelect(selectedBarracksPiece === index ? null : index) : undefined}
                          >
                            <span className="piece-symbol">{getPieceSymbol(piece)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="barracks-placeholder">
                        No pieces in barracks
                      </div>
                    )}
                  </div>
                </div>

                <div className="team-divider"></div>

                {/* White Team - Always on bottom */}
                <div className="team-section white-team">
                  <div className="team-header">
                    <h3 className="team-name">White Team</h3>
                    <div className="team-treasury">
                      <span className="currency-symbol">₿</span>
                      {gameState.economy.white}
                    </div>
                  </div>
                  <div className="team-barracks-area">
                    {barracks.white && barracks.white.length > 0 ? (
                      <div className="barracks-grid">
                                                 {barracks.white.map((piece, index) => (
                           <div
                             key={index}
                             className={`barracks-piece team-piece ${gameState.playerColor} ${selectedBarracksPiece === index ? 'selected' : ''} ${placementMode ? 'placement-mode' : ''}`}
                             onClick={() => gameState.playerColor === 'white' ? handleBarracksPieceSelect(selectedBarracksPiece === index ? null : index) : undefined}
                           >
                             <span className="piece-symbol">{getPieceSymbol(piece)}</span>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="barracks-placeholder">
                        No pieces in barracks
                      </div>
                    )}
                  </div>
                </div>
              </div>
              

            </>
          )}
        </div>

        {/* Main Game Area */}
        <div className="game-main-area">
          <div className="game-board-section">
            {/* Control Zones Bar */}
            {gameState.status === 'active' && (
              <EnhancedControlZones 
                controlZoneStatuses={gameState.controlZoneStatuses}
                pokerEffects={controlZonePokerEffects}
              />
            )}
            
            {/* Chess Board */}
            <ChessBoard 
              board={gameState.board}
              selectedSquare={selectedSquare}
              possibleMoves={possibleMoves}
              controlZones={gameState.controlZones}
              onSquareClick={handleSquareClick}
              upgrades={gameState.upgrades}
              rookLinks={rookLinks}
              lastRookLink={lastRookLink}
              highlightedSquares={placementMode ? 
                Array.from({length: 16}, (_, col) => ({
                  row: gameState.playerColor === 'white' ? 9 : 0,
                  col
                })).filter(pos => !gameState.board[pos.row][pos.col]) : []
              }
              lastMove={gameState.moveHistory && gameState.moveHistory.length > 0 ? 
                gameState.moveHistory[gameState.moveHistory.length - 1] : null
              }
            />
          </div>
        </div>
      </div>

      <div className="connection-status">
        <p className={isConnected ? 'connected' : 'disconnected'}>
          {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>
      </div>

      {showAdminPanel && gameState.upgrades && gameState.economy && (
        <div className="modal-overlay" onClick={() => setShowAdminPanel(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAdminPanel(false)}>✖</button>
            <AdminPanel
              economy={gameState.economy}
              upgrades={gameState.upgrades}
              onUpdateEconomy={handleUpdateEconomy}
              onToggleUpgrade={handleToggleUpgrade}
              onResetUpgrades={handleResetUpgrades}
              isAdminMode={isAdminMode}
              onToggleAdminMode={() => setIsAdminMode(!isAdminMode)}
            />
          </div>
        </div>
      )}

      <GameOverlay 
        winner={gameWinner}
        reason={winReason}
        playerTeam={matchState?.playerTeam}
        onClose={handleLeaveGame}
      />
    </div>
  );
};