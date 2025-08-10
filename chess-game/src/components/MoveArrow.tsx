import React from 'react';
import { Position } from '../types';
import './MoveArrow.css';

interface MoveArrowProps {
  from: Position;
  to: Position;
  pieceType: string;
}

export const MoveArrow: React.FC<MoveArrowProps> = ({ from, to, pieceType }) => {
  // Calculate the arrow path based on piece type
  const calculateArrowPath = () => {
    const squareSize = 60; // This should match the square size in CSS
    const halfSquare = squareSize / 2;
    
    // Calculate center positions of squares
    const fromX = from.col * squareSize + halfSquare;
    const fromY = from.row * squareSize + halfSquare;
    const toX = to.col * squareSize + halfSquare;
    const toY = to.row * squareSize + halfSquare;
    
    // For knights, create a two-segment path
    if (pieceType.toLowerCase() === 'knight') {
      // Determine the intermediate point for the L-shape
      const deltaX = to.col - from.col;
      const deltaY = to.row - from.row;
      
      let midX, midY;
      
      // Choose intermediate point based on which direction has larger movement
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Move horizontally first, then vertically
        midX = toX;
        midY = fromY;
      } else {
        // Move vertically first, then horizontally
        midX = fromX;
        midY = toY;
      }
      
      return { 
        type: 'knight',
        fromX, fromY, toX, toY, midX, midY
      };
    }
    
    // For other pieces, use a straight line
    return {
      type: 'straight',
      fromX, fromY, toX, toY
    };
  };
  
  const arrowData = calculateArrowPath();
  
  return (
    <svg className="move-arrow-overlay" viewBox="0 0 960 600">
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3, 0 6"
            fill="rgba(255, 215, 0, 0.8)"
          />
        </marker>
      </defs>
      
      {arrowData.type === 'knight' ? (
        <g>
          <line
            x1={arrowData.fromX}
            y1={arrowData.fromY}
            x2={arrowData.midX}
            y2={arrowData.midY}
            stroke="rgba(255, 215, 0, 0.6)"
            strokeWidth="3"
          />
          <line
            x1={arrowData.midX}
            y1={arrowData.midY}
            x2={arrowData.toX}
            y2={arrowData.toY}
            stroke="rgba(255, 215, 0, 0.6)"
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
          />
        </g>
      ) : (
        <line
          x1={arrowData.fromX}
          y1={arrowData.fromY}
          x2={arrowData.toX}
          y2={arrowData.toY}
          stroke="rgba(255, 215, 0, 0.6)"
          strokeWidth="3"
          markerEnd="url(#arrowhead)"
        />
      )}
    </svg>
  );
};