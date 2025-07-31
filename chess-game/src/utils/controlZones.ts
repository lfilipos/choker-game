import { ControlZone, Position, Board, PieceColor, ControlZoneStatus } from '../types';

// Convert algebraic notation to position coordinates
const algebraicToPosition = (algebraic: string): Position => {
  const col = algebraic.charCodeAt(0) - 97; // 'a' = 0, 'b' = 1, etc.
  const row = 10 - parseInt(algebraic.slice(1)); // '10' = 0, '9' = 1, etc.
  return { row, col };
};

export const createControlZones = (): ControlZone[] => {
  return [
    {
      id: 'A',
      name: 'Control Zone A',
      color: '#3498db', // Blue
      squares: [
        algebraicToPosition('b5'),
        algebraicToPosition('b6'),
        algebraicToPosition('c5'),
        algebraicToPosition('c6')
      ]
    },
    {
      id: 'B',
      name: 'Control Zone B',
      color: '#e74c3c', // Red
      squares: [
        algebraicToPosition('h5'),
        algebraicToPosition('h6'),
        algebraicToPosition('i5'),
        algebraicToPosition('i6')
      ]
    },
    {
      id: 'C',
      name: 'Control Zone C',
      color: '#27ae60', // Green
      squares: [
        algebraicToPosition('n5'),
        algebraicToPosition('n6'),
        algebraicToPosition('o5'),
        algebraicToPosition('o6')
      ]
    }
  ];
};

export const isSquareInControlZone = (position: Position, controlZones: ControlZone[]): ControlZone | null => {
  for (const zone of controlZones) {
    if (zone.squares.some(square => square.row === position.row && square.col === position.col)) {
      return zone;
    }
  }
  return null;
};

export const calculateControlZoneStatus = (board: Board, controlZone: ControlZone): ControlZoneStatus => {
  let whitePieces = 0;
  let blackPieces = 0;

  // Count pieces in each square of the control zone
  controlZone.squares.forEach(square => {
    const piece = board[square.row][square.col];
    if (piece) {
      if (piece.color === 'white') {
        whitePieces++;
      } else if (piece.color === 'black') {
        blackPieces++;
      }
    }
  });

  // Determine who controls the zone
  let controlledBy: PieceColor | 'neutral';
  if (whitePieces > blackPieces) {
    controlledBy = 'white';
  } else if (blackPieces > whitePieces) {
    controlledBy = 'black';
  } else {
    controlledBy = 'neutral';
  }

  return {
    zone: controlZone,
    whitePieces,
    blackPieces,
    controlledBy
  };
};

export const calculateAllControlZoneStatuses = (board: Board, controlZones: ControlZone[]): ControlZoneStatus[] => {
  return controlZones.map(zone => calculateControlZoneStatus(board, zone));
};