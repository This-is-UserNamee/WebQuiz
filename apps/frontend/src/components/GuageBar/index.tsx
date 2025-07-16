import { ReactNode } from "react";
import styles from "./style.module.css";
import { ColorType, ct2css } from "../../util/color";
import { motion } from "framer-motion";

const GuageBar = ({
  ratio = 1,
  weight,
  bgColor = "subtext",
  barColor = "primary",
  children,
}: {
  ratio?: number;
  weight?: string;
  bgColor?: ColorType;
  barColor?: ColorType;
  children?: ReactNode;
}) => {
  return (
    <div
      className={styles.container}
      style={{ background: ct2css(bgColor), height: weight || "" }}
    >
      <motion.div
        className={styles.bar}
        animate={{ width: `${Math.min(Math.max(ratio, 0), 1) * 100}%` }}
        style={{
          background: ct2css(barColor),
        }}
      />
      <span className={styles.children}>{children}</span>
    </div>
  );
};

export default GuageBar;
