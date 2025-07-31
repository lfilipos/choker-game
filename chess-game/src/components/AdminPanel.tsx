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