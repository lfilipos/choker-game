import React from 'react';
import { ControlZoneStatus } from '../types';
import './EnhancedControlZones.css';

interface EnhancedControlZonesProps {
  controlZoneStatuses: ControlZoneStatus[];
}

const ZONE_EFFECTS: Record<string, string> = {
  'A': 'En Passant+ & Piercing Gaze',
  'B': 'Royal Aura Protection',
  'C': 'En Passant+ & Piercing Gaze'
};

export const EnhancedControlZones: React.FC<EnhancedControlZonesProps> = ({ controlZoneStatuses }) => {
  const getZoneClass = (status: ControlZoneStatus): string => {
    if (status.controlledBy === 'white') return 'zone-white';
    if (status.controlledBy === 'black') return 'zone-black';
    return 'zone-neutral';
  };

  return (
    <div className="enhanced-control-zones">
      {controlZoneStatuses.map((status, index) => {
        const zoneId = status.zone.id;
        const effect = ZONE_EFFECTS[zoneId] || '';
        
        return (
          <div key={index} className={`control-zone-item ${getZoneClass(status)}`}>
            <div className="zone-header">
              <span className="zone-name">Control Zone {zoneId}</span>
              <span className="zone-status">{status.controlledBy === 'neutral' ? 'Neutral' : status.controlledBy.charAt(0).toUpperCase() + status.controlledBy.slice(1)}</span>
            </div>
            <div className="zone-effect">Effect: {effect}</div>
          </div>
        );
      })}
    </div>
  );
};