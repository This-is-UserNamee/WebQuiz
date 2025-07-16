import React from "react";
import { Player, Room } from "../../util/types";
import PlayerCard from "../PlayerCard";
import styles from "./style.module.css";
import { RiVipCrownFill } from "react-icons/ri";
import { ColorType, ct2css } from "../../util/color";

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

  return (
    <section className={styles.section}>
      <div className={styles.space} />
      <div className={styles.container}>
        <div className={styles.topText}>
          <p>結果発表！</p>
          <p className={styles.congratulation}>おめでとう！！</p>
        </div>
        <div className={styles.playersContainer}>
          <div className={styles.winnerContainer}>
            {winner.map((p, i) => (
              <div
                key={p?.id || i}
                className={styles.playerCardWrapper}
                style={{
                  gridArea: `win-${i + 1}`,
                  top: `calc(var(--sp-ll) * ${i})`,
                }}
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
              </div>
            ))}
          </div>
          <div className={styles.playersBorder} />
          <div className={styles.loserContainer}>
            {loser.map((p, i) => (
              <div key={p?.id || i + 4} className={styles.playerCardWrapper}>
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
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.space} />
    </section>
  );
};

export default Result;
