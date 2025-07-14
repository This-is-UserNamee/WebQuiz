import { ReactNode } from "react";
import styles from "./style.module.css";
import { ColorType } from "../../util/color";

const CommonSection = ({
  bgColor,
  className,
  children,
}: {
  bgColor?: ColorType;
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <section
      className={`${styles.section} ${className || ""}`}
      style={{ background: bgColor ? `var(--bc-${bgColor})` : "" }}
    >
      <div className={styles.container}>{children}</div>
    </section>
  );
};

export default CommonSection;
