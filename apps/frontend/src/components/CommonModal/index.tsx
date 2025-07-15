import { ReactNode } from "react";
import styles from "./style.module.css";
import BackDrop from "../BackDrop";

const CommonModal = ({
  open,
  onClose,
  children,
  className,
}: {
  open: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <BackDrop open={open} onClose={onClose}>
      <div className={`${styles.container} ${className}`}>{children}</div>
    </BackDrop>
  );
};

export default CommonModal;
