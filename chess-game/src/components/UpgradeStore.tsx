import React, { useState, useEffect } from 'react';
import { PieceColor, PieceType } from '../types';
import { UpgradeDefinition, UpgradeState, TeamEconomy } from '../types/upgrades';
import './UpgradeStore.css';

interface UpgradeStoreProps {
  playerColor: PieceColor | null;
  upgrades: UpgradeState;
  economy: TeamEconomy;
  onPurchaseUpgrade: (upgradeId: string) => void;
  availableUpgrades: UpgradeDefinition[];
}

const pieceEmojis: Record<PieceType, string> = {
  pawn: '♟',
  knight: '♞',
  bishop: '♗',
  rook: '♜',
  queen: '♛',
  king: '♚'
};

const UpgradeStore: React.FC<UpgradeStoreProps> = ({
  playerColor,
  upgrades,
  economy,
  onPurchaseUpgrade,
  availableUpgrades
}) => {
  const [selectedPiece, setSelectedPiece] = useState<PieceType | 'all'>('all');
  const [showingUpgrade, setShowingUpgrade] = useState<string | null>(null);

  if (!playerColor) return null;

  const playerBalance = economy[playerColor];
  const playerUpgrades = upgrades[playerColor];

  // Filter upgrades by selected piece
  const filteredUpgrades = selectedPiece === 'all' 
    ? availableUpgrades 
    : availableUpgrades.filter(u => u.pieceType === selectedPiece);

  // Check if upgrade is already owned
  const isOwned = (upgradeId: string, pieceType: PieceType) => {
    return playerUpgrades[pieceType]?.includes(upgradeId) || false;
  };

  const handlePurchase = (upgrade: UpgradeDefinition) => {
    if (upgrade.canAfford && !isOwned(upgrade.id, upgrade.pieceType)) {
      onPurchaseUpgrade(upgrade.id);
    }
  };

  return (
    <div className="upgrade-store">
      <div className="store-header">
        <h2>Upgrade Store</h2>
        <div className="store-balance">
          <span className="currency-symbol">💰</span>
          <span className="amount">{playerBalance}</span>
        </div>
      </div>

      <div className="piece-filter">
        <button 
          className={selectedPiece === 'all' ? 'active' : ''}
          onClick={() => setSelectedPiece('all')}
        >
          All Pieces
        </button>
        {Object.entries(pieceEmojis).map(([piece, emoji]) => (
          <button
            key={piece}
            className={selectedPiece === piece ? 'active' : ''}
            onClick={() => setSelectedPiece(piece as PieceType)}
          >
            {emoji} {piece}
          </button>
        ))}
      </div>

      <div className="upgrades-grid">
        {filteredUpgrades.map(upgrade => {
          const owned = isOwned(upgrade.id, upgrade.pieceType);
          return (
            <div 
              key={upgrade.id} 
              className={`upgrade-card ${!upgrade.canAfford ? 'unaffordable' : ''} ${owned ? 'owned' : ''}`}
              onMouseEnter={() => setShowingUpgrade(upgrade.id)}
              onMouseLeave={() => setShowingUpgrade(null)}
            >
              <div className="upgrade-header">
                <span className="piece-icon">{pieceEmojis[upgrade.pieceType]}</span>
                <h3>{upgrade.name}</h3>
              </div>
              
              <p className="upgrade-description">{upgrade.description}</p>
              
              <div className="upgrade-effects">
                {upgrade.effects.map((effect, idx) => (
                  <div key={idx} className={`effect ${effect.type}`}>
                    <span className="effect-type">{effect.type}</span>
                    <span className="effect-desc">{effect.description}</span>
                  </div>
                ))}
              </div>

              <div className="upgrade-footer">
                <div className="upgrade-cost">
                  <span className="currency-symbol">💰</span>
                  <span className="cost-amount">{upgrade.cost}</span>
                </div>
                
                {owned ? (
                  <button className="purchase-btn owned" disabled>
                    Owned
                  </button>
                ) : (
                  <button 
                    className="purchase-btn"
                    disabled={!upgrade.canAfford}
                    onClick={() => handlePurchase(upgrade)}
                  >
                    {upgrade.canAfford ? 'Purchase' : 'Insufficient Funds'}
                  </button>
                )}
              </div>

              {upgrade.duration && (
                <div className="upgrade-duration">
                  ⏱ Temporary: {upgrade.duration} turns
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredUpgrades.length === 0 && (
        <div className="no-upgrades">
          <p>No upgrades available for {selectedPiece === 'all' ? 'any piece' : selectedPiece}</p>
        </div>
      )}
    </div>
  );
};

export default UpgradeStore;