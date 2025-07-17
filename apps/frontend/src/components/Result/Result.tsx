import React from "react";
import { Player, Room } from "../../util/types";
import PlayerCard from "../PlayerCard";
import styles from "./style.module.css";
import { RiVipCrownFill } from "react-icons/ri";
import { ColorType, ct2css } from "../../util/color";
import { motion } from "motion/react";

const KEY_FRAMES = {
  space: 1.5,
  card: 2,
  text: 5,
}

const Result = ({ playerId, room }: { playerId: string; room: Room }) => {
  let players = Object.values(room.players).sort((a, b) => b.score - a.score);
  players = [
    ...players,
    ...Array.from({ length: Math.max(0, 12 - players.length) }).map(
      (v) => v as Player
    ),
  ];
  const winner = players.filter((_, i) => i < 3);
  const loser = players.filter((_, i) => i >= 3);
  const userRank = players.findIndex((p) => p.id === playerId) + 1;
  const rankMessage = userRank <= 3 ? userRank === 1 ? "優勝！！" : "上位入賞！！" : `${userRank}位！`;
  const congratulationMessage = userRank <= 3 ? "おめでとう！！" : "...もっと頑張れ！";


  const MotionSpace = ({ isRight }: { isRight?: boolean }) => {
    return (
      <div className={styles.space}>
        <motion.div className={styles.spaceContent}
          style={isRight ? { right: "0" } : { left: "0" }}
          initial={{ width: "50vw" }}
          animate={{ width: "" }}
          transition={{ type: "spring", stiffness: 30, damping: 10, delay: KEY_FRAMES.space }}
        />
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <MotionSpace />
      <div className={styles.container}>
        <motion.p className={styles.resultTag}

          initial={{ opacity: 1 }}
          animate={{ opacity: 0, display: "none" }}
          transition={{ duration: 1, delay: KEY_FRAMES.space }}
        >結果発表！！</motion.p>
        <div className={styles.topText}>
          <motion.p
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: KEY_FRAMES.text }}
          >{rankMessage}</motion.p>
          <motion.p className={styles.congratulation}
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: KEY_FRAMES.text + 0.5 }}
          >{congratulationMessage}</motion.p>
        </div>
        <div className={styles.playersContainer}>
          <div className={styles.winnerContainer}>
            {winner.map((p, i) => (
              <motion.div
                key={p?.id || i}
                className={styles.playerCardWrapper}
                style={{
                  gridArea: `win-${i + 1}`,
                  top: `calc(var(--sp-ll) * ${i})`,
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: KEY_FRAMES.card + (3 - i) * 0.7 }}
              >
                <RiVipCrownFill
                  className={styles.rank}
                  style={{
                    color: ct2css(["1st", "2nd", "3rd"][i] as ColorType),
                  }}
                />
                {/* <p className={styles.rank}>{i + 1}位</p> */}
                <PlayerCard
                  playerId={p?.id}
                  playerName={p?.name}
                  score={p?.score}
                  className={styles.playerCard}
                  variant="card"
                  dummy={!p?.id}
                  isMe={p?.id === playerId}
                />
              </motion.div>
            ))}
          </div>
          <div className={styles.playersBorder} />
          <div className={styles.loserContainer}>
            {loser.map((p, i) => (
              <motion.div key={p?.id || i + 4} className={styles.playerCardWrapper}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: KEY_FRAMES.card + i * 0.1 }}
              >
                <p className={styles.rank}>{i + 4}位</p>
                <PlayerCard
                  playerId={p?.id}
                  playerName={p?.name}
                  score={p?.score}
                  className={styles.playerCard}
                  variant="card"
                  dummy={!p?.id}
                  isMe={p?.id === playerId}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
      <MotionSpace isRight />
    </section>
  );
};

export default Result;
