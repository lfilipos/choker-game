import React from 'react';
import './GameOverlay.css';

interface GameOverlayProps {
  winner: 'white' | 'black' | null;
  reason?: string;
  playerTeam?: string;
  onClose?: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ winner, reason, playerTeam, onClose }) => {
  if (!winner) return null;

  const isWinner = playerTeam === winner;
  const winnerText = winner.charAt(0).toUpperCase() + winner.slice(1);
  
  const getReasonText = () => {
    // Handle both old format and new format reasons
    if (reason?.includes('kings captured')) {
      return 'All enemy kings have been captured!';
    }
    if (reason?.includes('bankrupt')) {
      const bankruptTeam = reason.includes('White') ? 'White' : 'Black';
      return `${bankruptTeam} team has gone bankrupt!`;
    }
    switch (reason) {
      case 'all_kings_captured':
        return 'All enemy kings have been captured!';
      case 'opponent_disconnected':
        return 'Opponent disconnected';
      case 'forfeit':
        return 'Opponent forfeited';
      default:
        return reason || '';
    }
  };

  return (
    <div className="game-overlay">
      <div className="game-overlay-content">
        <div className={`game-result ${isWinner ? 'victory' : 'defeat'}`}>
          {isWinner ? (
            <>
              <div className="result-icon">🏆</div>
              <h1>Victory!</h1>
              <p className="result-message">Your team ({winnerText}) has won!</p>
            </>
          ) : (
            <>
              <div className="result-icon">💔</div>
              <h1>Defeat</h1>
              <p className="result-message">{winnerText} team has won</p>
            </>
          )}
          <p className="reason-text">{getReasonText()}</p>
        </div>
        
        <div className="game-stats">
          <h3>Game Complete</h3>
          <p>Thank you for playing!</p>
        </div>

        {onClose && (
          <button className="close-overlay-btn" onClick={onClose}>
            Return to Lobby
          </button>
        )}
      </div>
    </div>
  );
};

export default GameOverlay;