import Icon from "../Icon";
import styles from "./style.module.css";

const Rogo = ({ size = "" }: { size?: string }) => {
  return <div
    className={styles.container}
    style={{ width: size, height: size }}
  >
    <Icon color="bg" />
  </div>;
};

export default Rogo;
