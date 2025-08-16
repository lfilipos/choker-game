import React, { useState, useEffect } from 'react';
import { PurchasablePiece, UpgradeDefinition, PieceType } from '../types';
import { socketService } from '../services/socketService';
import './CompactStore.css';

interface CompactStoreProps {
  playerTeam: 'white' | 'black';
  economy: { white: number; black: number };
  matchId: string;
  purchasablePieces?: PurchasablePiece[];
  onPurchaseUpgrade?: (upgradeId: string) => void;
  onPurchaseModifier?: (modifierId: string) => void;
  onPurchasePiece?: (pieceType: PieceType) => void;
}

interface Modifier {
  id: string;
  name: string;
  description: string;
  cost: number;
  canPurchase: boolean;
}

type TabType = 'pieces' | 'upgrades' | 'modifiers';

const CompactStore: React.FC<CompactStoreProps> = ({ 
  playerTeam, 
  economy,
  matchId,
  purchasablePieces = [],
  onPurchaseUpgrade,
  onPurchaseModifier,
  onPurchasePiece
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pieces');
  const [upgrades, setUpgrades] = useState<UpgradeDefinition[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const playerBalance = economy[playerTeam];

  useEffect(() => {
    fetchStoreData();
  }, []);

  // Update pieces when purchasablePieces prop changes
  useEffect(() => {
    console.log('CompactStore received new purchasablePieces:', purchasablePieces);
  }, [purchasablePieces]);

  const fetchStoreData = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Fetch upgrades
    socket.emit('get_available_upgrades');
    socket.once('available_upgrades', (data: any) => {
      setUpgrades(data.upgrades || []);
    });

    // Fetch modifiers
    socket.emit('get_modifiers');
    socket.once('available_modifiers', (data: any) => {
      setModifiers(data.modifiers || []);
    });
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'pieces':
        return purchasablePieces;
      case 'upgrades':
        return upgrades;
      case 'modifiers':
        return modifiers;
      default:
        return [];
    }
  };

  const handlePurchasePiece = (piece: PurchasablePiece) => {
    if (playerBalance >= piece.price) {
      if (onPurchasePiece) {
        onPurchasePiece(piece.type);
      } else {
        // Fallback to direct socket call if no callback provided
        setIsLoading(true);
        const socket = socketService.getSocket();
        if (socket) {
          socket.emit('purchase_piece', { 
            matchId: matchId,
            pieceType: piece.type 
          });
          socket.once('piece_purchased', () => {
            setIsLoading(false);
            fetchStoreData(); // Refresh store data
          });
          socket.once('purchase_error', () => {
            setIsLoading(false);
          });
        }
      }
    }
  };

  const handlePurchaseUpgrade = (upgradeId: string) => {
    if (onPurchaseUpgrade) {
      onPurchaseUpgrade(upgradeId);
      // Refresh store data after purchase
      setTimeout(fetchStoreData, 500);
    }
  };

  const handlePurchaseModifier = (modifierId: string) => {
    if (onPurchaseModifier) {
      onPurchaseModifier(modifierId);
      // Refresh store data after purchase
      setTimeout(fetchStoreData, 500);
    }
  };

  const formatDescription = (desc: string) => {
    // Truncate long descriptions for compact view
    return desc.length > 60 ? desc.substring(0, 57) + '...' : desc;
  };

  const renderPieceItem = (piece: PurchasablePiece) => {
    const canAfford = playerBalance >= piece.price;
    const isUnlocked = piece.isUnlocked || piece.isAvailable;
    const pieceSymbols: { [key: string]: string } = {
      pawn: '♟',
      knight: '♞',
      bishop: '♝',
      rook: '♜',
      queen: '♛',
      king: '♚'
    };

    return (
      <div key={piece.type} className={`compact-store-item ${!isUnlocked ? 'unavailable' : ''}`}>
        <div className="item-header">
          <span className="item-icon">{pieceSymbols[piece.type]}</span>
          <span className="item-name">{piece.name}</span>
          <span className="item-cost">₿{piece.price}</span>
        </div>
        {piece.hasDiscount && (
          <div className="item-discount">
            <span className="original-price">₿{piece.originalPrice}</span>
            <span className="discount-badge">Zone C</span>
          </div>
        )}
        {isUnlocked ? (
          <button
            className={`buy-button ${!canAfford ? 'disabled' : ''}`}
            onClick={() => handlePurchasePiece(piece)}
            disabled={!canAfford || isLoading}
          >
            {canAfford ? 'Buy' : 'Can\'t afford'}
          </button>
        ) : (
          <div className="unlock-requirement">
            <span className="unlock-text">Capture a {piece.name} to unlock</span>
          </div>
        )}
      </div>
    );
  };

  const renderUpgradeItem = (upgrade: UpgradeDefinition) => {
    const canAfford = playerBalance >= upgrade.cost;
    
    return (
      <div key={upgrade.id} className="compact-store-item">
        <div className="item-header">
          <span className="item-name">{upgrade.name}</span>
          <span className="item-cost">₿{upgrade.cost}</span>
        </div>
        <div className="item-desc">{formatDescription(upgrade.description)}</div>
        <button
          className={`buy-button ${!canAfford ? 'disabled' : ''}`}
          onClick={() => handlePurchaseUpgrade(upgrade.id)}
          disabled={!canAfford || isLoading}
        >
          {canAfford ? 'Buy' : 'Can\'t afford'}
        </button>
      </div>
    );
  };

  const renderModifierItem = (modifier: Modifier) => {
    const canAfford = modifier.canPurchase && playerBalance >= modifier.cost;
    
    return (
      <div key={modifier.id} className="compact-store-item">
        <div className="item-header">
          <span className="item-name">{modifier.name}</span>
          <span className="item-cost">₿{modifier.cost}</span>
        </div>
        <div className="item-desc">{formatDescription(modifier.description)}</div>
        <button
          className={`buy-button ${!canAfford ? 'disabled' : ''}`}
          onClick={() => handlePurchaseModifier(modifier.id)}
          disabled={!canAfford || isLoading}
        >
          {canAfford ? 'Buy' : 'Can\'t afford'}
        </button>
      </div>
    );
  };

  const renderItem = (item: any) => {
    switch (activeTab) {
      case 'pieces':
        return renderPieceItem(item as PurchasablePiece);
      case 'upgrades':
        return renderUpgradeItem(item as UpgradeDefinition);
      case 'modifiers':
        return renderModifierItem(item as Modifier);
    }
  };

  const currentItems = getCurrentItems();

  return (
    <div className="compact-store">
      <div className="store-tabs">
        <button
          className={`tab-button ${activeTab === 'pieces' ? 'active' : ''}`}
          onClick={() => setActiveTab('pieces')}
        >
          Pieces
        </button>
        <button
          className={`tab-button ${activeTab === 'upgrades' ? 'active' : ''}`}
          onClick={() => setActiveTab('upgrades')}
        >
          Upgrades
        </button>
        <button
          className={`tab-button ${activeTab === 'modifiers' ? 'active' : ''}`}
          onClick={() => setActiveTab('modifiers')}
        >
          Modifiers
        </button>
      </div>

      <div className="store-items">
        {currentItems.length > 0 ? (
          currentItems.map(item => renderItem(item))
        ) : (
          <div className="no-items">No items available</div>
        )}
      </div>
    </div>
  );
};

export default CompactStore;