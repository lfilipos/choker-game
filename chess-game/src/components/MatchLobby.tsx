import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { MatchState } from '../services/socketService';
import './MatchLobby.css';

interface Player {
  name: string;
  ready: boolean;
}

interface MatchLobbyProps {
  matchId: string;
  socket: Socket;
  playerName: string;
  onMatchStart: (matchState: MatchState) => void;
  onLeave: () => void;
}

const MatchLobby: React.FC<MatchLobbyProps> = ({ matchId, socket, playerName, onMatchStart, onLeave }) => {
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    console.log('MatchLobby mounted with matchId:', matchId);
    console.log('Socket connected:', socket?.connected);
    
    // Get current match state
    socket.emit('get_match_state', { matchId });

    // Listen for match updates
    socket.on('match_state', (state: MatchState) => {
      setMatchState(state);
      if (state.playerRole) {
        setSelectedRole(state.playerRole);
      }
    });

    socket.on('match_joined', (data: { matchId: string; assignedRole: string; matchState: MatchState }) => {
      setMatchState(data.matchState);
      setSelectedRole(data.assignedRole);
      setIsJoining(false);
      
      // Check if match is ready to start
      if (data.matchState.status === 'active') {
        onMatchStart(data.matchState);
      }
    });

    socket.on('match_state_updated', (data: { matchState: MatchState }) => {
      setMatchState(data.matchState);
      
      // Check if match is ready to start
      if (data.matchState.status === 'active') {
        onMatchStart(data.matchState);
      }
    });

    socket.on('error', (error: { message: string }) => {
      alert(`Error: ${error.message}`);
      setIsJoining(false);
    });

    return () => {
      socket.off('match_state');
      socket.off('match_joined');
      socket.off('match_state_updated');
      socket.off('error');
    };
  }, [matchId, socket, onMatchStart]);

  const handleJoinRole = (team: 'white' | 'black', gameSlot: 'A' | 'B') => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }

    setIsJoining(true);
    socket.emit('join_match', {
      matchId,
      playerName: playerName.trim(),
      preferredTeam: team,
      preferredGameSlot: gameSlot
    });
  };

  const isRoleAvailable = (team: 'white' | 'black', gameSlot: 'A' | 'B'): boolean => {
    if (!matchState) return false;
    return !matchState.teams[team].players[gameSlot];
  };

  const getRolePlayer = (team: 'white' | 'black', gameSlot: 'A' | 'B'): Player | null => {
    if (!matchState) return null;
    return matchState.teams[team].players[gameSlot] || null;
  };

  const getRoleDisplay = (team: 'white' | 'black', gameSlot: 'A' | 'B'): string => {
    const player = getRolePlayer(team, gameSlot);
    if (player) {
      return player.name;
    }
    return 'Join';
  };

  const isMyRole = (team: 'white' | 'black', gameSlot: 'A' | 'B'): boolean => {
    return selectedRole === `${team}_${gameSlot}`;
  };

  if (!matchState) {
    return <div className="match-lobby">Loading match...</div>;
  }

  return (
    <div className="match-lobby">
      <div className="match-header">
        <h2>Match Lobby</h2>
        <p className="match-id">Match ID: {matchId}</p>
        {matchState.status === 'waiting' && (
          <p className="waiting-text">Waiting for players to join...</p>
        )}
      </div>

      {!selectedRole && playerName && (
        <div className="player-info">
          <p>Playing as: <strong>{playerName}</strong></p>
        </div>
      )}

      <div className="team-selection">
        <div className="team-column white-team">
          <h3>White Team</h3>
          <div className="role-buttons">
            <button
              className={`role-button ${!isRoleAvailable('white', 'A') ? 'occupied' : ''} ${isMyRole('white', 'A') ? 'my-role' : ''}`}
              onClick={() => handleJoinRole('white', 'A')}
              disabled={!isRoleAvailable('white', 'A') || !!selectedRole || isJoining}
            >
              <div className="role-label">Game A (Chess)</div>
              <div className="role-status">{getRoleDisplay('white', 'A')}</div>
            </button>
            <button
              className={`role-button ${!isRoleAvailable('white', 'B') ? 'occupied' : ''} ${isMyRole('white', 'B') ? 'my-role' : ''}`}
              onClick={() => handleJoinRole('white', 'B')}
              disabled={!isRoleAvailable('white', 'B') || !!selectedRole || isJoining}
            >
              <div className="role-label">Game B</div>
              <div className="role-status">{getRoleDisplay('white', 'B')}</div>
            </button>
          </div>
        </div>

        <div className="team-column black-team">
          <h3>Black Team</h3>
          <div className="role-buttons">
            <button
              className={`role-button ${!isRoleAvailable('black', 'A') ? 'occupied' : ''} ${isMyRole('black', 'A') ? 'my-role' : ''}`}
              onClick={() => handleJoinRole('black', 'A')}
              disabled={!isRoleAvailable('black', 'A') || !!selectedRole || isJoining}
            >
              <div className="role-label">Game A (Chess)</div>
              <div className="role-status">{getRoleDisplay('black', 'A')}</div>
            </button>
            <button
              className={`role-button ${!isRoleAvailable('black', 'B') ? 'occupied' : ''} ${isMyRole('black', 'B') ? 'my-role' : ''}`}
              onClick={() => handleJoinRole('black', 'B')}
              disabled={!isRoleAvailable('black', 'B') || !!selectedRole || isJoining}
            >
              <div className="role-label">Game B</div>
              <div className="role-status">{getRoleDisplay('black', 'B')}</div>
            </button>
          </div>
        </div>
      </div>

      {selectedRole && (
        <div className="selected-role-info">
          <p>You are playing as: <strong>{matchState.playerTeam} team - Game {matchState.playerGameSlot}</strong></p>
        </div>
      )}

      <div className="lobby-actions">
        <button onClick={onLeave} className="leave-button">
          Leave Match
        </button>
      </div>
    </div>
  );
};

export default MatchLobby;