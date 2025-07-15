import GuageBar from "../GuageBar";
import PlayerIcon from "../PlayerIcon";
import styles from "./style.module.css";

const MAX_SCORE = 50;

const PlayerCard = ({
  playerId,
  playerName,
  score,
  isMe = false,
  className = "",
}: {
  playerId: string;
  playerName: string;
  score: number;
  isMe?: boolean;
  className?: string;
}) => {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.iconContainer}>
        <PlayerIcon palyerId={playerId} size="3rem" />
        {isMe && <span className={styles.meBadge}>おまえ</span>}
      </div>
      <div className={styles.info}>
        <div className={styles.topInfo}>
          <p className={styles.playerName}>{playerName}</p>
          <p className={styles.playerScore}>{score}P</p>
        </div>
        <GuageBar ratio={score / MAX_SCORE} weight="10px" />
      </div>
    </div>
  );
};

export default PlayerCard;
