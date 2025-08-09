import React from 'react';
import { ControlZoneStatus } from '../types';
import './EnhancedControlZones.css';

interface PokerEffect {
  id: string;
  name: string;
  description: string;
  type: string;
  icon?: string;
}

interface EnhancedControlZonesProps {
  controlZoneStatuses: ControlZoneStatus[];
  pokerEffects?: Record<string, PokerEffect>;
}

// Fallback effects for display
const DEFAULT_ZONE_EFFECTS: Record<string, string> = {
  'A': 'Zone A Poker Effect',
  'B': 'Zone B Poker Effect',
  'C': 'Zone C Poker Effect'
};

export const EnhancedControlZones: React.FC<EnhancedControlZonesProps> = ({ controlZoneStatuses, pokerEffects }) => {
  const getZoneClass = (status: ControlZoneStatus): string => {
    if (status.controlledBy === 'white') return 'zone-white';
    if (status.controlledBy === 'black') return 'zone-black';
    return 'zone-neutral';
  };

  return (
    <div className="enhanced-control-zones">
      {controlZoneStatuses.map((status, index) => {
        const zoneId = status.zone.id;
        const effectObj = pokerEffects?.[zoneId];
        const effectText = effectObj ? effectObj.description : DEFAULT_ZONE_EFFECTS[zoneId];
        const effectIcon = effectObj?.icon || '';
        
        return (
          <div key={index} className={`control-zone-item ${getZoneClass(status)}`}>
            <div className="zone-header">
              <span className="zone-name">Control Zone {zoneId}</span>
              <span className="zone-status">{status.controlledBy === 'neutral' ? 'Neutral' : status.controlledBy.charAt(0).toUpperCase() + status.controlledBy.slice(1)}</span>
            </div>
            <div className="zone-effect">
              {effectIcon && <span className="effect-icon">{effectIcon}</span>}
              <span className="effect-text">{effectText}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};