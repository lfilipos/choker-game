import React, { useState } from 'react';
import { ChessPiece } from '../types';
import { UpgradeState, TieredUpgradeDefinition } from '../types/upgrades';
import './ChessPieceComponent.css';
import './ChessPieceUpgrade.css';

interface ChessPieceComponentProps {
  piece: ChessPiece;
  upgrades?: UpgradeState;
  tieredUpgrades?: TieredUpgradeDefinition[];
  position?: { row: number; col: number };
}

export const ChessPieceComponent: React.FC<ChessPieceComponentProps> = ({ 
  piece, 
  upgrades, 
  tieredUpgrades = [],
  position 
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const getPieceSymbol = (): string => {
    const symbols = {
      white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
      },
      black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
      }
    };
    
    return symbols[piece.color][piece.type];
  };

  // Get tiered upgrade information for this piece
  const getPieceTieredUpgrades = (): TieredUpgradeDefinition[] => {
    if (!tieredUpgrades) return [];
    return tieredUpgrades.filter(upgrade => 
      upgrade.pieceType === piece.type && upgrade.isPurchased
    );
  };

  const pieceTieredUpgrades = getPieceTieredUpgrades();

  // Get upgrade tier information
  const getUpgradeTiers = () => {
    const tiers = { tier1: false, tier2: false, tier3: false };
    
    pieceTieredUpgrades.forEach(upgrade => {
      if (upgrade.tier === 1) tiers.tier1 = true;
      if (upgrade.tier === 2) tiers.tier2 = true;
      if (upgrade.tier === 3) tiers.tier3 = true;
    });
    
    return tiers;
  };

  const upgradeTiers = getUpgradeTiers();

  // Get the highest tier achieved
  const getHighestTier = (): number => {
    if (upgradeTiers.tier3) return 3;
    if (upgradeTiers.tier2) return 2;
    if (upgradeTiers.tier1) return 1;
    return 0;
  };

  const highestTier = getHighestTier();

  // Get upgrade count for legacy support
  const getUpgradeCount = (): number => {
    if (!upgrades || !upgrades[piece.color] || !upgrades[piece.color][piece.type]) {
      return 0;
    }
    return upgrades[piece.color][piece.type].length;
  };

  const legacyUpgradeCount = getUpgradeCount();

  // Determine if piece has any upgrades (legacy or tiered)
  const hasUpgrades = highestTier > 0 || legacyUpgradeCount > 0;

  // Get tooltip content
  const getTooltipContent = (): string => {
    if (highestTier > 0) {
      const tierNames = [];
      if (upgradeTiers.tier1) tierNames.push('Tier 1');
      if (upgradeTiers.tier2) tierNames.push('Tier 2');
      if (upgradeTiers.tier3) tierNames.push('Tier 3');
      
      return `${piece.type.charAt(0).toUpperCase() + piece.type.slice(1)} - ${tierNames.join(', ')}`;
    } else if (legacyUpgradeCount > 0) {
      return `${piece.type.charAt(0).toUpperCase() + piece.type.slice(1)} - ${legacyUpgradeCount} upgrade(s)`;
    }
    return `${piece.type.charAt(0).toUpperCase() + piece.type.slice(1)}`;
  };

  return (
    <div 
      className={`chess-piece ${piece.color} ${hasUpgrades ? 'upgraded-piece' : ''}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className={`piece-symbol ${hasUpgrades ? 'upgrade-glow' : ''}`}>
        {getPieceSymbol()}
      </span>
      
      {/* Tiered Upgrade Indicators */}
      {highestTier > 0 && (
        <div className="tiered-upgrade-indicators">
          {upgradeTiers.tier1 && (
            <div className="tier-indicator tier-1" title="Tier 1 Upgrade">
              <span className="tier-number">1</span>
            </div>
          )}
          {upgradeTiers.tier2 && (
            <div className="tier-indicator tier-2" title="Tier 2 Upgrade">
              <span className="tier-number">2</span>
            </div>
          )}
          {upgradeTiers.tier3 && (
            <div className="tier-indicator tier-3" title="Tier 3 Upgrade">
              <span className="tier-number">3</span>
            </div>
          )}
        </div>
      )}
      
      {/* Legacy Upgrade Indicator (for backward compatibility) */}
      {legacyUpgradeCount > 0 && highestTier === 0 && (
        <div className={`upgrade-indicator upgrade-count-${Math.min(legacyUpgradeCount, 4)} ${legacyUpgradeCount >= 4 ? 'upgrade-count-max' : ''}`}>
          {legacyUpgradeCount}
        </div>
      )}
      
      {/* Tooltip */}
      {showTooltip && (
        <div className="piece-tooltip">
          {getTooltipContent()}
          {position && (
            <div className="piece-position">
              Position: {String.fromCharCode(97 + position.col)}{10 - position.row}
            </div>
          )}
          {highestTier > 0 && (
            <div className="upgrade-effects">
              {pieceTieredUpgrades.map(upgrade => (
                <div key={upgrade.id} className="upgrade-effect">
                  • {upgrade.summary}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};