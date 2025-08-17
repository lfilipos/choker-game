# Piece Upgrade Overhaul - Product Requirements Document

## Executive Summary
This document outlines the requirements for implementing a comprehensive piece upgrade system overhaul that transforms the current flat upgrade structure into a tiered, progression-based system with specific unlock requirements and enhanced gameplay mechanics.

## Feature Overview
The piece upgrade system will be restructured from a flat "all upgrades available" model to a tiered progression system (Levels 1-3) where each level must be unlocked sequentially with specific game requirements. The upgrade store UI will be reorganized for better user experience, and all existing upgrades will be replaced with the new tiered system.

## Core Requirements

### 1. Upgrade System Architecture
- **Tiered Progression**: Implement Level 1, 2, and 3 upgrades for each piece type
- **Sequential Unlocking**: Higher level upgrades cannot be purchased without previous levels
- **Requirement-Based Access**: Each upgrade has specific game conditions that must be met
- **Cost Structure**: Each upgrade level has a defined cost in team treasury

### 2. Upgrade Store UI Redesign
- **Piece Type Selection**: Dropdown to select specific piece types for focused upgrade viewing
- **Upgrade Tiles**: Each upgrade displays summary description and unlock requirements
- **Purchase Status**: Visual indication of purchased vs. available upgrades
- **Requirement Display**: Clear visibility of what conditions must be met

### 3. In-Game Upgrade Indicators
- **Upgrade Badges**: Visual indicators on pieces showing their upgrade levels
- **Tooltip System**: Hover functionality to display upgrade details
- **Visual Feedback**: Clear indication of upgraded piece capabilities

## Detailed Piece Upgrade Specifications

### Pawns

#### Level 1 - Enhanced Movement
- **Summary**: Move two spaces on first move
- **Requirements**: Capture 1 pawn
- **Cost**: 250
- **Status**: Already implemented, no changes needed

#### Level 2 - Extended Capture Range
- **Summary**: Capture from two squares away
- **Requirements**: Purchase Level 1 + Capture 2 pawns
- **Cost**: 350
- **Status**: Already implemented, no changes needed

#### Level 3 - Dual Pawn Movement
- **Summary**: Move two pawns in one turn
- **Requirements**: Purchase Level 2 + Capture 2 pawns
- **Cost**: 350
- **New Functionality**:
  - Player can move one pawn, then optionally move a second pawn
  - Only pawns can use this dual-move capability
  - UI must allow player to choose between single or dual movement
  - Both pawns can capture according to their upgraded move sets
  - Second pawn movement is optional

### Rooks

#### Level 1 - Defensive Protection
- **Summary**: Defend piece behind it
- **Requirements**: Capture 1 rook
- **Cost**: 200
- **New Functionality**:
  - Friendly pawns directly behind rook cannot be captured
  - Protection only applies to pawns, not other pieces
  - Protection lost when pawn moves or rook relocates
  - UI must show blocked moves due to rook protection

#### Level 2 - Rook Linking
- **Summary**: Link with one other rook within 2 squares
- **Requirements**: Purchase Level 1 + Capture 2 rooks
- **Cost**: 400
- **New Functionality**:
  - Link two rooks within 2 squares (1 space between)
  - Creates impassable wall for enemy pieces (except knights)
  - Linking counts as player's move for the turn
  - Rook movement reduced to maximum 5 spaces
  - Wall breaks if rooks move more than 2 squares apart
  - UI indicators needed for wall visualization and linking

#### Level 3 - Extended Rook Linking
- **Summary**: Link with one other rook within 3 squares
- **Requirements**: Purchase Level 2 + Capture 3 rooks
- **Cost**: 600
- **New Functionality**:
  - Same as Level 2 but with 3-square linking range
  - Rook movement reduced to maximum 3 spaces

### Knights

#### Level 1 - Adjacent Movement
- **Summary**: Can move 1 square adjacent
- **Requirements**: Capture 1 knight
- **Cost**: 150
- **New Functionality**:
  - Knight gains ability to move 1 square in any adjacent direction
  - Normal knight movement pattern remains available

#### Level 2 - 3-2 Movement
- **Summary**: 3-2 move pattern
- **Requirements**: Purchase Level 1
- **Cost**: 250
- **Status**: Already implemented, no changes needed

#### Level 3 - Double Move
- **Summary**: Can make two moves in one turn
- **Requirements**: Purchase Level 2 + Capture 2 knights
- **Cost**: 350
- **New Functionality**:
  - After first move, knight can optionally make second move
  - UI must allow player to finalize position after first move
  - Second move is optional
  - First move position is final once placed
  - Cannot return to starting position unless using second move

### Bishops

#### Level 1 - Orthogonal Movement
- **Summary**: Sidestep 1 orthogonal
- **Requirements**: Capture 1 bishop
- **Cost**: 300
- **New Functionality**:
  - Bishop can move up, down, left, or right one square
  - Normal diagonal movement remains available

#### Level 2 - Cost Reduction
- **Summary**: Bishops are cheaper
- **Requirements**: Purchase Level 1 + Capture 2 bishops
- **Cost**: 450
- **New Functionality**:
  - Team's bishops receive 50% discount in shop

#### Level 3 - Movement Rewards
- **Summary**: Earn money for bishop movement
- **Requirements**: Purchase Level 2 + Capture 3 bishops
- **Cost**: 600
- **New Functionality**:
  - Track cumulative squares moved by all team bishops
  - Deposit 25 into team treasury for every 10 squares moved
  - Rewards given on player's turn

### Queen

#### Level 1 - Extended Movement
- **Summary**: Can move one space in any direction after normal move
- **Requirements**: Capture 5 pawns
- **Cost**: 300
- **New Functionality**:
  - After normal queen move, can optionally move 1 square in any direction
  - UI must show additional movement options after initial move
  - Player can choose to use or skip additional movement
  - Initial movement position is final once placed

#### Level 2 - Pawn Capture and Double Capture
- **Summary**: Can move through pawns and capture 2 pieces
- **Requirements**: Purchase Level 1 + Capture knight, rook, and bishop
- **Cost**: 500
- **New Functionality**:
  - Can move through one pawn (pawn is captured)
  - Can move one additional space after pawn capture
  - Can capture second piece with additional movement
  - Same UI flow as Level 1 for position finalization

#### Level 3 - Evasion Protection
- **Summary**: Pieces near queen attempt to evade capture
- **Requirements**: Purchase Level 2 + Capture another queen
- **Cost**: 750
- **New Functionality**:
  - Friendly pieces within 1 square of queen attempt to evade
  - When attacked, pieces move back 1 square if possible
  - If evasion fails, piece is captured normally
  - Protection lost when piece moves away from queen

### King

#### Level 1 - Extended Movement
- **Summary**: Can move 2 squares at a time
- **Requirements**: Team treasury has at least 750
- **Cost**: 250
- **New Functionality**:
  - King can move 2 squares in any direction instead of 1

#### Level 2 - Piece Manipulation
- **Summary**: Can move other pieces within 2 squares
- **Requirements**: Purchase Level 1 + Team treasury has at least 1000
- **Cost**: 350
- **New Functionality**:
  - Can move any piece (friendly or enemy) within 2 squares
  - Enemy pieces can only move to open squares
  - Friendly pieces can capture enemy pieces
  - Moving other pieces counts as king's move
  - UI must clearly show selection states and eligible moves

#### Level 3 - Castle Swapping
- **Summary**: Can swap places with friendly castles
- **Requirements**: Purchase Level 2 + Team treasury has at least 1250
- **Cost**: 450
- **New Functionality**:
  - Can swap positions with any friendly castle on board
  - Available castles should be highlighted when king is selected
  - Clicking castle initiates swap

## Technical Requirements

### Backend Changes
- Implement tiered upgrade system with sequential unlocking
- Add requirement validation logic for each upgrade level
- Update upgrade purchase flow to check prerequisites
- Implement new piece movement and interaction mechanics
- Add upgrade tracking and status management

### Frontend Changes
- Redesign upgrade store with piece type selection dropdown
- Implement upgrade tile system with requirement display
- Add upgrade badges and tooltips to pieces
- Create UI for new movement mechanics (dual moves, linking, etc.)
- Implement visual indicators for upgrade status

### Data Model Changes
- Update upgrade definitions to include tier levels
- Add requirement tracking for each upgrade
- Implement upgrade dependency relationships
- Add upgrade status tracking per player/team

## User Experience Requirements

### Upgrade Store
- Clear visual hierarchy showing upgrade progression
- Easy navigation between piece types
- Transparent requirement display
- Clear indication of purchase status

### In-Game Experience
- Intuitive upgrade badge system
- Helpful tooltips for upgrade information
- Smooth interaction with new movement mechanics
- Clear visual feedback for all new capabilities

## Success Criteria
- All existing upgrades are replaced with new tiered system
- Upgrade store provides clear progression path
- New mechanics are intuitive and enhance gameplay
- Performance impact is minimal
- All upgrade requirements are properly validated

## Dependencies
- Existing upgrade system must be refactored
- Game logic engine must support new movement patterns
- UI components must be updated for new interactions
- Backend validation must be implemented for all requirements

## Risk Considerations
- Complexity of new movement mechanics may impact game balance
- UI changes may require significant frontend refactoring
- New upgrade logic may introduce performance considerations
- Testing complexity increases with new interaction patterns

## Future Considerations
- Potential for additional upgrade tiers
- Balance adjustments based on gameplay data
- Additional piece types with upgrade systems
- Integration with other game systems (economy, achievements, etc.)
