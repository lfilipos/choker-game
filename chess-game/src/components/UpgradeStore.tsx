import React, { useState, useEffect } from 'react';
import { PieceColor, PieceType, PurchasablePiece } from '../types';
import { TieredUpgradeDefinition, UpgradeState, TeamEconomy, UpgradeProgress } from '../types/upgrades';
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
  availableUpgrades: TieredUpgradeDefinition[];
  purchasablePieces?: PurchasablePiece[];
  availableModifiers?: Modifier[];
  blindLevel?: number;
  blindAmounts?: { smallBlind: number; bigBlind: number };
  upgradeProgress?: Record<PieceType, UpgradeProgress>;
}

const pieceEmojis: Record<PieceType, string> = {
  pawn: '♟',
  knight: '♞',
  bishop: '♝',
  rook: '♜',
  queen: '♛',
  king: '♚'
};

const pieceNames: Record<PieceType, string> = {
  pawn: 'Pawn',
  knight: 'Knight',
  bishop: 'Bishop',
  rook: 'Rook',
  queen: 'Queen',
  king: 'King'
};

const tierColors = {
  1: '#4CAF50', // Green
  2: '#2196F3', // Blue
  3: '#9C27B0'  // Purple
};

const tierNames = {
  1: 'Basic',
  2: 'Advanced',
  3: 'Master'
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

// Component for displaying upgrade requirements
const RequirementDisplay: React.FC<{ requirements: any[] }> = ({ requirements }) => {
  if (!requirements || requirements.length === 0) {
    return <div className="no-requirements">No requirements</div>;
  }

  return (
    <div className="requirements-list">
      {requirements.map((req, idx) => {
        let requirementText = '';
        let requirementIcon = '';

        switch (req.type) {
          case 'capture':
            requirementIcon = '⚔️';
            requirementText = `Capture ${req.count} ${req.pieceType ? pieceNames[req.pieceType as PieceType] : 'piece'}${req.count > 1 ? 's' : ''}`;
            break;
          case 'purchase':
            requirementIcon = '🔓';
            requirementText = `Purchase previous tier upgrade`;
            break;
          case 'treasury':
            requirementIcon = '💰';
            requirementText = `Have ${req.amount} currency`;
            break;
          case 'control_zone':
            requirementIcon = '🎯';
            requirementText = `Control zone ${req.zoneId}`;
            break;
          default:
            requirementIcon = '❓';
            requirementText = 'Unknown requirement';
        }

        return (
          <div key={idx} className="requirement-item">
            <span className="requirement-icon">{requirementIcon}</span>
            <span className="requirement-text">{requirementText}</span>
          </div>
        );
      })}
    </div>
  );
};

// Component for individual upgrade tile
const UpgradeTile: React.FC<{
  upgrade: TieredUpgradeDefinition;
  isOwned: boolean;
  canAfford: boolean;
  onPurchase: (upgradeId: string) => void;
  onMouseEnter: (upgradeId: string) => void;
  onMouseLeave: () => void;
  isHovered: boolean;
}> = ({ upgrade, isOwned, canAfford, onPurchase, onMouseEnter, onMouseLeave, isHovered }) => {
  return (
    <div 
      className={`upgrade-tile tier-${upgrade.tier} ${!canAfford ? 'unaffordable' : ''} ${isOwned ? 'owned' : ''} ${isHovered ? 'hovered' : ''}`}
      onMouseEnter={() => onMouseEnter(upgrade.id)}
      onMouseLeave={onMouseLeave}
    >
      <div className="upgrade-header">
        <div className="piece-info">
          <span className="piece-icon">{pieceEmojis[upgrade.pieceType]}</span>
          <span className="piece-name">{pieceNames[upgrade.pieceType]}</span>
        </div>
        <div className="tier-badge" style={{ backgroundColor: tierColors[upgrade.tier] }}>
          {tierNames[upgrade.tier]}
        </div>
      </div>
      
      <div className="upgrade-content">
        <h3 className="upgrade-name">{upgrade.name}</h3>
        <p className="upgrade-summary">{upgrade.summary}</p>
        <p className="upgrade-description">{upgrade.description}</p>
        
        <div className="upgrade-effects">
          {upgrade.effects.map((effect, idx) => (
            <div key={idx} className={`effect ${effect.type}`}>
              <span className="effect-type">{effect.type}</span>
              <span className="effect-desc">{effect.description}</span>
            </div>
          ))}
        </div>

        <div className="upgrade-requirements">
          <h4>Requirements:</h4>
          <RequirementDisplay requirements={upgrade.requirements} />
        </div>
      </div>

      <div className="upgrade-footer">
        <div className="upgrade-cost">
          <span className="currency-symbol">💰</span>
          <span className="cost-amount">{upgrade.cost}</span>
        </div>
        
        {isOwned ? (
          <button className="purchase-btn owned" disabled>
            ✓ Owned
          </button>
        ) : (
          <button 
            className="purchase-btn"
            disabled={!canAfford}
            onClick={() => onPurchase(upgrade.id)}
          >
            {canAfford ? 'Purchase' : 'Insufficient Funds'}
          </button>
        )}
      </div>
    </div>
  );
};

// Component for piece type selector
const PieceTypeSelector: React.FC<{
  selectedPiece: PieceType | 'all';
  onPieceSelect: (pieceType: PieceType | 'all') => void;
}> = ({ selectedPiece, onPieceSelect }) => {
  return (
    <div className="piece-type-selector">
      <button 
        className={`piece-filter-btn ${selectedPiece === 'all' ? 'active' : ''}`}
        onClick={() => onPieceSelect('all')}
      >
        All Pieces
      </button>
      {Object.entries(pieceEmojis).map(([piece, emoji]) => (
        <button
          key={piece}
          className={`piece-filter-btn ${selectedPiece === piece ? 'active' : ''}`}
          onClick={() => onPieceSelect(piece as PieceType)}
        >
          {emoji} {pieceNames[piece as PieceType]}
        </button>
      ))}
    </div>
  );
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
  blindAmounts = { smallBlind: 5, bigBlind: 10 },
  upgradeProgress = {}
}) => {
  const [activeTab, setActiveTab] = useState<'upgrades' | 'pieces' | 'modifiers'>('upgrades');
  const [selectedPiece, setSelectedPiece] = useState<PieceType | 'all'>('all');
  const [hoveredUpgrade, setHoveredUpgrade] = useState<string | null>(null);

  if (!playerColor) return null;

  const playerBalance = economy[playerColor];
  const playerUpgrades = upgrades[playerColor];

  // Filter upgrades by selected piece
  const filteredUpgrades = selectedPiece === 'all' 
    ? availableUpgrades 
    : availableUpgrades.filter(u => u.pieceType === selectedPiece);

  // Sort upgrades by piece type, then by tier
  const sortedUpgrades = filteredUpgrades.sort((a, b) => {
    if (a.pieceType !== b.pieceType) {
      return a.pieceType.localeCompare(b.pieceType);
    }
    return a.tier - b.tier;
  });

  // Check if upgrade is already owned
  const isOwned = (upgradeId: string, pieceType: PieceType) => {
    return playerUpgrades[pieceType]?.includes(upgradeId) || false;
  };

  // Check if player can afford upgrade
  const canAfford = (cost: number) => {
    return playerBalance >= cost;
  };

  // Check if upgrade is available (requirements met)
  const isUpgradeAvailable = (upgrade: TieredUpgradeDefinition) => {
    if (upgrade.isAvailable !== undefined) {
      return upgrade.isAvailable;
    }
    
    // Basic availability check - can be enhanced with backend validation
    return true;
  };

  const handlePurchase = (upgrade: TieredUpgradeDefinition) => {
    if (canAfford(upgrade.cost) && !isOwned(upgrade.id, upgrade.pieceType) && isUpgradeAvailable(upgrade)) {
      onPurchaseUpgrade(upgrade.id);
    }
  };

  // Wrapper function for UpgradeTile component that expects just the ID
  const handlePurchaseById = (upgradeId: string) => {
    const upgrade = availableUpgrades.find(u => u.id === upgradeId);
    if (upgrade) {
      handlePurchase(upgrade);
    }
  };

  const handlePurchasePiece = (pieceType: PieceType) => {
    if (onPurchasePiece) {
      onPurchasePiece(pieceType);
    }
  };

  return (
    <div className="upgrade-store" data-testid="upgrade-store">
      <div className="store-header">
        <h2>Upgrade Store</h2>
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
          <PieceTypeSelector 
            selectedPiece={selectedPiece}
            onPieceSelect={setSelectedPiece}
          />

          <div className="upgrades-grid">
            {sortedUpgrades.map(upgrade => {
              const owned = isOwned(upgrade.id, upgrade.pieceType);
              const affordable = canAfford(upgrade.cost);
              const available = isUpgradeAvailable(upgrade);
              
              return (
                <UpgradeTile
                  key={upgrade.id}
                  upgrade={upgrade}
                  isOwned={owned}
                  canAfford={affordable}
                  onPurchase={handlePurchaseById}
                  onMouseEnter={setHoveredUpgrade}
                  onMouseLeave={() => setHoveredUpgrade(null)}
                  isHovered={hoveredUpgrade === upgrade.id}
                />
              );
            })}
          </div>

          {sortedUpgrades.length === 0 && (
            <div className="no-upgrades">
              <p>No upgrades available for {selectedPiece === 'all' ? 'any piece' : pieceNames[selectedPiece]}</p>
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