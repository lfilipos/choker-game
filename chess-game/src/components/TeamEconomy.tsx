import React from 'react';
import { PieceColor } from '../types';
import { TeamEconomy as TeamEconomyType } from '../types/upgrades';
import './TeamEconomy.css';

interface TeamEconomyProps {
  economy: TeamEconomyType;
  playerColor: PieceColor | null;
}

const TeamEconomy: React.FC<TeamEconomyProps> = ({ economy, playerColor }) => {
  if (!playerColor) return null;

  const playerBalance = economy[playerColor];
  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const opponentBalance = economy[opponentColor];

  return (
    <div className="team-economy">
      <div className="economy-section player">
        <h3>Your Treasury</h3>
        <div className="balance">
          <span className="currency-symbol">💰</span>
          <span className="amount">{playerBalance}</span>
        </div>
        <div className="income-info">
          <p>+10 per turn</p>
          <p>+50 per capture</p>
          <p>+25 per control zone</p>
        </div>
      </div>
      
      <div className="economy-section opponent">
        <h3>Opponent Treasury</h3>
        <div className="balance">
          <span className="currency-symbol">💰</span>
          <span className="amount">{opponentBalance}</span>
        </div>
      </div>
    </div>
  );
};

export default TeamEconomy;