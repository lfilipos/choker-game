import React from 'react';
import { ControlZoneStatus } from '../types';
import './ControlZoneStatus.css';

interface ControlZoneStatusProps {
  controlZoneStatuses: ControlZoneStatus[];
}

export const ControlZoneStatusComponent: React.FC<ControlZoneStatusProps> = ({ controlZoneStatuses }) => {
  const getControlStatusText = (status: ControlZoneStatus): string => {
    if (status.controlledBy === 'neutral') {
      return 'Neutral';
    }
    return `Controlled by ${status.controlledBy.charAt(0).toUpperCase() + status.controlledBy.slice(1)}`;
  };

  const getControlStatusClass = (controlledBy: string): string => {
    return `control-status ${controlledBy}`;
  };

  return (
    <div className="control-zone-status-panel">
      <h3>Control Zone Status</h3>
      {controlZoneStatuses.map((status) => (
        <div key={status.zone.id} className="control-zone-item">
          <div className="zone-header">
            <div 
              className="zone-color-indicator" 
              style={{ backgroundColor: status.zone.color }}
            ></div>
            <h4>{status.zone.name}</h4>
          </div>
          
          <div className="zone-details">
            <div className="piece-counts">
              <div className="piece-count white">
                <span className="piece-icon">♔</span>
                <span>White: {status.whitePieces}</span>
              </div>
              <div className="piece-count black">
                <span className="piece-icon">♚</span>
                <span>Black: {status.blackPieces}</span>
              </div>
            </div>
            
            <div className={getControlStatusClass(status.controlledBy)}>
              {getControlStatusText(status)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};