import { FaAngleRight } from "react-icons/fa";
import styles from "./style.module.css";
import { motion } from "motion/react";

const RoomCard = ({
  roomID,
  playerCount,
  state,
  onClick,
  dummy = false,
}: {
  roomID?: string;
  playerCount?: number;
  state?: string;
  onClick?: () => void;
  dummy?: boolean;
}) => {
  const canJoin = state === "waiting" && !dummy;

  return (
    <div>
      <motion.div className={`${styles.card} ${dummy ? styles.dummyCard : ""}`}
        onClick={onClick}

        initial={{ opacity: .2 }}
        animate={{ opacity: dummy ? "" : 1 }}
        whileHover={canJoin ? { scale: 1.05 } : {}}
        whileTap={canJoin ? { scale: 0.95 } : {}}
      >
        {!dummy && (
          <>
            <div className={styles.infoContainer}>
              <div
                className={styles.roomImg}
                style={{
                  backgroundImage: `url(https://api.dicebear.com/9.x/shapes/svg?seed=${roomID})`,
                }}
              />
              <div className={styles.infoTextContainer}>
                <div className={styles.roomId}>ルームID: {roomID}</div>
                <div className={styles.border} />
                <div className={styles.playerCount}>人数: {playerCount}名</div>
              </div>
            </div>
            <button
              className={`${styles.joinButton} ${!canJoin ? styles.dissableButton : ""
                }`}
              onClick={onClick}
            >
              <p className={styles.joinText}>
                参加 <FaAngleRight />
              </p>
            </button>
          </>
        )}
        {!canJoin &&
          <>
            <div className={styles.dissableBack} />
            {!dummy && <div className={styles.playingBadge}>プレイ中...</div>}
          </>
        }
      </motion.div>
    </div >
  );
};

export default RoomCard;
