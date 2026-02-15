import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Grid } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionEnabled } from "./useMotionEnabled";
import "./pageFlip.css";

const routeOrder = [
  "home",
  "search",
  "borrow",
  "return",
  "assistant",
  "notifications",
  "feedback",
  "profile",
  "settings",
];

type Direction = "left" | "right" | "none";

type PageFlipControllerProps = {
  routeKey: string;
  left: React.ReactNode;
  right: React.ReactNode;
};

export const PageFlipController: React.FC<PageFlipControllerProps> = ({
  routeKey,
  left,
  right,
}) => {
  const { motionEnabled } = useMotionEnabled();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [prevKey, setPrevKey] = useState(routeKey);
  const [direction, setDirection] = useState<Direction>("none");
  const [flipToken, setFlipToken] = useState(0);

  useEffect(() => {
    if (routeKey === prevKey) return;
    const prevIndex = routeOrder.indexOf(prevKey);
    const nextIndex = routeOrder.indexOf(routeKey);
    if (prevIndex >= 0 && nextIndex >= 0) {
      if (nextIndex > prevIndex) {
        setDirection("right");
      } else if (nextIndex < prevIndex) {
        setDirection("left");
      } else {
        setDirection("none");
      }
    } else {
      setDirection("none");
    }
    setPrevKey(routeKey);
    setFlipToken((x) => x + 1);
  }, [routeKey, prevKey]);

  const use3D = motionEnabled && !isMobile;

  const flipVariants = useMemo(
    () => ({
      initial: (dir: Direction) =>
        dir === "none"
          ? { rotateY: 0, opacity: 0 }
          : {
              rotateY: dir === "right" ? -0.01 : 0.01,
              opacity: 0.9,
            },
      animate: (dir: Direction) =>
        dir === "none"
          ? {
              rotateY: 0,
              opacity: 1,
              transition: { duration: 0.2, ease: [0.2, 0.8, 0.2, 1] },
            }
          : {
              rotateY: dir === "right" ? -180 : 180,
              opacity: 1,
              transition: { duration: 0.52, ease: [0.2, 0.8, 0.2, 1] },
            },
      exit: (dir: Direction) =>
        dir === "none"
          ? { opacity: 0 }
          : {
              opacity: 0,
              transition: { duration: 0.2 },
            },
    }),
    []
  );

  const fadeVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.15 },
    },
  };

  return (
    <Fragment>
      <section className="bw-page bw-left">
        <div className="bw-scroll">{left}</div>
      </section>
      <div className="bw-spine" />
      <section className="bw-page bw-right">
        <div className="bw-scroll">{right}</div>
      </section>

      <AnimatePresence initial={false} mode="wait">
        {direction !== "none" && use3D && (
          <motion.div
            key={flipToken}
            custom={direction}
            variants={flipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={
              direction === "right"
                ? "bw-flip-layer bw-flip-right"
                : "bw-flip-layer bw-flip-left"
            }
          >
            <div className="bw-flip-shadow" />
            <div className="bw-flip-page">
              <div className="bw-flip-front">{right}</div>
              <div className="bw-flip-back">{right}</div>
            </div>
          </motion.div>
        )}
        {!use3D && (
          <motion.div
            key={flipToken}
            variants={fadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bw-flip-layer bw-flip-fade"
          >
            <div className="bw-flip-fade-overlay" />
          </motion.div>
        )}
      </AnimatePresence>
    </Fragment>
  );
};
