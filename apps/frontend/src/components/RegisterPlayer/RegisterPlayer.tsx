import React, { DetailedHTMLProps, InputHTMLAttributes, useState } from "react";
import { Socket } from "socket.io-client";
import styles from "./style.module.css";
import CommonSection from "../CommonSection";
import Icon from "../Icon";
import CommonButton from "../CommonButton";
import CommonSnackBar from "../CommonSnackBar";

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
  const [isComposing, setIsComposing] = useState(false);
  const MAX_LENGTH = 5; // 最大文字数を5文字に設定

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

  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  const handleCompositionEnd = (
    e: React.CompositionEvent<HTMLInputElement>
  ) => {
    setIsComposing(false);
    setPlayerName(e.currentTarget.value.slice(0, MAX_LENGTH));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (isComposing) {
      setPlayerName(value);
    } else {
      setPlayerName(value.slice(0, MAX_LENGTH));
    }
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
            placeholder={`${MAX_LENGTH}文字以内のニックネームを入れてね！`}
            value={playerName}
            onChange={handleChange}
            className={styles.input}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
          />
          <CommonButton type="submit">登録</CommonButton>
        </form>
        {/* {error && <p style={{ color: "red" }}>{error}</p>} */}
        <CommonSnackBar
          open={Boolean(error)}
          time={5000}
          onClose={() => setError(null)}
        >
          <p className={styles.errorText}>
            うわあ！<span className={styles.errorTextAccent}>ユーザー名</span>
            を入力してね！
          </p>
        </CommonSnackBar>
      </CommonSection>
    </>
  );
};

export default RegisterPlayer;
