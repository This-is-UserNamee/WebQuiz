import React, { useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { Player, Room } from '../types';

interface RoomWaitingProps {
  socket: Socket | null;
  room: Room;
  playerId: string;
  onLeaveRoom: () => void;
  onGameStarted: (room: Room) => void;
}

const RoomWaiting: React.FC<RoomWaitingProps> = ({ socket, room, playerId, onLeaveRoom, onGameStarted }) => {
  const isHost = room.hostId === playerId;

  useEffect(() => {
    console.log('[DEBUG_ROOMWAITING] room prop updated:', room);
  }, [room]);

  useEffect(() => {
    if (!socket) return;

    // ルーム情報更新イベントはApp.tsxで処理されるため、ここでは不要
    // socket.on('roomUpdated', (updatedRoom: Room) => {
    //   console.log('[DEBUG_FRONTEND] Received roomUpdated:', updatedRoom);
    // });

    // ルーム解散イベント
    socket.on('roomClosed', ({ roomId, reason }) => {
      console.log(`Room ${roomId} closed: ${reason}`);
      alert(`Room closed: ${reason}`);
      onLeaveRoom(); // ルーム退出処理をApp.tsxに通知
    });

    // ゲーム開始イベント
    socket.on('gameStarted', (startedRoom: Room) => {
      console.log('Game started in room:', startedRoom);
      onGameStarted(startedRoom); // ゲーム開始をApp.tsxに通知
    });

    // エラーイベント
    socket.on('errorOccurred', ({ message }) => {
      console.error('Error in RoomWaiting:', message);
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off('roomUpdated');
      socket.off('roomClosed');
      socket.off('gameStarted');
      socket.off('errorOccurred');
    };
  }, [socket, onLeaveRoom, onGameStarted]);

  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit('leaveRoom', { roomId: room.id });
      console.log(`Attempting to leave room ${room.id}...`);
      onLeaveRoom(); // App.tsxにルーム退出を通知
    }
  };

  const handleStartGame = () => {
    if (socket && isHost) {
      socket.emit('startGame', { roomId: room.id });
      console.log(`Attempting to start game in room ${room.id}...`);
    }
  };

  if (!room) {
    console.warn('[RoomWaiting] Room object is null or undefined.');
    return <div>Loading room data...</div>; // またはエラーメッセージ
  }

  return (
    <div>
      <h2>Room: {room.id}</h2>
      <p>Host: {room.players?.[room.hostId]?.name || 'Unknown Host'}</p>
      <p>State: {room.state}</p>

      <h3>Players in Room:</h3>
      {/* レンダリング時のroom.playersの内容をログに出力 */}
      {console.log('[DEBUG_ROOMWAITING_RENDER] Players array for rendering:', room.players && Object.values(room.players))}
      <ul>
        {room.players && Object.values(room.players).map((player) => (
          <li key={player.id}>
            {player.name} {player.id === playerId ? '(You)' : ''} {player.id === room.hostId ? '(Host)' : ''}
          </li>
        ))}
      </ul>

      {isHost && room.state === 'waiting' && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      <button onClick={handleLeaveRoom}>Leave Room</button>
    </div>
  );
};

export default RoomWaiting;
