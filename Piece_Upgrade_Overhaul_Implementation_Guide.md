# **Piece Upgrade Overhaul - Implementation Documentation**

## **Overview**
This document outlines the implementation plan for transforming the current flat upgrade system into a tiered progression system (Levels 1-3) with sequential unlocking and requirement-based access. The system will be broken into logical checkpoints for testing and validation.

**Key Decisions:**
- **Cost Values:** Use specified costs (250-750) for initial implementation, adjust based on playtesting
- **Requirements:** Keep current difficulty levels, adjust based on playtesting feedback
- **UI Complexity:** Implement complex features one-by-one for iterative testing
- **Implementation Order:** Start with simplest mechanics (pawns, rooks) and progress to most complex
- **Backward Compatibility:** Remove old upgrade system entirely

---

## **Frontend Implementation Guide**

### **Phase 1: Core Data Model & Types (Checkpoint 1)**
**Files to modify:**
- `src/types/upgrades.ts`
- `src/types.ts` (add new interfaces)

**New TypeScript Interfaces:**
```typescript
export interface UpgradeRequirement {
  type: 'capture' | 'purchase' | 'treasury' | 'control_zone';
  pieceType?: PieceType;
  count?: number;
  amount?: number;
  zoneId?: string;
}

export interface TieredUpgradeDefinition {
  id: string;
  name: string;
  description: string;
  summary: string;
  cost: number;
  pieceType: PieceType;
  tier: 1 | 2 | 3;
  requirements: UpgradeRequirement[];
  effects: UpgradeEffect[];
  isPurchased?: boolean;
  isAvailable?: boolean;
}

export interface UpgradeProgress {
  pieceType: PieceType;
  tier1: boolean;
  tier2: boolean;
  tier3: boolean;
  captureCounts: Record<PieceType, number>;
}
```

**Tasks:**
1. Replace existing upgrade types with new tiered system
2. Add requirement tracking interfaces
3. Update component props to use new types
4. **Testing:** Verify TypeScript compilation and type safety

---

### **Phase 2: Upgrade Store UI Redesign (Checkpoint 2)**
**Files to modify:**
- `src/components/UpgradeStore.tsx`
- `src/components/UpgradeStore.css`

**New UI Components:**
```typescript
interface UpgradeStoreProps {
  upgrades: TieredUpgradeDefinition[];
  onPurchaseUpgrade: (upgradeId: string) => void;
  teamEconomy: number;
  upgradeProgress: UpgradeProgress;
}

// New sub-components:
- PieceTypeSelector (dropdown)
- UpgradeTile (individual upgrade display)
- RequirementDisplay (unlock conditions)
- PurchaseButton (with validation)
```

**UI Features:**
1. Piece type dropdown (Pawn, Rook, Knight, Bishop, Queen, King)
2. Tiered upgrade tiles showing:
   - Summary description
   - Unlock requirements
   - Cost and purchase status
   - Visual tier indicators
3. Responsive grid layout
4. Purchase confirmation dialogs

**Tasks:**
1. Create new upgrade store layout
2. Implement piece type filtering
3. Design upgrade tile components
4. Add requirement display logic
5. **Testing:** Verify UI renders correctly, dropdown works, tiles display properly

---

### **Phase 3: In-Game Upgrade Indicators (Checkpoint 3)**
**Files to modify:**
- `src/components/ChessPieceComponent.tsx`
- `src/components/ChessPieceComponent.css`

**New Features:**
1. **Upgrade Badges:** Visual indicators on pieces showing upgrade levels
2. **Tooltip System:** Hover to display upgrade details
3. **Visual Feedback:** Clear indication of upgraded piece capabilities

**Implementation:**
```typescript
interface ChessPieceComponentProps {
  piece: ChessPiece;
  upgrades: TieredUpgradeDefinition[];
  onPieceSelect: (position: Position) => void;
}

// New sub-components:
- UpgradeBadge (shows tier level)
- UpgradeTooltip (hover information)
- EnhancedPieceVisual (upgraded piece styling)
```

**Tasks:**
1. Add upgrade badges to pieces
2. Implement tooltip system
3. Create visual styling for upgraded pieces
4. **Testing:** Verify badges display correctly, tooltips work, styling is applied

---

### **Phase 4: New Movement Mechanics UI (Checkpoint 4)**
**Files to modify:**
- `src/components/ChessBoard.tsx`
- `src/components/ChessGame.tsx`

**New Movement Mechanics (Implementation Order by Complexity):**

#### **4.1 Simple Mechanics (Week 5-6)**
1. **Pawn Dual Movement:** UI for selecting second pawn
2. **Knight Adjacent Movement:** Additional movement patterns
3. **Bishop Orthogonal Movement:** Side-stepping capabilities

#### **4.2 Medium Complexity (Week 7-8)**
1. **Rook Protection:** Defensive mechanics for pawns behind rooks
2. **Queen Extended Movement:** Additional movement options
3. **King Enhanced Movement:** 2-square movement

#### **4.3 Complex Mechanics (Week 9-10)**
1. **Rook Linking:** Wall creation and visualization
2. **Knight Double Move:** Second move selection
3. **Queen Advanced Mechanics:** Pawn capture and evasion
4. **King Piece Manipulation:** Piece selection and movement

**UI Components:**
```typescript
interface MovementMechanicsProps {
  piece: ChessPiece;
  upgrades: TieredUpgradeDefinition[];
  onMoveComplete: (moves: Move[]) => void;
}

// New sub-components (implemented incrementally):
- DualMoveSelector (for pawns/knights)
- RookLinker (wall creation)
- ExtendedMoveOptions (queen/king)
- PieceManipulator (king upgrades)
```

**Tasks:**
1. Implement simple mechanics first (pawns, knights, bishops)
2. Add medium complexity mechanics (rook protection, queen/king basic)
3. Build complex mechanics last (rook linking, advanced queen/king)
4. **Testing:** Verify each mechanic works correctly before moving to next

---

## **Backend Implementation Guide**

### **Phase 1: Core Upgrade System (Checkpoint 1)**
**Files to modify:**
- `upgradeDefinitions.js`
- `types.js`
- `upgradeManager.js`

**New Backend Structures:**
```javascript
// New upgrade definitions with tiered system
const TIERED_UPGRADES = {
  pawn: {
    tier1: {
      id: 'pawn_tier1',
      name: 'Enhanced Movement',
      summary: 'Move two spaces on first move',
      requirements: [{ type: 'capture', pieceType: 'pawn', count: 1 }],
      cost: 250,
      tier: 1
    },
    tier2: {
      id: 'pawn_tier2',
      name: 'Extended Capture Range',
      summary: 'Capture from two squares away',
      requirements: [
        { type: 'purchase', upgradeId: 'pawn_tier1' },
        { type: 'capture', pieceType: 'pawn', count: 2 }
      ],
      cost: 350,
      tier: 2
    },
    tier3: {
      id: 'pawn_tier3',
      name: 'Dual Pawn Movement',
      summary: 'Move two pawns in one turn',
      requirements: [
        { type: 'purchase', upgradeId: 'pawn_tier2' },
        { type: 'capture', pieceType: 'pawn', count: 2 }
      ],
      cost: 350,
      tier: 3
    }
  },
  rook: {
    tier1: {
      id: 'rook_tier1',
      name: 'Defensive Protection',
      summary: 'Defend piece behind it',
      requirements: [{ type: 'capture', pieceType: 'rook', count: 1 }],
      cost: 200,
      tier: 1
    },
    tier2: {
      id: 'rook_tier2',
      name: 'Rook Linking',
      summary: 'Link with one other rook within 2 squares',
      requirements: [
        { type: 'purchase', upgradeId: 'rook_tier1' },
        { type: 'capture', pieceType: 'rook', count: 2 }
      ],
      cost: 400,
      tier: 2
    },
    tier3: {
      id: 'rook_tier3',
      name: 'Extended Rook Linking',
      summary: 'Link with one other rook within 3 squares',
      requirements: [
        { type: 'purchase', upgradeId: 'rook_tier2' },
        { type: 'capture', pieceType: 'rook', count: 3 }
      ],
      cost: 600,
      tier: 3
    }
  }
  // ... continue for all piece types
};

// Requirement validation system
class RequirementValidator {
  validateCaptureRequirement(matchState, pieceType, count) { /* ... */ }
  validatePurchaseRequirement(matchState, upgradeId) { /* ... */ }
  validateTreasuryRequirement(matchState, amount) { /* ... */ }
}
```

**Tasks:**
1. Replace existing upgrade definitions with tiered system
2. Implement requirement validation logic
3. Update upgrade purchase flow
4. **Testing:** Verify upgrade creation, requirement validation, purchase flow

---

### **Phase 2: Game Logic Updates (Checkpoint 2)**
**Files to modify:**
- `gameLogic.js`
- `upgradeLogic.js`

**New Game Mechanics (Implementation Order):**

#### **2.1 Simple Mechanics (Week 5-6)**
```javascript
class EnhancedGameLogic {
  // Pawn mechanics
  canMoveDualPawns(matchState, playerColor) { /* ... */ }
  executeDualPawnMove(matchState, moves) { /* ... */ }
  
  // Knight mechanics
  getKnightAdjacentMoves(position, board) { /* ... */ }
  
  // Bishop mechanics
  getBishopOrthogonalMoves(position, board) { /* ... */ }
}
```

#### **2.2 Medium Complexity (Week 7-8)**
```javascript
class EnhancedGameLogic {
  // Rook protection mechanics
  canPawnBeCaptured(position, board, rookPositions) { /* ... */ }
  
  // Queen extended movement
  getQueenExtendedMoves(position, board, upgrades) { /* ... */ }
  
  // King enhanced movement
  canKingMoveTwoSquares(matchState, playerColor) { /* ... */ }
}
```

#### **2.3 Complex Mechanics (Week 9-10)**
```javascript
class EnhancedGameLogic {
  // Rook linking mechanics
  canCreateRookLink(matchState, rook1, rook2) { /* ... */ }
  createRookWall(matchState, rook1, rook2) { /* ... */ }
  validateRookWallMovement(matchState, from, to) { /* ... */ }
  
  // Knight double move
  canKnightMoveTwice(matchState, knightPosition) { /* ... */ }
  executeKnightDoubleMove(matchState, moves) { /* ... */ }
  
  // Queen advanced mechanics
  canQueenCaptureThroughPawn(matchState, queenPosition, targetPosition) { /* ... */ }
  executeQueenAdvancedCapture(matchState, queenPosition, targetPosition) { /* ... */ }
  
  // King piece manipulation
  canKingManipulatePiece(matchState, kingPos, targetPos) { /* ... */ }
  executeKingPieceManipulation(matchState, kingPos, targetPos, direction) { /* ... */ }
}
```

**Tasks:**
1. Implement simple movement patterns first
2. Add medium complexity mechanics
3. Build complex mechanics last
4. **Testing:** Verify each mechanic works correctly before moving to next

---

### **Phase 3: State Management & Persistence (Checkpoint 3)**
**Files to modify:**
- `matchManager.js`
- `upgradeManager.js`

**New State Management:**
1. **Upgrade Progress Tracking:** Monitor player progression through tiers
2. **Requirement Monitoring:** Track capture counts and other conditions
3. **State Persistence:** Save upgrade status and progress

**Implementation:**
```javascript
class EnhancedUpgradeManager {
  constructor() {
    this.upgradeProgress = new Map(); // playerId -> UpgradeProgress
    this.requirementTrackers = new Map(); // matchId -> RequirementTracker
  }
  
  trackCapture(matchId, playerId, pieceType) { /* ... */ }
  checkUpgradeAvailability(matchId, playerId, upgradeId) { /* ... */ }
  purchaseUpgrade(matchId, playerId, upgradeId) { /* ... */ }
  getUpgradeProgress(matchId, playerId) { /* ... */ }
}

class RequirementTracker {
  constructor(matchId) {
    this.captureCounts = { white: {}, black: {} };
    this.purchasedUpgrades = { white: [], black: [] };
  }
  
  updateCaptureCount(team, pieceType) { /* ... */ }
  canPurchaseUpgrade(team, upgradeId) { /* ... */ }
}
```

**Tasks:**
1. Implement upgrade progress tracking
2. Add requirement monitoring
3. Update state persistence
4. **Testing:** Verify progress tracking, requirement monitoring, state persistence

---

## **QA Implementation Guide**

### **Phase 1: Core System Testing (Checkpoint 1)**
**Test Areas:**
1. **Type Safety:** Verify TypeScript compilation
2. **Data Model:** Test new upgrade structures
3. **Basic Functionality:** Ensure upgrade store loads

**Test Cases:**
```typescript
describe('Tiered Upgrade System', () => {
  test('should compile without TypeScript errors', () => { /* ... */ });
  test('should load upgrade definitions correctly', () => { /* ... */ });
  test('should validate upgrade requirements', () => { /* ... */ });
});
```

---

### **Phase 2: UI Component Testing (Checkpoint 2)**
**Test Areas:**
1. **Upgrade Store:** Verify new UI components work
2. **Piece Type Filtering:** Test dropdown functionality
3. **Upgrade Tiles:** Validate display and interaction

**Test Cases:**
```typescript
describe('Upgrade Store UI', () => {
  test('should display piece type dropdown', () => { /* ... */ });
  test('should filter upgrades by piece type', () => { /* ... */ });
  test('should show upgrade requirements', () => { /* ... */ });
  test('should handle purchase interactions', () => { /* ... */ });
});
```

---

### **Phase 3: Game Mechanics Testing (Checkpoint 3)**
**Test Areas:**
1. **Movement Patterns:** Test all new piece movements
2. **Upgrade Effects:** Verify upgrades modify gameplay
3. **Requirement Validation:** Test unlock conditions

**Test Cases (by Complexity):**
```typescript
describe('Simple Game Mechanics', () => {
  test('should allow dual pawn movement', () => { /* ... */ });
  test('should enable knight adjacent movement', () => { /* ... */ });
  test('should allow bishop orthogonal movement', () => { /* ... */ });
});

describe('Medium Complexity Mechanics', () => {
  test('should provide rook protection for pawns', () => { /* ... */ });
  test('should enable queen extended movement', () => { /* ... */ });
  test('should allow king enhanced movement', () => { /* ... */ });
});

describe('Complex Game Mechanics', () => {
  test('should create rook walls', () => { /* ... */ });
  test('should enable knight double movement', () => { /* ... */ });
  test('should allow queen advanced capture', () => { /* ... */ });
  test('should enable king piece manipulation', () => { /* ... */ });
});
```

---

### **Phase 4: Integration Testing (Checkpoint 4)**
**Test Areas:**
1. **End-to-End Flow:** Complete upgrade purchase and usage
2. **Multiplayer Synchronization:** Verify upgrades sync across players
3. **State Persistence:** Test upgrade progress saving

**Test Cases:**
```typescript
describe('Integration Tests', () => {
  test('should complete full upgrade cycle', () => { /* ... */ });
  test('should sync upgrades across players', () => { /* ... */ });
  test('should persist upgrade progress', () => { /* ... */ });
  test('should handle upgrade conflicts', () => { /* ... */ });
});
```

---

## **Agent Coordination & Development Strategy**

### **IMPORTANT: Sequential Development Required**
**All agents must complete their current checkpoint before moving to the next one. This ensures each phase builds on solid foundations and allows for proper testing at each stage.**

---

## **Development Checkpoints & Testing Strategy**

### **Phase 1: Backend Foundation (Week 1-2)**
**Agent:** Backend Agent Only
**Goal:** Establish new data model and types
**Deliverables:** Updated upgrade definitions, requirement validation, API endpoints
**Testing:** Backend logic validation, API testing
**Exit Criteria:** All backend APIs work correctly, upgrade system is functional
**Next Phase:** Frontend Agent can begin work

### **Phase 2: Frontend Foundation (Week 3-4)**
**Agent:** Frontend Agent Only (Backend Agent on standby for API adjustments)
**Goal:** New upgrade store interface
**Deliverables:** Piece type selector, upgrade tiles, requirement display
**Testing:** UI rendering, component interaction, backend integration
**Exit Criteria:** Upgrade store displays correctly, integrates with backend
**Next Phase:** All agents can work together

### **Phase 3: Core Mechanics (Week 5-7)**
**Agents:** Backend + Frontend + QA working together
**Goal:** Implement new movement patterns (Simple + Medium complexity)
**Deliverables:** Pawn, knight, bishop, rook protection, queen/king basic mechanics
**Testing:** Movement validation, upgrade effects, UI integration
**Exit Criteria:** All simple and medium complexity movements work correctly
**Next Phase:** Advanced mechanics development

### **Phase 4: Advanced Mechanics (Week 8-9)**
**Agents:** Backend + Frontend + QA working together
**Goal:** Implement complex movement patterns
**Deliverables:** Rook linking, knight double move, queen advanced, king manipulation
**Testing:** Complex movement validation, UI integration, performance
**Exit Criteria:** All complex mechanics work correctly
**Next Phase:** Final integration and polish

### **Phase 5: Integration & Polish (Week 10-11)**
**Agents:** All agents working together
**Goal:** Complete system integration and testing
**Deliverables:** Full upgrade system with UI and mechanics
**Testing:** End-to-end functionality, performance, multiplayer sync
**Exit Criteria:** Complete upgrade system works as specified

---

## **Agent-Specific Instructions**

### **Backend Agent Instructions**
**Your Role:** Implement the core upgrade system and game mechanics
**Start Date:** Week 1
**Dependencies:** None - you lead the development

**Phase 1 (Week 1-2): Core Foundation**
```
DO NOT move to Phase 2 until Phase 1 is complete and tested.
Complete these tasks in order:
1. Replace existing upgrade definitions with tiered system
2. Implement requirement validation logic  
3. Update upgrade purchase flow
4. Create new API endpoints for upgrade management
5. Test all backend functionality thoroughly

Exit Criteria: All backend APIs work correctly, upgrade system is functional
```

**Phase 2 (Week 3-4): Standby Mode**
```
- Be available for API adjustments if Frontend Agent needs changes
- Review Frontend Agent's integration with your APIs
- Fix any backend issues discovered during frontend development
- Prepare for Phase 3 collaboration
```

**Phase 3+ (Week 5+): Collaboration Mode**
```
- Work with Frontend and QA agents on game mechanics
- Implement movement patterns as specified in complexity order
- Coordinate API changes with Frontend Agent
- Support QA testing efforts
```

---

### **Frontend Agent Instructions**
**Your Role:** Build the user interface and integrate with backend
**Start Date:** Week 3 (after Backend Agent completes Phase 1)
**Dependencies:** Backend APIs must be complete and functional

**Phase 1 (Week 1-2): Wait Mode**
```
- DO NOT start development yet
- Review the new backend APIs and data structures
- Plan your UI architecture
- Prepare for Phase 2 development
```

**Phase 2 (Week 3-4): UI Foundation**
```
DO NOT move to Phase 3 until Phase 2 is complete and tested.
Complete these tasks in order:
1. Create new upgrade store layout
2. Implement piece type filtering
3. Design upgrade tile components
4. Add requirement display logic
5. Integrate with Backend Agent's APIs
6. Test UI functionality thoroughly

Exit Criteria: Upgrade store displays correctly, integrates with backend
```

**Phase 3+ (Week 5+): Collaboration Mode**
```
- Work with Backend and QA agents on game mechanics
- Build UI components for new movement patterns
- Coordinate with Backend Agent on API changes
- Support QA testing efforts
```

---

### **QA Agent Instructions**
**Your Role:** Test and validate all functionality
**Start Date:** Week 2 (after Backend Agent completes Phase 1)
**Dependencies:** Backend functionality must be complete

**Phase 1 (Week 1-2): Backend Testing**
```
- Wait for Backend Agent to complete Phase 1
- Test all backend APIs and upgrade functionality
- Validate requirement validation logic
- Ensure upgrade purchase flow works correctly
- Report any issues to Backend Agent

Exit Criteria: All backend functionality is verified and working
```

**Phase 2 (Week 3-4): Frontend Testing**
```
- Test Frontend Agent's UI components
- Validate integration with backend APIs
- Test upgrade store functionality
- Ensure UI renders correctly and interactions work
- Report any issues to Frontend Agent

Exit Criteria: All frontend functionality is verified and working
```

**Phase 3+ (Week 5+): Integration Testing**
```
- Test complete system functionality
- Validate new movement mechanics
- Test multiplayer synchronization
- Performance testing
- End-to-end testing of upgrade system
```

---

## **Implementation Priority & Complexity Order**

### **Priority 1: Simple Mechanics (Week 5-6)**
1. **Pawns:** Dual movement (already exists, needs UI updates)
2. **Knights:** Adjacent movement (new mechanic)
3. **Bishops:** Orthogonal movement (new mechanic)

### **Priority 2: Medium Complexity (Week 7-8)**
1. **Rooks:** Protection mechanics (new mechanic)
2. **Queen:** Extended movement (new mechanic)
3. **King:** 2-square movement (new mechanic)

### **Priority 3: Complex Mechanics (Week 9-10)**
1. **Rooks:** Linking and wall creation (complex UI + logic)
2. **Knights:** Double movement (complex UI + logic)
3. **Queen:** Advanced capture and evasion (complex logic)
4. **King:** Piece manipulation and castle swapping (complex UI + logic)

---

## **Risk Mitigation Strategies**

### **Technical Risks:**
1. **UI Complexity:** Implement complex features incrementally, test each before moving to next
2. **State Management:** Use existing patterns, add new state incrementally
3. **Performance:** Monitor performance impact, optimize as needed

### **Game Balance Risks:**
1. **Upgrade Costs:** Start with specified values, adjust based on playtesting
2. **Requirement Difficulty:** Monitor player progression, adjust if needed
3. **Mechanic Balance:** Test each mechanic individually before combining

### **Testing Risks:**
1. **Feature Complexity:** Test each mechanic in isolation before integration
2. **Multiplayer Sync:** Test upgrade synchronization early and often
3. **State Persistence:** Verify upgrade progress saves correctly

---

## **Success Metrics**

### **Technical Metrics:**
- All TypeScript types compile without errors
- Upgrade store UI renders correctly
- All movement mechanics work as specified
- Performance impact < 10% on existing gameplay

### **User Experience Metrics:**
- Upgrade progression is clear and intuitive
- New mechanics are easy to understand
- UI interactions are smooth and responsive
- Upgrade requirements are clearly communicated

### **Game Balance Metrics:**
- Upgrade costs feel appropriate for their power level
- Requirements provide meaningful progression
- New mechanics enhance gameplay without breaking balance
- All piece types remain viable and interesting

---

## **Critical Coordination Rules**

### **🚨 DO NOT BREAK THE SEQUENCE**
1. **Backend Agent starts Week 1** - Complete Phase 1 before anyone else starts
2. **Frontend Agent starts Week 3** - Only after Backend Phase 1 is complete and tested
3. **QA Agent starts Week 2** - Test Backend Phase 1, then Frontend Phase 2
4. **All agents work together Week 5+** - After both foundation phases are complete

### **Communication Protocol**
- **Daily Updates:** Each agent reports progress at end of day
- **Phase Completion:** Agent must declare "Phase X Complete" with evidence
- **Blocking Issues:** Report immediately if you're blocked or need help
- **Integration Testing:** Coordinate testing sessions between phases

### **Success Criteria for Each Phase**
- **Phase 1:** Backend APIs work, upgrade system functional
- **Phase 2:** UI renders correctly, integrates with backend
- **Phase 3:** Simple/medium mechanics work
- **Phase 4:** Complex mechanics work
- **Phase 5:** Complete system functional and tested

---

This implementation plan provides a structured approach to building the complex upgrade system while maintaining quality through incremental development and testing. Each phase delivers working functionality that can be validated before proceeding to the next phase.

**Remember: Quality over speed. Complete each phase thoroughly before moving forward.**
