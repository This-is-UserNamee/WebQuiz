import { ReactNode } from "react";
import styles from "./style.module.css";
import { ColorType, ct2css } from "../../util/color";

const CommonSection = ({
  bgColor,
  className,
  shadow = false,
  children,
}: {
  bgColor?: ColorType;
  shadow?: boolean;
  className?: string;
  children?: ReactNode;
}) => {
  return (
    <section
      className={`${styles.section} ${className || ""}`}
      style={{
        background: bgColor ? ct2css(bgColor) : "",
        boxShadow: shadow ? "var(--sh-bg)" : "",
      }}
    >
      <div className={styles.container}>{children}</div>
    </section>
  );
};

export default CommonSection;
