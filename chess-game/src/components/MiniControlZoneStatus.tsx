import React from 'react';
import { ControlZoneStatus } from '../types';
import './MiniControlZoneStatus.css';

interface MiniControlZoneStatusProps {
  controlZoneStatuses: ControlZoneStatus[];
}

const MiniControlZoneStatus: React.FC<MiniControlZoneStatusProps> = ({ controlZoneStatuses }) => {
  const getZoneColor = (zoneId: string): string => {
    switch(zoneId) {
      case 'A': return '#2196F3';
      case 'B': return '#F44336';
      case 'C': return '#4CAF50';
      default: return '#999';
    }
  };

  const getControllerSymbol = (controller: string): string => {
    switch(controller) {
      case 'white': return '○';
      case 'black': return '●';
      default: return '◐';
    }
  };

  return (
    <div className="mini-control-zone-status">
      <h4>Control Zones</h4>
      <div className="mini-zone-list">
        {controlZoneStatuses.map((status) => (
          <div 
            key={status.zone.id} 
            className={`mini-zone-item ${status.controlledBy}`}
            style={{ borderColor: getZoneColor(status.zone.id) }}
          >
            <div className="mini-zone-header">
              <span className="mini-zone-id" style={{ color: getZoneColor(status.zone.id) }}>
                Zone {status.zone.id}
              </span>
              <span className="mini-zone-controller">
                {getControllerSymbol(status.controlledBy)}
              </span>
            </div>
            <div className="mini-zone-count">
              <span className="mini-count white">○ {status.whitePieces}</span>
              <span className="mini-count black">● {status.blackPieces}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniControlZoneStatus;