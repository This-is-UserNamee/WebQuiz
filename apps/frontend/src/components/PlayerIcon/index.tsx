import styles from "./style.module.css";

const PlayerIcon = ({
  palyerId,
  size,
  className,
}: {
  palyerId: string;
  size?: string;
  className?: string;
}) => {
  return (
    <div
      style={{
        backgroundImage: `url(https://api.dicebear.com/9.x/thumbs/svg?seed=${palyerId})`,
        width: size || "",
        height: size || "",
      }}
      className={`${styles.icon} ${className || ""}`}
    ></div>
  );
};

export default PlayerIcon;
