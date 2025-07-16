import styles from "./style.module.css";

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
  return (
    <div>
      <div className={`${styles.card} ${dummy ? styles.dummyCard : ""}`}>
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
              className={`${styles.joinButton} ${
                state !== "waiting" ? styles.dissableButton : ""
              }`}
              onClick={onClick}
            >
              参加 {">>"}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomCard;
