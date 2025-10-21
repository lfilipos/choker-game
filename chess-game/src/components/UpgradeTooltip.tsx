import React from 'react';
import { UpgradeProgress } from '../utils/upgradeProgress';
import './UpgradeTooltip.css';

interface UpgradeTooltipProps {
  progress: UpgradeProgress;
  position: { x: number; y: number };
}

const UpgradeTooltip: React.FC<UpgradeTooltipProps> = ({ progress, position }) => {
  const { upgrade, requirements } = progress;

  return (
    <div 
      className="upgrade-tooltip" 
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px` 
      }}
    >
      <div className="tooltip-header">
        <h4 className="tooltip-title">{upgrade.name}</h4>
        {upgrade.level && <span className="tooltip-level">Lv.{upgrade.level}</span>}
      </div>
      
      <p className="tooltip-description">{upgrade.description}</p>
      
      {upgrade.effects && upgrade.effects.length > 0 && (
        <div className="tooltip-effects">
          {upgrade.effects.map((effect, idx) => (
            <div key={idx} className={`tooltip-effect ${effect.type}`}>
              <span className="effect-type">{effect.type}</span>
              <span className="effect-desc">{effect.description}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="tooltip-cost">
        <span className="currency-symbol">₿</span>
        <span className="cost-amount">{upgrade.cost}</span>
      </div>
      
      {requirements.length > 0 && (
        <div className="tooltip-requirements">
          <div className="requirements-header">Requirements:</div>
          {requirements.map((req, idx) => (
            <div key={idx} className={`requirement-item ${req.met ? 'met' : 'unmet'}`}>
              <span className="requirement-icon">{req.met ? '✓' : '○'}</span>
              <span className="requirement-text">
                {req.description} {!req.met && req.required > 1 && `(${req.current}/${req.required})`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpgradeTooltip;


