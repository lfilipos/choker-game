import React, { useState } from 'react';
import { PieceColor, PieceType } from '../types';
import { UpgradeState, TeamEconomy } from '../types/upgrades';
import './AdminPanel.css';

interface AdminPanelProps {
  economy: TeamEconomy;
  upgrades: UpgradeState;
  onUpdateEconomy: (color: PieceColor, amount: number) => void;
  onToggleUpgrade: (color: PieceColor, pieceType: PieceType, upgradeId: string) => void;
  onResetUpgrades: (color: PieceColor) => void;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
}

const pieceTypes: PieceType[] = ['pawn', 'knight', 'bishop', 'rook', 'queen', 'king'];

const availableUpgradeIds: Record<PieceType, string[]> = {
  pawn: ['pawn_speed_boost', 'pawn_diagonal_range', 'pawn_en_passant_plus'],
  knight: ['knight_extended_leap', 'knight_double_jump'],
  bishop: ['bishop_color_break', 'bishop_piercing'],
  rook: ['rook_castle_anywhere', 'rook_siege_mode'],
  queen: ['queen_aura'],
  king: ['king_double_step', 'king_swap', 'king_royal_command']
};

const AdminPanel: React.FC<AdminPanelProps> = ({
  economy,
  upgrades,
  onUpdateEconomy,
  onToggleUpgrade,
  onResetUpgrades,
  isAdminMode,
  onToggleAdminMode
}) => {
  const [selectedTeam, setSelectedTeam] = useState<PieceColor>('white');
  const [moneyAmount, setMoneyAmount] = useState<string>('100');
  const [selectedPieceType, setSelectedPieceType] = useState<PieceType>('pawn');
  const [selectedUpgradeId, setSelectedUpgradeId] = useState<string>('');

  const handleAddMoney = () => {
    const amount = parseInt(moneyAmount) || 0;
    if (amount > 0) {
      onUpdateEconomy(selectedTeam, economy[selectedTeam] + amount);
    }
  };

  const handleSubtractMoney = () => {
    const amount = parseInt(moneyAmount) || 0;
    if (amount > 0) {
      onUpdateEconomy(selectedTeam, Math.max(0, economy[selectedTeam] - amount));
    }
  };

  const handleSetMoney = () => {
    const amount = parseInt(moneyAmount) || 0;
    if (amount >= 0) {
      onUpdateEconomy(selectedTeam, amount);
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h2>Admin Panel</h2>
        <button 
          className={`admin-toggle ${isAdminMode ? 'active' : ''}`}
          onClick={onToggleAdminMode}
        >
          {isAdminMode ? '🔓 Admin Mode ON' : '🔒 Admin Mode OFF'}
        </button>
      </div>

      {isAdminMode && (
        <>
          <div className="team-selector">
            <button
              className={selectedTeam === 'white' ? 'active' : ''}
              onClick={() => setSelectedTeam('white')}
            >
              ⚪ White Team
            </button>
            <button
              className={selectedTeam === 'black' ? 'active' : ''}
              onClick={() => setSelectedTeam('black')}
            >
              ⚫ Black Team
            </button>
          </div>

          <div className="admin-section">
            <h3>Economy Management</h3>
            <div className="current-balance">
              Current Balance: <span className="balance-amount">💰 {economy[selectedTeam]}</span>
            </div>
            
            <div className="money-controls">
              <input
                type="number"
                value={moneyAmount}
                onChange={(e) => setMoneyAmount(e.target.value)}
                placeholder="Amount"
                min="0"
              />
              <button onClick={handleAddMoney} className="btn-add">
                + Add
              </button>
              <button onClick={handleSubtractMoney} className="btn-subtract">
                - Subtract
              </button>
              <button onClick={handleSetMoney} className="btn-set">
                = Set
              </button>
            </div>
          </div>

          <div className="admin-section">
            <h3>Upgrade Management</h3>
            
            <div className="upgrade-adder" style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
              <h4>Add Upgrade</h4>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <select 
                  value={selectedPieceType}
                  onChange={(e) => {
                    setSelectedPieceType(e.target.value as PieceType);
                    setSelectedUpgradeId('');
                  }}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc' }}
                >
                  {pieceTypes.map(pt => (
                    <option key={pt} value={pt}>
                      {pt.charAt(0).toUpperCase() + pt.slice(1)}
                    </option>
                  ))}
                </select>
                
                <select 
                  value={selectedUpgradeId}
                  onChange={(e) => setSelectedUpgradeId(e.target.value)}
                  style={{ padding: '5px', borderRadius: '4px', border: '1px solid #ccc', flex: 1 }}
                >
                  <option value="">Select upgrade...</option>
                  {availableUpgradeIds[selectedPieceType].map(upgradeId => (
                    <option key={upgradeId} value={upgradeId}>
                      {upgradeId.replace(/_/g, ' ')}
                    </option>
                  ))}
                </select>
                
                <button 
                  onClick={() => {
                    if (selectedUpgradeId) {
                      onToggleUpgrade(selectedTeam, selectedPieceType, selectedUpgradeId);
                    }
                  }}
                  disabled={!selectedUpgradeId}
                  className="btn-add"
                  style={{ padding: '5px 15px' }}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div className="upgrades-control">
              {pieceTypes.map(pieceType => (
                <div key={pieceType} className="piece-upgrades">
                  <h4>{pieceType.charAt(0).toUpperCase() + pieceType.slice(1)}</h4>
                  <div className="upgrade-list">
                    {upgrades[selectedTeam][pieceType]?.length > 0 ? (
                      upgrades[selectedTeam][pieceType].map(upgradeId => (
                        <div key={upgradeId} className="upgrade-item">
                          <span>{upgradeId.replace(/_/g, ' ')}</span>
                          <button
                            onClick={() => onToggleUpgrade(selectedTeam, pieceType, upgradeId)}
                            className="btn-remove"
                          >
                            ✖
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="no-upgrades">No upgrades</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            <button 
              onClick={() => onResetUpgrades(selectedTeam)}
              className="btn-reset"
            >
              🔄 Reset All Upgrades
            </button>
          </div>

          <div className="admin-section">
            <h3>Quick Actions</h3>
            <div className="quick-actions">
              <button onClick={() => onUpdateEconomy('white', 9999)} className="btn-quick">
                💰 Max White Money
              </button>
              <button onClick={() => onUpdateEconomy('black', 9999)} className="btn-quick">
                💰 Max Black Money
              </button>
              <button onClick={() => {
                onUpdateEconomy('white', 500);
                onUpdateEconomy('black', 500);
              }} className="btn-quick">
                🔄 Reset Economy
              </button>
              <button onClick={() => {
                onResetUpgrades('white');
                onResetUpgrades('black');
              }} className="btn-quick">
                🔄 Reset All Upgrades
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPanel;