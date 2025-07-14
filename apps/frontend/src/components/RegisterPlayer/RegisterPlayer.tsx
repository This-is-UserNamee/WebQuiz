import React, { useState } from "react";
import { Socket } from "socket.io-client";
import styles from "./style.module.css";
import CommonSection from "../CommonSection";
import Icon from "../Icon";
import CommonButton from "../CommonButton";

interface RegisterPlayerProps {
  socket: Socket | null;
  onRegistered: (playerId: string, playerName: string) => void;
}

const RegisterPlayer: React.FC<RegisterPlayerProps> = ({
  socket,
  onRegistered,
}) => {
  const [playerName, setPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!socket) {
      setError("Socket not connected.");
      return;
    }

    if (!playerName.trim()) {
      setError("Player name cannot be empty.");
      return;
    }

    socket.emit("registerPlayer", { playerName });

    socket.on(
      "playerRegistered",
      ({ playerId, playerName: registeredName }) => {
        onRegistered(playerId, registeredName);
      }
    );

    socket.on("errorOccurred", ({ message }) => {
      setError(message);
    });
  };

  return (
    <>
      <CommonSection bgColor="primary">
        <div className={styles.topContainer}>
          <Icon color="bg" className={styles.icon} />
          <div className={styles.topText}>
            <div className={styles.topTitle}>
              <p>Quiz</p>
              <p>Mock</p>
            </div>
            <div className={styles.topBorder} />
            <p className={styles.welcomeText}>
              ようこそ{`${playerName ? "、 " + playerName : ""}`}！
            </p>
          </div>
        </div>
      </CommonSection>
      <CommonSection>
        <form onSubmit={handleSubmit} className={styles.inputForm}>
          <input
            type="text"
            placeholder="ニックネームを入れてね！"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className={styles.input}
          />
          <CommonButton type="submit"
            
          >登録</CommonButton>
        </form>
        {error && <p style={{ color: "red" }}>{error}</p>}
      </CommonSection>
    </>
  );
};

export default RegisterPlayer;
