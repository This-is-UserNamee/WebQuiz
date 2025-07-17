import React, { useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { Room } from "../../util/types";
import styles from "./style.module.css";
import CommonSection from "../CommonSection";
import PlayerIcon from "../PlayerIcon";
import { FaAnglesRight } from "react-icons/fa6";
import { AnimatePresence, motion } from "motion/react";
import { MdLogout } from "react-icons/md";

interface RoomWaitingProps {
  socket: Socket | null;
  room: Room;
  playerId: string;
  onLeaveRoom: () => void;
  onGameStarted: (room: Room) => void;
}

const RoomWaiting: React.FC<RoomWaitingProps> = ({
  socket,
  room,
  playerId,
  onLeaveRoom,
  onGameStarted,
}) => {
  const isHost = room.hostId === playerId;
  const hostName = room.players?.[room.hostId]?.name || "Unknown";
  const playerCount = room.players ? Object.keys(room.players).length : 0;
  const [dot, setDot] = useState("");

  useEffect(() => {
    console.log("[DEBUG_ROOMWAITING] room prop updated:", room);
  }, [room]);

  useEffect(() => {
    if (!socket) return;

    // ルーム情報更新イベントはApp.tsxで処理されるため、ここでは不要
    // socket.on('roomUpdated', (updatedRoom: Room) => {
    //   console.log('[DEBUG_FRONTEND] Received roomUpdated:', updatedRoom);
    // });

    // ルーム解散イベント
    socket.on("roomClosed", ({ roomId, reason }) => {
      console.log(`Room ${roomId} closed: ${reason}`);
      alert(`Room closed: ${reason}`);
      onLeaveRoom(); // ルーム退出処理をApp.tsxに通知
    });

    // ゲーム開始イベント
    socket.on("gameStarted", (roomData: any) => {
      console.log("Game started in room:", roomData.room);
      onGameStarted(roomData.room); // ゲーム開始をApp.tsxに通知
    });

    // エラーイベント
    socket.on("errorOccurred", ({ message }) => {
      console.error("Error in RoomWaiting:", message);
      alert(`Error: ${message}`);
    });

    return () => {
      socket.off("roomUpdated");
      socket.off("roomClosed");
      socket.off("gameStarted");
      socket.off("errorOccurred");
    };
  }, [socket, onLeaveRoom, onGameStarted]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDot((prev) => (prev.length < 3 ? prev + "." : ""));
    }, 1000);
    return () => clearInterval(interval);
  }, []);


  const handleLeaveRoom = () => {
    if (socket) {
      socket.emit("leaveRoom", { roomId: room.id });
      console.log(`Attempting to leave room ${room.id}...`);
      onLeaveRoom(); // App.tsxにルーム退出を通知
    }
  };

  const handleStartGame = () => {
    if (socket && isHost) {
      socket.emit("startGame", { roomId: room.id });
      console.log(`Attempting to start game in room ${room.id}...`);
    }
  };

  if (!room) {
    console.warn("[RoomWaiting] Room object is null or undefined.");
    return <div>Loading room data...</div>; // またはエラーメッセージ
  }

  return (
    <div>
      <CommonSection bgColor="graprimarydark" shadow>
        <div className={styles.topContainer}>
          <p className={styles.roomID}>ルームID: {room.id}</p>
          <h1 className={styles.waitingMessage}>
            {isHost ? "おまえ" : hostName}の開始を待っています{dot}
          </h1>
        </div>
      </CommonSection>
      <div className={styles.bottomContainer}>
        <div className={styles.bottomTextContainer}>
          <p className={styles.playerCount}>プレイヤー({playerCount}人)</p>
          <motion.div className={styles.playerList} layout>
            <AnimatePresence>
              {room.players &&
                Object.values(room.players).map((player) => (
                  <motion.div key={player.id} className={styles.playerItem}

                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    layoutId={player.id}
                  >
                    <PlayerIcon palyerId={player.id} size="50px" />
                    <div className={styles.playerInfo}>
                      <div className={styles.playerTagContainer}>
                        {player.id === playerId && (
                          <p className={styles.playerTag}>{"おまえ"}</p>
                        )}
                        {player.id === room.hostId && (
                          <p className={styles.playerTag}>{"ホスト"}</p>
                        )}
                      </div>
                      <p className={styles.playerName}>{player.name}</p>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        </div>
        <div className={styles.bottomButtonContainer}>
          <motion.button onClick={handleLeaveRoom} className={styles.leaveButton}

            whileHover={{ x: 10 }}
            whileTap={{ x: 15 }}
          >
            <p>退出</p>
            <MdLogout />
          </motion.button>
          <motion.button
            onClick={handleStartGame}
            className={`${styles.startButton} ${!isHost ? styles.dissableStartButton : ""
              }`}

            whileHover={{ x: isHost ? 10 : 0 }}
            whileTap={{ x: isHost ? 15 : 0 }}
          >
            <p>開始</p>
            <FaAnglesRight />
          </motion.button>
        </div>
      </div>

      {/* <h2>Room: {room.id}</h2>
      <p>Host: {room.players?.[room.hostId]?.name || "Unknown Host"}</p>
      <p>State: {room.state}</p>

      <h3>Players in Room:</h3>
      <ul>
        {room.players &&
          Object.values(room.players).map((player) => (
            <li key={player.id}>
              {player.name} {player.id === playerId ? "(You)" : ""}{" "}
              {player.id === room.hostId ? "(Host)" : ""}
            </li>
          ))}
      </ul>

      {isHost && room.state === "waiting" && (
        <button onClick={handleStartGame}>Start Game</button>
      )}
      <button onClick={handleLeaveRoom}>Leave Room</button> */}
    </div>
  );
};

export default RoomWaiting;
