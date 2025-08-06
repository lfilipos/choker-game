import React, { useEffect, useState } from 'react';
import { PokerCard } from './PokerCard';
import { PokerGameState, PokerPhase, Position, ShowdownResult } from '../types/poker';
import './PokerTable.css';

interface PokerTableProps {
  gameState: PokerGameState;
  onAction?: (action: string, amount?: number) => void;
  onReady?: () => void;
}

export const PokerTable: React.FC<PokerTableProps> = ({ gameState, onAction, onReady }) => {
  const [showResult, setShowResult] = useState<ShowdownResult | null>(null);
  const [showResultTimer, setShowResultTimer] = useState<NodeJS.Timeout | null>(null);
  const [showBetInput, setShowBetInput] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  
  // Animation states
  const [dealtPlayerCards, setDealtPlayerCards] = useState<number>(0);
  const [dealtOpponentCards, setDealtOpponentCards] = useState<number>(0);
  const [dealtCommunityCards, setDealtCommunityCards] = useState<number>(0);
  const [lastHandNumber, setLastHandNumber] = useState<number>(0);


  useEffect(() => {
    console.log('PokerTable phase changed to:', gameState.phase);
    console.log('Has lastShowdownResult:', !!gameState.lastShowdownResult);
    
    // Show showdown result when it changes
    if (gameState.lastShowdownResult && (gameState.phase === PokerPhase.SHOWDOWN || gameState.phase === PokerPhase.WAITING_FOR_READY)) {
      console.log('Showing showdown result');
      setShowResult(gameState.lastShowdownResult);
      
      // Clear any existing timer
      if (showResultTimer) {
        clearTimeout(showResultTimer);
      }
      
      // Don't auto-hide if waiting for ready
      if (gameState.phase !== PokerPhase.WAITING_FOR_READY) {
        // Set timer to hide result after 5 seconds
        const timer = setTimeout(() => {
          setShowResult(null);
        }, 5000);
        setShowResultTimer(timer);
      }
    }
    
    // Hide showdown when a new hand starts
    if (gameState.phase === PokerPhase.PRE_HAND || 
        gameState.phase === PokerPhase.DEALING || 
        gameState.phase === PokerPhase.PRE_FLOP) {
      console.log('Hiding showdown overlay due to new hand phase:', gameState.phase);
      setShowResult(null);
      // Clear any existing timer
      if (showResultTimer) {
        clearTimeout(showResultTimer);
        setShowResultTimer(null);
      }
    }
    
    return () => {
      if (showResultTimer) {
        clearTimeout(showResultTimer);
      }
    };
  }, [gameState.lastShowdownResult, gameState.phase]);

  // Reset bet input when turn changes
  useEffect(() => {
    if (gameState.currentTurn !== gameState.player.team) {
      setShowBetInput(false);
      setBetAmount('');
      setPendingAction(null);
    }
  }, [gameState.currentTurn, gameState.player.team]);

  // Handle card dealing animations
  useEffect(() => {
    // Reset animation when new hand starts
    if (gameState.handNumber !== lastHandNumber) {
      setLastHandNumber(gameState.handNumber);
      setDealtPlayerCards(0);
      setDealtOpponentCards(0);
      setDealtCommunityCards(0);
      
      // Animate dealing hole cards
      if (gameState.phase === PokerPhase.PRE_FLOP && gameState.player.hand.length > 0) {
        // Deal player's first card
        setTimeout(() => setDealtPlayerCards(1), 200);
        // Deal opponent's first card
        setTimeout(() => setDealtOpponentCards(1), 400);
        // Deal player's second card
        setTimeout(() => setDealtPlayerCards(2), 600);
        // Deal opponent's second card
        setTimeout(() => setDealtOpponentCards(2), 800);
      }
    }
    
    // Handle community cards
    if (gameState.phase === PokerPhase.FLOP && dealtCommunityCards === 0 && gameState.communityCards.length >= 3) {
      // Deal flop cards one by one
      setTimeout(() => setDealtCommunityCards(1), 200);
      setTimeout(() => setDealtCommunityCards(2), 400);
      setTimeout(() => setDealtCommunityCards(3), 600);
    } else if (gameState.phase === PokerPhase.TURN && dealtCommunityCards === 3 && gameState.communityCards.length >= 4) {
      // Deal turn card
      setTimeout(() => setDealtCommunityCards(4), 200);
    } else if (gameState.phase === PokerPhase.RIVER && dealtCommunityCards === 4 && gameState.communityCards.length >= 5) {
      // Deal river card
      setTimeout(() => setDealtCommunityCards(5), 200);
    }
  }, [gameState.handNumber, gameState.phase, gameState.communityCards.length, lastHandNumber, dealtCommunityCards]);
  const getPhaseDisplay = (phase: PokerPhase) => {
    const displays = {
      [PokerPhase.WAITING]: 'Waiting for players',
      [PokerPhase.PRE_HAND]: 'Pre-hand',
      [PokerPhase.DEALING]: 'Dealing cards',
      [PokerPhase.PRE_FLOP]: 'Pre-flop',
      [PokerPhase.FLOP]: 'Flop',
      [PokerPhase.TURN]: 'Turn',
      [PokerPhase.RIVER]: 'River',
      [PokerPhase.SHOWDOWN]: 'Showdown',
      [PokerPhase.HAND_COMPLETE]: 'Hand complete',
      [PokerPhase.WAITING_FOR_READY]: 'Waiting for players'
    };
    return displays[phase] || phase;
  };

  const getPositionBadge = (position: Position) => {
    if (position === Position.DEALER) {
      return <span className="position-badge dealer">D</span>;
    }
    if (position === Position.BIG_BLIND) {
      return <span className="position-badge big-blind">BB</span>;
    }
    if (position === Position.SMALL_BLIND) {
      return <span className="position-badge small-blind">SB</span>;
    }
    return null;
  };

  const isCurrentTurn = (team: string) => {
    return gameState.currentTurn === team;
  };

  const formatAction = (action: any) => {
    if (!action) return '';
    const actionName = action.action.toUpperCase();
    if (action.amount > 0 && action.action !== 'fold' && action.action !== 'check') {
      return `${action.team.toUpperCase()} ${actionName} $${action.amount}`;
    }
    return `${action.team.toUpperCase()} ${actionName}`;
  };

  return (
    <div className="poker-table">
      <div className="table-info">
        <div className="phase-indicator">
          Phase: <strong>{getPhaseDisplay(gameState.phase)}</strong>
        </div>
        <div className="hand-number">
          Hand #{gameState.handNumber}
        </div>
      </div>

      {/* Opponent area */}
      <div className="opponent-area">
        <div className={`player-box ${isCurrentTurn(gameState.opponent.team) ? 'current-turn' : ''} ${gameState.opponent.folded ? 'folded' : ''}`}>
          <div className="player-info">
            <div className="player-name">
              {gameState.opponent.name} ({gameState.opponent.team})
              {getPositionBadge(gameState.opponent.position)}
            </div>
            <div className="player-status">
              {gameState.opponent.folded && <span className="folded-text">FOLDED</span>}
              {gameState.opponent.allIn && <span className="all-in-text">ALL IN</span>}
            </div>
          </div>
          <div className="player-cards">
            {Array.from({ length: Math.min(dealtOpponentCards, gameState.opponent.handSize) }).map((_, index) => (
              <PokerCard key={index} faceDown={true} size="small" />
            ))}
          </div>
          {gameState.opponent.currentBet > 0 && (
            <div className="player-bet">
              Bet: ${gameState.opponent.currentBet}
            </div>
          )}
        </div>
      </div>

      {/* Table center */}
      <div className="table-center">
        <div className="pot-display">
          <div className="pot-label">POT</div>
          <div className="pot-amount">${gameState.pot}</div>
        </div>

        <div className="community-cards">
          {gameState.communityCards.length === 0 && gameState.phase !== PokerPhase.WAITING && (
            <div className="cards-placeholder">Community cards will appear here</div>
          )}
          {gameState.communityCards.slice(0, dealtCommunityCards).map((card, index) => (
            <PokerCard key={card.id} card={card} size="medium" />
          ))}
        </div>

        {gameState.currentBet > 0 && (
          <div className="current-bet-display">
            Current bet: ${gameState.currentBet}
          </div>
        )}
      </div>

      {/* Player area */}
      <div className="player-area">
        <div className={`player-box ${isCurrentTurn(gameState.player.team) ? 'current-turn' : ''} ${gameState.player.folded ? 'folded' : ''}`}>
          <div className="player-info">
            <div className="player-name">
              {gameState.player.name} ({gameState.player.team})
              {getPositionBadge(gameState.player.position)}
            </div>
            <div className="player-status">
              {gameState.player.folded && <span className="folded-text">FOLDED</span>}
              {gameState.player.allIn && <span className="all-in-text">ALL IN</span>}
            </div>
          </div>
          <div className="player-cards">
            {gameState.player.hand.slice(0, dealtPlayerCards).map((card) => (
              <PokerCard key={card.id} card={card} size="medium" />
            ))}
          </div>
          {gameState.player.currentBet > 0 && (
            <div className="player-bet">
              Bet: ${gameState.player.currentBet}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isCurrentTurn(gameState.player.team) && !gameState.player.folded && gameState.phase !== PokerPhase.WAITING_FOR_READY && (
          <div className="action-buttons">
            {!showBetInput ? (
              gameState.validActions.map((action) => (
                <button
                  key={action}
                  className={`action-button ${action}`}
                  onClick={() => {
                    if (action === 'bet' || action === 'raise') {
                      setPendingAction(action);
                      setShowBetInput(true);
                      setBetAmount(action === 'bet' ? String(gameState.minimumRaise) : '');
                    } else {
                      onAction?.(action);
                    }
                  }}
                >
                  {action.toUpperCase()}
                </button>
              ))
            ) : (
              <div className="bet-input-container">
                <input
                  type="number"
                  className="bet-input"
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  placeholder={`Min: $${gameState.minimumRaise}`}
                  min={gameState.minimumRaise}
                  autoFocus
                />
                <button
                  className="action-button confirm"
                  onClick={() => {
                    const amount = parseInt(betAmount);
                    if (amount >= gameState.minimumRaise) {
                      onAction?.(pendingAction!, amount);
                      setShowBetInput(false);
                      setBetAmount('');
                      setPendingAction(null);
                    }
                  }}
                >
                  CONFIRM
                </button>
                <button
                  className="action-button cancel"
                  onClick={() => {
                    setShowBetInput(false);
                    setBetAmount('');
                    setPendingAction(null);
                  }}
                >
                  CANCEL
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deck info */}
      <div className="deck-info">
        <div className="deck-stats">
          Cards: {gameState.deckState.cardsRemaining} | 
          Burn: {gameState.deckState.burnCount} | 
          Discard: {gameState.deckState.discardCount}
        </div>
      </div>

      {/* Action history */}
      <div className="poker-action-history">
        <h3>Action History</h3>
        <div className="action-list">
          {gameState.bettingHistory && gameState.bettingHistory.length > 0 ? (
            gameState.bettingHistory.map((action, index) => (
              <div key={index} className={`action-item ${action.team}`}>
                {formatAction(action)}
              </div>
            ))
          ) : (
            <div className="no-actions">No actions yet this hand</div>
          )}
        </div>
        <div className="last-action">
          {gameState.lastAction && (
            <div>
              <strong>Last action:</strong> {formatAction(gameState.lastAction)}
            </div>
          )}
        </div>
      </div>

      {/* Showdown result overlay */}
      {showResult && (
        <div className="showdown-overlay">
          <div className="showdown-result">
            <h2>{showResult.winReason === 'fold' ? 'Hand Complete!' : 'Showdown!'}</h2>
            <div className="showdown-winner">
              {showResult.winners.length === 1 ? (
                <>
                  <p>{showResult.winners[0].toUpperCase()} team wins!</p>
                  {showResult.winReason === 'fold' && (
                    <p style={{ fontSize: '18px', color: '#FFD700', marginTop: '10px' }}>
                      Opponent folded
                    </p>
                  )}
                </>
              ) : (
                <p>Split pot between {showResult.winners.join(' and ')} teams!</p>
              )}
              {showResult.winningHand && (
                <p className="winning-hand">{showResult.winningHand.description}</p>
              )}
            </div>
            {/* Only show hands if it was a showdown, not a fold */}
            {showResult.winReason !== 'fold' && (
              <div className="showdown-hands">
                {Object.entries(showResult.playerHands).map(([team, handResult]) => (
                  <div key={team} className={`showdown-player ${showResult.winners.includes(team) ? 'winner' : ''}`}>
                    <h3>{team} team</h3>
                    <div className="showdown-cards">
                      {handResult.holeCards.map((card) => (
                        <PokerCard key={card.id} card={card} size="small" />
                      ))}
                    </div>
                    <p>{handResult.description}</p>
                  </div>
                ))}
              </div>
            )}
            
            {/* Ready button in showdown overlay */}
            {gameState.phase === PokerPhase.WAITING_FOR_READY && (
              <div style={{ marginTop: '30px' }}>
                {gameState.playersReady && (
                  <div style={{ marginBottom: '15px', fontSize: '16px' }}>
                    {gameState.playersReady.map(([team, ready]) => (
                      <div key={team} style={{ marginBottom: '5px' }}>
                        {team} team: {ready ? '✅ Ready' : '⏳ Not ready'}
                      </div>
                    ))}
                  </div>
                )}
                {onReady && (
                  <button
                    className="action-button bet"
                    onClick={onReady}
                    style={{ minWidth: '200px', fontSize: '16px', padding: '12px 24px' }}
                  >
                    Ready for Next Hand
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};