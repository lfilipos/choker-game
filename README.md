# Choker Game

A hybrid chess-poker game with real-time multiplayer functionality. Built with React, TypeScript, Node.js, and Socket.IO.

## Features

- **Custom Chess Board**: 16x10 board with centered piece placement
- **Control Zones**: Three strategic control zones (A, B, C) that players can capture
- **Real-time Multiplayer**: Live game synchronization using Socket.IO
- **Game Lobby**: Create and join games with other players
- **Move History**: Track all moves made during the game
- **Turn Management**: Proper turn validation and game state synchronization

## Project Structure

```
choker_game/
├── chess-game/          # React frontend
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # Socket.IO client service
│   │   ├── types/       # TypeScript type definitions
│   │   └── utils/       # Game logic utilities
│   └── package.json
├── chess-backend/       # Node.js backend
│   ├── server.js        # Main server file
│   ├── gameManager.js   # Game state management
│   ├── gameLogic.js     # Chess game logic
│   ├── types.js         # Game type definitions
│   └── package.json
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd choker_game
```

2. Install backend dependencies:
```bash
cd chess-backend
npm install
```

3. Install frontend dependencies:
```bash
cd ../chess-game
npm install
```

### Running the Application

1. Start the backend server:
```bash
cd chess-backend
npm start
```

2. Start the frontend development server:
```bash
cd chess-game
npm start
```

3. Open your browser and navigate to `http://localhost:3000`

## Game Rules

### Board Layout
- 16 columns (a-p) by 10 rows (1-10)
- Standard chess pieces start in centered positions
- 4 empty columns on each side of the starting formation

### Control Zones
- **Zone A (Blue)**: b5, b6, c5, c6
- **Zone B (Red)**: h5, h6, i5, i6
- **Zone C (Green)**: n5, n6, o5, o6

Control zones are captured by having the most pieces in that zone. Equal pieces result in neutral control.

### Multiplayer
- Players can create or join games through the lobby
- Real-time synchronization of moves and game state
- Turn-based gameplay with proper validation

## Technology Stack

- **Frontend**: React, TypeScript, CSS
- **Backend**: Node.js, Express, Socket.IO
- **Real-time Communication**: WebSocket connections via Socket.IO
- **Game Logic**: Custom chess implementation with control zones

## Development

The game includes comprehensive game state management, move validation, and real-time synchronization. Key features include:

- Custom chess piece movement logic
- Control zone calculation and ownership
- Multiplayer game room management
- Turn validation and game state synchronization
- Move history tracking

## Future Enhancements

- Database persistence for game history
- Player authentication and profiles
- Spectator mode
- Game replay functionality
- Poker elements integration (as per original Choker concept)

## Contributing

This is a personal project for building a hybrid chess-poker game. Feel free to explore the code and provide feedback.