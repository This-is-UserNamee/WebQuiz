import React, { useState, useEffect } from "react";
import { Socket } from "socket.io-client";
import styles from "./style.module.css";
import RoomCard from "../RoomCard";

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

const Lobby: React.FC<LobbyProps> = ({
  socket,
  playerId,
  playerName,
  onJoinRoom,
}) => {
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  useEffect(() => {
    if (!socket) return;

    // ルーム一覧の更新イベントを受信
    socket.on("roomListUpdate", (updatedRooms: RoomInfo[]) => {
      setRooms(updatedRooms);
      console.log("Room list updated:", updatedRooms);
    });

    // ルーム作成・参加成功イベントを受信
    socket.on("joinedRoom", (roomData: any) => {
      console.log("Joined room:", roomData);
      onJoinRoom(roomData.room); // App.tsxにルーム情報を渡す
    });

    // エラーイベントを受信
    socket.on("errorOccurred", ({ message }) => {
      console.error("Error in Lobby:", message);
      alert(`Error: ${message}`);
    });

    // コンポーネントアンマウント時にイベントリスナーをクリーンアップ
    return () => {
      socket.off("roomListUpdate");
      socket.off("joinedRoom");
      socket.off("errorOccurred");
    };
  }, [socket, onJoinRoom]);

  const handleCreateRoom = () => {
    if (socket) {
      socket.emit("createRoom");
      console.log("Attempting to create room...");
    }
  };

  const handleJoinRoom = (roomId: string) => {
    if (socket) {
      socket.emit("joinRoom", { roomId });
      console.log(`Attempting to join room ${roomId}...`);
    }
  };

  return (
    <div>
      {/* <p>よく来たね、 {playerName}！</p> */}
      <div className={styles.roomContainer}>
        <button onClick={handleCreateRoom} className={styles.createButton}>
          ルーム作成
        </button>
        <div className={styles.roomList}>
          {[
            ...rooms,
            ...Array.from({ length: Math.max(0, 12 - rooms.length) }),
          ].map((room, i) => {
            if (room && typeof room === "object") {
              const typedRoom = room as RoomInfo;
              return (
                <RoomCard
                  key={typedRoom.id}
                  roomID={typedRoom.id}
                  playerCount={typedRoom.playerCount}
                  state={typedRoom.state}
                  onClick={() => handleJoinRoom(typedRoom.id)}
                />
              );
            } else {
              return <RoomCard key={i} dummy />;
            }
          })}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
