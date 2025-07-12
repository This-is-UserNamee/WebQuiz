import React, { useState } from 'react';
import { Socket } from 'socket.io-client';

interface RegisterPlayerProps {
  socket: Socket | null;
  onRegistered: (playerId: string, playerName: string) => void;
}

const RegisterPlayer: React.FC<RegisterPlayerProps> = ({ socket, onRegistered }) => {
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!socket) {
      setError('Socket not connected.');
      return;
    }

    if (!playerName.trim()) {
      setError('Player name cannot be empty.');
      return;
    }

    socket.emit('registerPlayer', { playerName });

    socket.on('playerRegistered', ({ playerId, playerName: registeredName }) => {
      onRegistered(playerId, registeredName);
    });

    socket.on('errorOccurred', ({ message }) => {
      setError(message);
    });
  };

  return (
    <div>
      <h2>Register Player</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Enter your player name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
        />
        <button type="submit">Register</button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default RegisterPlayer;
