import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import RegisterPlayer from './components/RegisterPlayer';
import Lobby from './components/Lobby';
import RoomWaiting from './components/RoomWaiting';
import { Room } from './types'; // Room 型をインポート
import './App.css';

// バックエンドのURLを環境変数から取得
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null); // 型を Room | null に変更
  const [inGame, setInGame] = useState(false); // ゲーム中かどうか

  useEffect(() => {
    console.log('[DEBUG_APP] currentRoom updated:', currentRoom);
  }, [currentRoom]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.IO connected. Frontend Socket ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket.IO disconnected');
    });

    // 受信する全てのSocket.IOイベントをログに出力（デバッグ用）
    newSocket.onAny((eventName, ...args) => {
      console.log(`[DEBUG_APP_ANY_EVENT] Received event: '${eventName}' (Type: ${typeof eventName})`, args);
    });

    // roomUpdated イベントを購読し、currentRoom を更新
    newSocket.on('roomUpdated', (payload: any) => {
      console.log('[DEBUG_APP_EVENT] roomUpdated event received - RAW PAYLOAD:', payload);
      if (payload && payload.room) {
        setCurrentRoom(payload.room);
      } else {
        console.error('[DEBUG_APP_EVENT] roomUpdated payload is missing room property:', payload);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handlePlayerRegistered = (id: string, name: string) => {
    setPlayerId(id);
    setPlayerName(name);
  };

  const handleJoinRoom = (room: Room) => { // room の型も Room に変更
    setCurrentRoom(room);
    setInGame(false); // ルームに参加したらゲーム中ではない
    console.log('[DEBUG_APP] Joined room with ID:', room.id);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setInGame(false); // ルームを離れたらゲーム中ではない
  };

  const handleGameStarted = (room: Room) => { // room の型も Room に変更
    setCurrentRoom(room);
    setInGame(true); // ゲームが開始されたらゲーム中
  };

  return (
    <div className="App">
      <h1>WebQuiz Frontend</h1>
      <p>Socket.IO Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>

      {!playerId ? (
        <RegisterPlayer socket={socket} onRegistered={handlePlayerRegistered} />
      ) : !currentRoom ? (
        <Lobby socket={socket} playerId={playerId} playerName={playerName!} onJoinRoom={handleJoinRoom} />
      ) : !inGame ? (
        <RoomWaiting
          socket={socket}
          room={currentRoom}
          playerId={playerId}
          onLeaveRoom={handleLeaveRoom}
          onGameStarted={handleGameStarted}
        />
      ) : (
        <div>
          <p>Registered as: {playerName} (ID: {playerId})</p>
          <p>Joined Room: {currentRoom.id}</p>
          <p>Game is in progress!</p>
          {/* ここにゲーム画面のコンポーネントを配置 */}
        </div>
      )}
    </div>
  );
}

export default App;
