import { ReactNode } from "react";
import styles from "./style.module.css";
import { AnimatePresence, motion } from "motion/react";

const BackDrop = ({
  open = false,
  onClose = () => {},
  children,
}: {
  open?: boolean;
  onClose?: () => void;
  children?: ReactNode;
}) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.content}
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default BackDrop;
