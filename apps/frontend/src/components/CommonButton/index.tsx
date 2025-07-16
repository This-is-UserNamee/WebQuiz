import { ColorType, ct2css } from "../../util/color";
import styles from "./style.module.css";

import { MouseEventHandler, ReactNode } from "react";

const CommonButton = ({
  onClick,
  className,
  type = "button",
  bgColor = "primary",
  textColor = "bg",
  children,
}: {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: "button" | "submit" | "reset";
  bgColor?: ColorType;
  textColor?: ColorType;
  children?: ReactNode;
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`${styles.button} ${className}`}
      style={{
        backgroundColor: ct2css(bgColor),
        color: ct2css(textColor),
      }}
    >
      {children}
    </button>
  );
};

export default CommonButton;
