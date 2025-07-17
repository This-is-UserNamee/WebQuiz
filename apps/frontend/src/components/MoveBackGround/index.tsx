import { motion } from "motion/react";
import styles from "./style.module.css";
import { useEffect, useState } from "react";
import { ColorType, ct2css } from "../../util/color";

const MIN_SPAN = 5000;
const MAX_SPAN = 15000;

const MoveObject = () => {
  const randomPos = (end: "vw" | "vh") => {
    return Math.random() * 100 + end;
  }

  const randomSize = () => {
    return Math.random() * 500 + 100 + "px";
  }

  const randomRadius = () => {
    return Math.random() * 100 + 5 + "px";
  }

  const randomColor = () => {
    const colors: ColorType[] = ["primary", "secondary", "accent", "primary-dark"]
    return ct2css(colors[Math.floor(Math.random() * colors.length)]);
  }

  const [left, setLeft] = useState(randomPos("vw"));
  const [top, setTop] = useState(randomPos("vh"));
  const [width, setWidth] = useState(randomSize());
  const [height, setHeight] = useState(randomSize());
  const [borderRadius, setBorderRadius] = useState(randomRadius());
  const [backgroundColor, setBackgroundColor] = useState(randomColor());
  const [trigger, setTrigger] = useState(false);

  useEffect(() => {
    const animate = () => {
      setLeft(randomPos("vw"));
      setTop(randomPos("vh"));
      setWidth(randomSize());
      setHeight(randomSize());
      setBorderRadius(randomRadius());
      setBackgroundColor(randomColor());
      setTrigger(prev => !prev);
    };

    const timeout = setTimeout(animate, MIN_SPAN + Math.random() * (MAX_SPAN - MIN_SPAN));
    return () => clearTimeout(timeout);
  }, [trigger]);


  return (
    <motion.div
      className={styles.object}
      initial={{ width, height, left, top, borderRadius, backgroundColor }}
      animate={{ width, height, left, top, borderRadius, backgroundColor }}
      transition={{
        type: "spring",
        stiffness: 10,
        damping: 3,
      }}
    />
  )
}

const MoveBackGround = ({ num = 5 }: { num?: number }) => {
  return <div className={styles.container}>
    {Array.from({ length: num }, (_, i) => (
      <MoveObject key={i} />
    ))}
  </div>;
};

export default MoveBackGround;
