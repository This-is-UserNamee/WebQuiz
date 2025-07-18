import { ReactNode } from "react";
import styles from "./style.module.css";
import { ColorType, ct2css } from "../../util/color";
import { motion } from "framer-motion";

const GuageBar = ({
  ratio = 1,
  weight,
  bgColor = "subtext",
  barColor = "primary",
  animate = true,
  children,
}: {
  ratio?: number;
  weight?: string;
  bgColor?: ColorType;
  barColor?: ColorType;
  animate?: boolean;
  children?: ReactNode;
}) => {
  const width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;

  return (
    <div
      className={styles.container}
      style={{ background: ct2css(bgColor), height: weight || "" }}
    >
      <motion.div
        className={styles.bar}
        animate={animate ? { width } : {}}
        style={{
          background: ct2css(barColor),
          width: animate ? "" : width,
        }}
      />
      <span className={styles.children}>{children}</span>
    </div>
  );
};

export default GuageBar;
