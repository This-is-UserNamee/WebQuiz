import { ReactNode, useEffect, useRef, useState } from "react";
import styles from "./style.module.css";
import { AnimatePresence, motion } from "motion/react";

const CommonSnackBar = ({
  open = false,
  time,
  onClose,
  children,
}: {
  open?: boolean;
  time?: number;
  onClose?: () => void;
  children?: ReactNode;
}) => {
  const [isSnackBarVisible, setSnackBarVisibility] = useState(open);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSnackBarVisibility(open);
  }, [open]);

  useEffect(() => {
    if (!time) {
      return () => {};
    }
    timeoutRef.current = setTimeout(() => {
      setSnackBarVisibility(false);
      onClose?.();
    }, time || 3000);
    return () => clearTimeout(timeoutRef.current!);
  }, [open, time]);
  return (
    <AnimatePresence>
      {isSnackBarVisible && (
        <motion.div
          className={styles.snackBar}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          // transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommonSnackBar;
