# Movement Mechanics - Tiered Upgrade System

This directory contains the new movement mechanics components for the tiered upgrade system, implementing enhanced piece movement capabilities based on upgrade tiers.

## Overview

The movement mechanics system provides enhanced movement options for chess pieces based on their upgrade tier level. Each piece type can gain new movement abilities through the upgrade system, making the game more strategic and engaging.

## Components

### 1. MovementMechanics (Main Container)
- **File**: `MovementMechanics.tsx`
- **Purpose**: Main container component that determines which movement mechanic to display based on the selected piece and its upgrades
- **Features**:
  - Automatically detects applicable movement mechanics
  - Manages state for different movement types
  - Provides unified interface for all movement mechanics
  - **Priority System**: Simple → Medium → Complex mechanics

### 2. Simple Mechanics (Phase 3.1 - COMPLETE ✅)
#### DualMoveSelector
- **File**: `DualMoveSelector.tsx`
- **Purpose**: Allows players to move two pawns in one turn (Tier 3 upgrade)
- **Features**:
  - Pawn selection interface
  - Destination selection for both pawns
  - Validation and confirmation system

#### KnightAdjacentMovement
- **File**: `KnightAdjacentMovement.tsx`
- **Purpose**: Enables knights to move to adjacent squares (Tier 1 upgrade)
- **Features**:
  - Adjacent square highlighting
  - Movement confirmation
  - Visual feedback for available moves

#### BishopOrthogonalMovement
- **File**: `BishopOrthogonalMovement.tsx`
- **Purpose**: Allows bishops to move horizontally and vertically (Tier 1 upgrade)
- **Features**:
  - Movement type selection (diagonal vs. orthogonal)
  - Dynamic square filtering
  - Enhanced movement visualization

### 3. Medium Complexity Mechanics (Phase 3.2 - COMPLETE ✅)
#### RookProtectionMechanics
- **File**: `RookProtectionMechanics.tsx`
- **Purpose**: Advanced protection and control capabilities for rooks (Tier 2+ upgrade)
- **Features**:
  - **Defensive Protection**: Select squares to protect from enemy attacks
  - **Offensive Control**: Select squares to control and restrict enemy movement
  - Multi-square selection system
  - Protection mode switching

#### QueenExtendedMovement
- **File**: `QueenExtendedMovement.tsx`
- **Purpose**: Enhanced movement patterns for queens (Tier 2+ upgrade)
- **Features**:
  - **Standard Movement**: Traditional queen movement (diagonal + orthogonal)
  - **Extended Movement**: Enhanced range with greater reach
  - **Jump Movement**: Jump over pieces to reach distant squares
  - Jump path selection and visualization

#### KingEnhancedMovement
- **File**: `KingEnhancedMovement.tsx`
- **Purpose**: Royal abilities and strategic movement for kings (Tier 2+ upgrade)
- **Features**:
  - **Standard Movement**: One square in any direction
  - **Enhanced Movement**: Extended range with special abilities
  - **Teleport Movement**: Move to any valid square on the board
  - **Command Movement**: Command other pieces to move in your stead
  - Special ability selection (Shield, Rally, Inspire, etc.)

## Upgrade Requirements

### Simple Mechanics (Tier 1-3)
- **Pawn - Dual Movement (Tier 3)**
  - **Requirement**: Capture 3 pawns
  - **Effect**: Can move two pawns in one turn
  - **Usage**: Select two pawns and their destinations

- **Knight - Adjacent Movement (Tier 1)**
  - **Requirement**: Capture 1 knight
  - **Effect**: Can move to adjacent squares (in addition to L-shaped moves)
  - **Usage**: Select any adjacent square for movement

- **Bishop - Orthogonal Movement (Tier 1)**
  - **Requirement**: Capture 1 bishop
  - **Effect**: Can move horizontally and vertically (in addition to diagonal moves)
  - **Usage**: Choose between diagonal or orthogonal movement, then select destination

### Medium Complexity Mechanics (Tier 2+)
- **Rook - Protection Mechanics (Tier 2)**
  - **Requirement**: Capture 2 rooks
  - **Effect**: Can protect squares and control enemy movement
  - **Usage**: Choose protection mode and select squares to protect/control

- **Queen - Extended Movement (Tier 2)**
  - **Requirement**: Capture 2 queens
  - **Effect**: Enhanced movement patterns including jumping over pieces
  - **Usage**: Select movement type and destination, with jump path selection

- **King - Enhanced Movement (Tier 2)**
  - **Requirement**: Capture 2 kings
  - **Effect**: Multiple movement types with special abilities
  - **Usage**: Choose movement type, special ability, and destination

## Implementation Details

### State Management
Each component manages its own state for:
- Selected pieces/squares
- Movement type selection
- Protection mode selection
- Special ability selection
- Confirmation status

### Event Handling
- `onMoveComplete`: Called when movement is confirmed
- `onProtectionComplete`: Called when protection is confirmed
- `onCancel`: Called when movement is cancelled
- Proper cleanup and state reset on completion

### Priority System
The MovementMechanics container implements a priority system:
1. **Simple Mechanics** (Tier 1-3): Pawn Dual, Knight Adjacent, Bishop Orthogonal
2. **Medium Complexity** (Tier 2+): Rook Protection, Queen Extended, King Enhanced
3. **Future**: Complex Mechanics (Tier 3+)

### Responsive Design
- Mobile-first approach
- Adaptive grid layouts
- Touch-friendly interface elements
- Responsive button arrangements

## Usage

### Basic Integration
```tsx
import { MovementMechanics } from './movement';

<MovementMechanics
  selectedPiece={selectedPiece}
  piecePosition={piecePosition}
  upgrades={playerUpgrades}
  board={gameBoard}
  onMoveComplete={handleMoveComplete}
  onCancel={handleCancel}
/>
```

### Standalone Components
```tsx
import { RookProtectionMechanics } from './movement';

<RookProtectionMechanics
  piece={rookPiece}
  upgrades={rookUpgrades}
  protectedSquares={availableSquares}
  onProtectionComplete={handleProtection}
  onCancel={handleCancel}
/>
```

## Styling

The components use a consistent dark theme with:
- **Primary Color**: #4CAF50 (Green)
- **Secondary Color**: #2196F3 (Blue)
- **Accent Color**: #9C27B0 (Purple)
- **Warning Color**: #FF9800 (Orange)
- **Background**: #1a1a1a (Dark)
- **Borders**: #444 (Medium Gray)

### CSS Classes
- `.movement-mechanics`: Base container styling
- `.selector-header`: Header section styling
- `.selection-section`: Selection area styling
- `.selector-actions`: Action button styling
- `.selected-summary`: Summary display styling
- `.protection-mode-selector`: Protection mode selection
- `.special-ability-selector`: Special ability selection
- `.jump-selection-info`: Jump path selection display

## Testing

Comprehensive test coverage includes:
- Component rendering tests
- Upgrade requirement validation
- State management tests
- User interaction tests
- Edge case handling
- **Total Tests**: 14 tests covering all mechanics

Run tests with:
```bash
npm test -- --testPathPattern=MovementMechanics.test.tsx
```

## Phase Status

### ✅ Phase 3.1: Simple Mechanics - COMPLETE
- Pawn Dual Movement
- Knight Adjacent Movement  
- Bishop Orthogonal Movement

### ✅ Phase 3.2: Medium Complexity Mechanics - COMPLETE
- Rook Protection Mechanics
- Queen Extended Movement
- King Enhanced Movement

### 🔄 Phase 3.3: Complex Mechanics - PENDING
- Rook Linking
- Knight Double Move
- Queen Advanced Mechanics
- King Piece Manipulation

## Future Enhancements

### Complex Mechanics (Phase 3.3)
- **Rook Linking**: Connect multiple rooks for coordinated attacks
- **Knight Double Move**: Move twice in one turn
- **Queen Advanced Mechanics**: Time-based abilities and special powers
- **King Piece Manipulation**: Control and move other pieces

### Integration Features (Phase 4)
- In-game upgrade indicators
- Visual feedback systems
- Animation and effects
- Sound integration

## Dependencies

- React 18+
- TypeScript 4.5+
- React Testing Library
- Custom CSS for styling

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+)
- Mobile browsers (iOS Safari 14+, Chrome Mobile 90+)
- Responsive design for all screen sizes

## Performance Considerations

- Efficient square calculation algorithms
- Optimized rendering for large boards
- Minimal re-renders through proper state management
- Lazy loading of complex mechanics
