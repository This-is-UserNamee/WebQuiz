import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface RoomInfo {
  id: string;
  playerCount: number;
  state: string;
}

interface LobbyProps {
  socket: Socket | null;
  playerId: string;
  playerName: string;
  onJoinRoom: (room: any) => void; // ルーム参加時にApp.tsxに通知するためのコールバック
}

const Lobby: React.FC<LobbyProps> = ({ socket, playerId, playerName, onJoinRoom }) => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  useEffect(() => {
    if (!socket) return;

    // ルーム一覧の更新イベントを受信
    socket.on('roomListUpdate', (updatedRooms: RoomInfo[]) => {
      setRooms(updatedRooms);
      console.log('Room list updated:', updatedRooms);
    });

    // ルーム作成・参加成功イベントを受信
    socket.on('joinedRoom', (roomData: any) => {
      console.log('Joined room:', roomData);
      onJoinRoom(roomData.room); // App.tsxにルーム情報を渡す
    });

    // エラーイベントを受信
    socket.on('errorOccurred', ({ message }) => {
      console.error('Error in Lobby:', message);
      alert(`Error: ${message}`);
    });

    // コンポーネントアンマウント時にイベントリスナーをクリーンアップ
    return () => {
      socket.off('roomListUpdate');
      socket.off('joinedRoom');
      socket.off('errorOccurred');
    };
  }, [socket, onJoinRoom]);

  const handleCreateRoom = () => {
    if (socket) {
      socket.emit('createRoom');
      console.log('Attempting to create room...');
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (socket) {
      socket.emit('joinRoom', { roomId });
      console.log(`Attempting to join room ${roomId}...`);
    }
  };

  return (
    <div>
      <h2>Lobby</h2>
      <p>Welcome, {playerName}!</p>

      <h3>Available Rooms</h3>
      <button onClick={handleCreateRoom}>Create New Room</button>
      {rooms.length === 0 ? (
        <p>No rooms available. Create one!</p>
      ) : (
        <ul>
          {rooms.map((room) => (
            <li key={room.id}>
              Room ID: {room.id} | Players: {room.playerCount} | State: {room.state}
              <button onClick={() => handleJoinRoom(room.id)}>Join</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Lobby;
