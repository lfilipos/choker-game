import React, { useState } from 'react';
import { PieceType, PieceColor, TeamUpgrades } from '../types';
import { UpgradeDefinition } from '../types/upgrades';
import { getPieceUpgradeProgress, UpgradeProgress } from '../utils/upgradeProgress';
import UpgradeTooltip from './UpgradeTooltip';
import './UpgradePathDisplay.css';

interface UpgradePathDisplayProps {
  whiteUpgrades: TeamUpgrades;
  blackUpgrades: TeamUpgrades;
  whiteEconomy: number;
  blackEconomy: number;
  whiteCaptureCount: Record<string, number>;
  blackCaptureCount: Record<string, number>;
  whiteTotalCaptures: number;
  blackTotalCaptures: number;
  availableUpgrades: UpgradeDefinition[];
  selectedPiece: { white: PieceType | null; black: PieceType | null };
  onPieceSelect: (team: PieceColor, pieceType: PieceType) => void;
}

const UpgradePathDisplay: React.FC<UpgradePathDisplayProps> = ({
  whiteUpgrades,
  blackUpgrades,
  whiteEconomy,
  blackEconomy,
  whiteCaptureCount,
  blackCaptureCount,
  whiteTotalCaptures,
  blackTotalCaptures,
  availableUpgrades,
  selectedPiece,
  onPieceSelect
}) => {
  const [hoveredUpgrade, setHoveredUpgrade] = useState<{
    progress: UpgradeProgress;
    position: { x: number; y: number };
  } | null>(null);

  const pieceTypes: PieceType[] = ['pawn', 'rook', 'knight', 'bishop', 'queen', 'king'];
  
  const pieceSymbols: Record<PieceType, string> = {
    pawn: '♟',
    knight: '♞',
    bishop: '♝',
    rook: '♜',
    queen: '♛',
    king: '♚'
  };

  const whiteStats = {
    economy: whiteEconomy,
    captureCount: whiteCaptureCount,
    totalCaptures: whiteTotalCaptures,
    upgrades: whiteUpgrades
  };

  const blackStats = {
    economy: blackEconomy,
    captureCount: blackCaptureCount,
    totalCaptures: blackTotalCaptures,
    upgrades: blackUpgrades
  };

  const calculateTooltipPosition = (event: React.MouseEvent): { x: number; y: number } => {
    const tooltipWidth = 350; // max-width from CSS
    const tooltipHeight = 300; // estimated typical height
    const offset = 10; // small offset from cursor
    const padding = 10; // padding from viewport edges
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = event.clientX + offset;
    let y = event.clientY + offset;
    
    // Check if tooltip would go off the right edge
    if (x + tooltipWidth > viewportWidth - padding) {
      // Position to the left of cursor instead (just a small offset)
      x = event.clientX - tooltipWidth - offset;
    }
    
    // Check if tooltip would go off the bottom edge
    if (y + tooltipHeight > viewportHeight - padding) {
      // Position above cursor instead (keep close to cursor)
      y = event.clientY - offset - 250; // Start just above cursor, tooltip grows upward
    }
    
    // Ensure tooltip doesn't go off the left edge
    if (x < padding) {
      x = padding;
    }
    
    // Ensure tooltip doesn't go off the top edge
    if (y < padding) {
      y = padding;
    }
    
    return { x, y };
  };

  const handlePipHover = (progress: UpgradeProgress, event: React.MouseEvent) => {
    const position = calculateTooltipPosition(event);
    setHoveredUpgrade({
      progress,
      position
    });
  };

  const handlePipLeave = () => {
    setHoveredUpgrade(null);
  };

  const renderPip = (progress: UpgradeProgress, team: PieceColor, level: number) => {
    const { state } = progress;
    
    return (
      <div
        key={`${team}-${progress.upgradeId}`}
        className={`upgrade-pip ${state} ${team}`}
        onMouseEnter={(e) => handlePipHover(progress, e)}
        onMouseLeave={handlePipLeave}
        onMouseMove={(e) => {
          if (hoveredUpgrade?.progress.upgradeId === progress.upgradeId) {
            const position = calculateTooltipPosition(e);
            setHoveredUpgrade({
              progress,
              position
            });
          }
        }}
      >
        <span className="pip-number">{level}</span>
        {state === 'partial' && (
          <div 
            className="pip-fill partial-fill" 
            style={{ width: `${progress.progress}%` }}
          />
        )}
        {state === 'ready' && <div className="pip-fill ready-fill" />}
        {state === 'completed' && <div className="pip-fill completed-fill" />}
      </div>
    );
  };

  const renderPieceRow = (pieceType: PieceType) => {
    const blackProgress = getPieceUpgradeProgress(pieceType, blackStats, availableUpgrades);
    const whiteProgress = getPieceUpgradeProgress(pieceType, whiteStats, availableUpgrades);

    return (
      <div key={pieceType} className="piece-upgrade-row">
        <div 
          className={`piece-icon ${selectedPiece.white === pieceType ? 'selected white' : ''} ${selectedPiece.black === pieceType ? 'selected black' : ''}`}
          onClick={() => {
            // Determine which team to toggle based on which is currently selected
            if (selectedPiece.white === pieceType) {
              onPieceSelect('white', pieceType);
            } else if (selectedPiece.black === pieceType) {
              onPieceSelect('black', pieceType);
            } else {
              // Default to white if neither selected (could be improved with player team context)
              onPieceSelect('white', pieceType);
            }
          }}
        >
          <span className="piece-symbol">{pieceSymbols[pieceType]}</span>
        </div>
        
        <div className="upgrade-paths">
          <div className="team-path black-path">
            {blackProgress.map((progress, idx) => renderPip(progress, 'black', idx + 1))}
          </div>
          <div className="team-path white-path">
            {whiteProgress.map((progress, idx) => renderPip(progress, 'white', idx + 1))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="upgrade-path-display">
      <div className="upgrade-path-list">
        {pieceTypes.map(pieceType => renderPieceRow(pieceType))}
      </div>
      {hoveredUpgrade && (
        <UpgradeTooltip
          progress={hoveredUpgrade.progress}
          position={hoveredUpgrade.position}
        />
      )}
    </div>
  );
};

export default UpgradePathDisplay;

