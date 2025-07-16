import { useState, useEffect } from "react";
import { io, Socket } from "socket.io-client";
import RegisterPlayer from "./components/RegisterPlayer/RegisterPlayer";
import Lobby from "./components/Loby/Lobby";

import { Room } from "./util/types"; // Room 型をインポート
import "./App.css";
import RoomWaiting from "./components/RoomWaiting/RoomWaiting";
import GameScreen from "./components/GameScreen/GameScreen";
import Result from "./components/Result/Result";
// バックエンドのURLを環境変数から取得
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState<string | null>(null);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null); // 型を Room | null に変更
  const [inGame, setInGame] = useState(false); // ゲーム中かどうか

  useEffect(() => {
    console.log("[DEBUG_APP] currentRoom updated:", currentRoom);
  }, [currentRoom]);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);

    newSocket.on("connect", () => {
      setIsConnected(true);
      console.log("Socket.IO connected. Frontend Socket ID:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      console.log("Socket.IO disconnected");
    });

    // 受信する全てのSocket.IOイベントをログに出力（デバッグ用）
    newSocket.onAny((eventName, payload: any, ...args) => {
      const expectedEventName = "roomUpdated";
      //こっちのログにはroomUpdatedが表示されるのにroomUpdatadが発火してくれないので、この中で無理やり動かす。
      if (eventName === expectedEventName) {
        // もし名前が一致しているのに個別のリスナーが動かない場合、それは別の問題
        if (payload && payload.room) {
          setCurrentRoom(payload.room);
        } else {
          console.error(
            "[DEBUG_APP_EVENT] roomUpdated payload is missing room property:",
            payload
          );
        }
      }
    });

    // roomUpdated イベントを購読し、currentRoom を更新
    newSocket.on("roomUpdated", (payload: any) => {
      if (payload && payload.room) {
        setCurrentRoom(payload.room);
      } else {
        console.error(
          "[DEBUG_APP_EVENT] roomUpdated payload is missing room property:",
          payload
        );
      }
    });

    newSocket.on("gameFinished", (payload: any) => {
      setCurrentRoom(payload.room);
      console.log("[DEBUG_APP_EVENT] gameFinished payload:", payload);
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

  const handleJoinRoom = (room: Room) => {
    // room の型も Room に変更
    setCurrentRoom(room);
    setInGame(false); // ルームに参加したらゲーム中ではない
    console.log("[DEBUG_APP] Joined room with ID:", room.id);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setInGame(false); // ルームを離れたらゲーム中ではない
  };

  const handleGameStarted = (room: Room) => {
    // room の型も Room に変更
    setCurrentRoom(room);
    console.log("App.tsx: room after gameStarted:", room);
    console.log("App.tsx rendering GameScreen with room:", currentRoom);
  };

  return (
    <div className="App">
      {!playerId ? (
        <RegisterPlayer socket={socket} onRegistered={handlePlayerRegistered} />
      ) : !currentRoom ? (
        <Lobby
          socket={socket}
          playerId={playerId}
          playerName={playerName!}
          onJoinRoom={handleJoinRoom}
        />
      ) : currentRoom.state === "waiting" ? (
        <RoomWaiting
          socket={socket}
          room={currentRoom}
          playerId={playerId}
          onLeaveRoom={handleLeaveRoom}
          onGameStarted={handleGameStarted}
        />
      ) : currentRoom.state === "playing" ? (
        <GameScreen socket={socket} room={currentRoom} playerId={playerId} />
      ) : (
        <Result room={currentRoom} />
      )}
    </div>
  );
}

export default App;
