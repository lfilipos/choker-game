import React, { useState, useEffect } from 'react';
import { PieceColor, PieceType, PurchasablePiece } from '../types';
import { UpgradeDefinition, UpgradeState, TeamEconomy } from '../types/upgrades';
import './UpgradeStore.css';

interface Modifier {
  id: string;
  name: string;
  description: string;
  cost: number;
  canPurchase: boolean;
  type: string;
  currentLevel?: number;
  currentBlinds?: { smallBlind: number; bigBlind: number };
  newLevel?: number;
  newBlinds?: { smallBlind: number; bigBlind: number };
  previewText?: string;
  blindsPreview?: string;
}

interface UpgradeStoreProps {
  playerColor: PieceColor | null;
  upgrades: UpgradeState;
  economy: TeamEconomy;
  onPurchaseUpgrade: (upgradeId: string) => void;
  onPurchasePiece?: (pieceType: PieceType) => void;
  onPurchaseModifier?: (modifierId: string) => void;
  availableUpgrades: UpgradeDefinition[];
  purchasablePieces?: PurchasablePiece[];
  availableModifiers?: Modifier[];
  blindLevel?: number;
  blindAmounts?: { smallBlind: number; bigBlind: number };
}

const pieceEmojis: Record<PieceType, string> = {
  pawn: '♟',
  knight: '♞',
  bishop: '♝',
  rook: '♜',
  queen: '♛',
  king: '♚'
};

// Calculate blind amounts using Fibonacci sequence
const calculateBlindAmounts = (level: number): { smallBlind: number; bigBlind: number } => {
  const baseSB = 5;
  const baseBB = 10;
  
  if (level === 1) {
    return { smallBlind: baseSB, bigBlind: baseBB };
  }
  
  // Fibonacci-like progression: 5/10, 10/20, 15/30, 25/50, 40/80, 65/130, etc.
  let prevSB = baseSB;
  let prevBB = baseBB;
  let currentSB = baseBB;
  let currentBB = baseBB * 2;
  
  for (let i = 2; i < level; i++) {
    const tempSB = currentSB;
    const tempBB = currentBB;
    currentSB = prevSB + currentSB;
    currentBB = prevBB + currentBB;
    prevSB = tempSB;
    prevBB = tempBB;
  }
  
  return { smallBlind: currentSB, bigBlind: currentBB };
};

const UpgradeStore: React.FC<UpgradeStoreProps> = ({
  playerColor,
  upgrades,
  economy,
  onPurchaseUpgrade,
  onPurchasePiece,
  onPurchaseModifier,
  availableUpgrades,
  purchasablePieces = [],
  availableModifiers = [],
  blindLevel = 1,
  blindAmounts = { smallBlind: 5, bigBlind: 10 }
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'pieces' | 'modifiers'>('upgrades');
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

  // Check if player can afford upgrade (recalculate locally)
  const canAfford = (cost: number) => {
    return playerBalance >= cost;
  };

  const handlePurchase = (upgrade: UpgradeDefinition) => {
    // Double-check affordability locally
    if (canAfford(upgrade.cost) && !isOwned(upgrade.id, upgrade.pieceType)) {
      onPurchaseUpgrade(upgrade.id);
    }
  };

  const handlePurchasePiece = (pieceType: PieceType) => {
    if (onPurchasePiece) {
      onPurchasePiece(pieceType);
    }
  };

  return (
    <div className="upgrade-store">
      <div className="store-header">
        <h2>Store</h2>
        <div className="store-balance">
          <span className="currency-symbol">💰</span>
          <span className="amount">{playerBalance}</span>
        </div>
      </div>

      <div className="store-tabs">
        <button 
          className={`tab ${activeTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrades')}
        >
          Upgrades
        </button>
        <button 
          className={`tab ${activeTab === 'pieces' ? 'active' : ''}`}
          onClick={() => setActiveTab('pieces')}
        >
          Buy Pieces
        </button>
        <button 
          className={`tab ${activeTab === 'modifiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('modifiers')}
        >
          Modifiers
        </button>
      </div>

      {activeTab === 'upgrades' && (
        <>
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
          const affordable = canAfford(upgrade.cost);
          const eligible = upgrade.eligible !== false;
          const canPurchase = affordable && eligible && !owned;
          return (
            <div 
              key={upgrade.id} 
              className={`upgrade-card ${!affordable ? 'unaffordable' : ''} ${owned ? 'owned' : ''} ${!eligible ? 'locked' : ''}`}
              onMouseEnter={() => setShowingUpgrade(upgrade.id)}
              onMouseLeave={() => setShowingUpgrade(null)}
            >
              <div className="upgrade-header">
                <span className="piece-icon">{pieceEmojis[upgrade.pieceType]}</span>
                <h3>{upgrade.name}</h3>
                {upgrade.level && <span className="upgrade-level">Lv.{upgrade.level}</span>}
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

              {!eligible && upgrade.lockedReasons && upgrade.lockedReasons.length > 0 && (
                <div className="upgrade-requirements">
                  <div className="requirements-header">🔒 Requirements:</div>
                  {upgrade.lockedReasons.map((reason, idx) => (
                    <div key={idx} className="requirement-item">{reason}</div>
                  ))}
                </div>
              )}

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
                    disabled={!canPurchase}
                    onClick={() => handlePurchase(upgrade)}
                  >
                    {!eligible ? 'Locked' : !affordable ? 'Insufficient Funds' : 'Purchase'}
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
        </>
      )}

      {activeTab === 'pieces' && (
        <div className="pieces-grid">
          {purchasablePieces.map(piece => {
            const canAfford = playerBalance >= piece.price;
            const isUnlocked = piece.isUnlocked || piece.isAvailable;
            return (
              <div 
                key={piece.type} 
                className={`piece-card ${!canAfford ? 'unaffordable' : ''} ${!isUnlocked ? 'unavailable' : ''}`}
              >
                <div className="piece-header">
                  <span className="piece-icon large">{pieceEmojis[piece.type]}</span>
                  <h3>{piece.name}</h3>
                </div>
                
                <p className="piece-description">{piece.description}</p>
                
                <div className="piece-footer">
                  <div className="piece-cost">
                    <span className="currency-symbol">💰</span>
                    {piece.hasDiscount ? (
                      <>
                        <span className="original-price" style={{textDecoration: 'line-through', opacity: 0.5, marginRight: '5px'}}>
                          {piece.originalPrice}
                        </span>
                        <span className="cost-amount discounted" style={{color: '#4CAF50'}}>
                          {piece.price}
                        </span>
                        <span style={{marginLeft: '5px', fontSize: '0.8em', color: '#4CAF50'}}>
                          (Zone C)
                        </span>
                      </>
                    ) : (
                      <span className="cost-amount">{piece.price}</span>
                    )}
                  </div>
                  
                  {isUnlocked ? (
                    <button 
                      className="purchase-btn"
                      disabled={!canAfford}
                      onClick={() => handlePurchasePiece(piece.type)}
                    >
                      {canAfford ? 'Purchase' : 'Insufficient Funds'}
                    </button>
                  ) : (
                    <div className="unlock-requirement">
                      <span className="unlock-text">Capture a {piece.name} to unlock</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {purchasablePieces.length === 0 && (
            <div className="no-pieces">
              <p>Loading pieces...</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'modifiers' && (
        <div className="modifiers-container">
          <div className="current-blind-level">
            <h3>Current Blind Level: {blindLevel}</h3>
            <p className="current-blind-amounts">
              Small Blind: <strong>{blindAmounts.smallBlind}</strong> | 
              Big Blind: <strong>{blindAmounts.bigBlind}</strong>
            </p>
            <p className="blind-info">
              Blinds affect the cost of playing poker hands for both teams
            </p>
          </div>
          
          <div className="modifiers-grid">
            {availableModifiers.map(modifier => {
              const canAfford = modifier.canPurchase;
              
              // Calculate preview data locally if not provided
              let previewText = modifier.previewText;
              let blindsPreview = modifier.blindsPreview;
              
              if (!previewText && modifier.id === 'increase_blinds') {
                const newLevel = blindLevel + 1;
                previewText = `Level ${blindLevel} → Level ${newLevel}`;
                // Calculate new blinds using Fibonacci sequence
                const newBlinds = calculateBlindAmounts(newLevel);
                blindsPreview = `${blindAmounts.smallBlind}/${blindAmounts.bigBlind} → ${newBlinds.smallBlind}/${newBlinds.bigBlind}`;
              } else if (!previewText && modifier.id === 'decrease_blinds') {
                const newLevel = Math.max(1, blindLevel - 1);
                previewText = `Level ${blindLevel} → Level ${newLevel}`;
                const newBlinds = calculateBlindAmounts(newLevel);
                blindsPreview = `${blindAmounts.smallBlind}/${blindAmounts.bigBlind} → ${newBlinds.smallBlind}/${newBlinds.bigBlind}`;
              }
              
              return (
                <div 
                  key={modifier.id} 
                  className={`modifier-card ${!canAfford ? 'unaffordable' : ''}`}
                >
                  <div className="modifier-header">
                    <h3>{modifier.name}</h3>
                    <span className="modifier-type">{modifier.type}</span>
                  </div>
                  
                  <p className="modifier-description">{modifier.description}</p>
                  
                  {previewText && (
                    <div className="modifier-preview">
                      <div className="level-change">
                        <span className="preview-label">Level Change:</span>
                        <span className="preview-value">{previewText}</span>
                      </div>
                      {blindsPreview && (
                        <div className="blinds-change">
                          <span className="preview-label">Blind Amounts:</span>
                          <span className="preview-value">{blindsPreview}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="modifier-footer">
                    <div className="modifier-cost">
                      <span className="currency-symbol">💰</span>
                      <span className="cost-amount">{modifier.cost}</span>
                    </div>
                    
                    <button 
                      className="purchase-btn"
                      disabled={!canAfford}
                      onClick={() => onPurchaseModifier?.(modifier.id)}
                    >
                      {canAfford ? 'Purchase' : 
                       modifier.cost === null ? 'Not Available' : 'Insufficient Funds'}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {availableModifiers.length === 0 && (
              <div className="no-modifiers">
                <p>No modifiers available</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UpgradeStore;