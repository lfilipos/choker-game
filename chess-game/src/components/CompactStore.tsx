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
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType>('pawn');
  
  const playerBalance = economy[playerTeam];

  // Set up socket listeners on mount
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Listen for upgrades (use 'on' not 'once' to continue receiving updates)
    const handleUpgrades = (data: any) => {
      console.log('CompactStore received available_upgrades:', data.upgrades?.length || 0);
      setUpgrades(data.upgrades || []);
    };
    
    socket.on('available_upgrades', handleUpgrades);

    // Fetch initial data
    socket.emit('get_available_upgrades');
    socket.emit('get_modifiers');
    socket.once('available_modifiers', (data: any) => {
      setModifiers(data.modifiers || []);
    });
    
    // Cleanup listener on unmount
    return () => {
      socket.off('available_upgrades', handleUpgrades);
    };
  }, []);

  // Update pieces when purchasablePieces prop changes
  useEffect(() => {
    console.log('CompactStore received new purchasablePieces:', purchasablePieces);
  }, [purchasablePieces]);

  const fetchStoreData = () => {
    const socket = socketService.getSocket();
    if (!socket) return;

    // Fetch current upgrades and modifiers
    socket.emit('get_available_upgrades');
    socket.emit('get_modifiers');
  };

  const pieceSymbols: { [key in PieceType]: string } = {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚'
  };

  const getCurrentItems = () => {
    switch (activeTab) {
      case 'pieces':
        return purchasablePieces;
      case 'upgrades':
        // Filter upgrades by selected piece type
        return upgrades.filter(u => u.pieceType === selectedPieceType);
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
    const eligible = upgrade.eligible !== false;
    const canPurchase = canAfford && eligible;
    
    return (
      <div key={upgrade.id} className={`compact-store-item upgrade-item ${!eligible ? 'locked' : ''}`}>
        <div className="upgrade-item-header">
          <span className="item-name">
            {upgrade.name}
            {upgrade.level && <span className="item-level"> Lv.{upgrade.level}</span>}
          </span>
          <span className="item-cost">₿{upgrade.cost}</span>
          <button
            className={`buy-button ${!canPurchase ? 'disabled' : ''}`}
            onClick={() => handlePurchaseUpgrade(upgrade.id)}
            disabled={!canPurchase || isLoading}
          >
            {!eligible ? 'Locked' : canAfford ? 'Buy' : 'Can\'t afford'}
          </button>
        </div>
        <div className="item-desc">{formatDescription(upgrade.description)}</div>
        {!eligible && upgrade.lockedReasons && upgrade.lockedReasons.length > 0 && (
          <div className="item-requirements">
            {upgrade.lockedReasons.map((reason, idx) => (
              <div key={idx} className="requirement-text">🔒 {reason}</div>
            ))}
          </div>
        )}
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

      {activeTab === 'upgrades' && (
        <div className="piece-sub-tabs">
          {(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'] as PieceType[]).map(pieceType => (
            <button
              key={pieceType}
              className={`piece-sub-tab ${selectedPieceType === pieceType ? 'active' : ''}`}
              onClick={() => setSelectedPieceType(pieceType)}
            >
              {pieceSymbols[pieceType]}
            </button>
          ))}
        </div>
      )}

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