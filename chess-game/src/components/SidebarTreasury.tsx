import React from 'react';
import { PieceColor } from '../types';
import { TeamEconomy } from '../types/upgrades';
import './SidebarTreasury.css';

interface SidebarTreasuryProps {
  economy: TeamEconomy;
  playerColor: PieceColor;
}

const SidebarTreasury: React.FC<SidebarTreasuryProps> = ({ economy, playerColor }) => {
  const enemyColor = playerColor === 'white' ? 'black' : 'white';

  return (
    <div className="sidebar-treasury">
      <h3>Team Economy</h3>
      
      <div className="treasury-item your-treasury">
        <span className="treasury-label">Your treasury</span>
        <span className="treasury-value">
          <span className="currency-symbol">₿</span>
          {economy[playerColor]}
        </span>
      </div>
      
      <div className="treasury-item opponent-treasury">
        <span className="treasury-label">Opponent's</span>
        <span className="treasury-value">
          <span className="currency-symbol">₿</span>
          {economy[enemyColor]}
        </span>
      </div>
    </div>
  );
};

export default SidebarTreasury;