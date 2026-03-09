import React, {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Grid } from "antd";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { useMotionEnabled } from "./useMotionEnabled";
import { CornerFoldOverlay } from "./CornerFoldOverlay";
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
  const [displayLeft, setDisplayLeft] = useState<React.ReactNode>(left);
  const [displayRight, setDisplayRight] = useState<React.ReactNode>(right);
  const [flipFrom, setFlipFrom] = useState<{
    left: React.ReactNode;
    right: React.ReactNode;
  } | null>(null);
  const [flipTo, setFlipTo] = useState<{
    left: React.ReactNode;
    right: React.ReactNode;
  } | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const directionRef = useRef<Direction>("none");
  const [showFold, setShowFold] = useState(false);
  const foldTimeoutRef = useRef<number | null>(null);

  const use3D = motionEnabled && !isMobile;

  useEffect(() => {
    if (routeKey === prevKey) {
      setDisplayLeft(left);
      setDisplayRight(right);
      return;
    }

    const prevIndex = routeOrder.indexOf(prevKey);
    const nextIndex = routeOrder.indexOf(routeKey);

    if (prevIndex >= 0 && nextIndex >= 0) {
      if (nextIndex > prevIndex) {
        directionRef.current = "right";
      } else if (nextIndex < prevIndex) {
        directionRef.current = "left";
      } else {
        directionRef.current = "none";
      }
    } else {
      directionRef.current = "none";
    }

    setDirection(directionRef.current);
    setFlipFrom({ left: displayLeft, right: displayRight });
    setFlipTo({ left, right });
    setPrevKey(routeKey);
    setFlipToken((x) => x + 1);

    if (directionRef.current === "none") {
      setIsFlipping(false);
      setShowFold(false);
      return;
    }

    if (!use3D) {
      setShowFold(false);
      setIsFlipping(true);
      return;
    }

    setShowFold(true);
    setIsFlipping(false);

    if (foldTimeoutRef.current) {
      window.clearTimeout(foldTimeoutRef.current);
    }

    foldTimeoutRef.current = window.setTimeout(() => {
      setShowFold(false);
      setIsFlipping(true);
    }, 600);
  }, [routeKey, prevKey, left, right, displayLeft, displayRight, use3D]);

  const flipVariants = useMemo<Variants>(
    () => ({
      initial: (dir: any) =>
        dir === "none"
          ? { rotateY: 0, opacity: 0 }
          : {
              rotateY: 0,
              opacity: 1,
              skewY: 0,
              rotateZ: 0,
            },
      animate: (dir: any) =>
        dir === "none"
          ? {
              rotateY: 0,
              opacity: 0,
            }
          : {
              rotateY:
                dir === "right"
                  ? [0, -60, -120, -175]
                  : [0, 60, 120, 175],
              skewY: [0, 1.5, 1.2, 0.4],
              rotateZ: [0, 0.6, 0.4, 0],
              opacity: 1,
              transition: {
                duration: 2.2,
                ease: [0.18, 0.9, 0.2, 1],
              },
            },
      exit: () => ({
        opacity: 0,
        transition: { duration: 0.18 },
      }),
    }),
    []
  );

  const fadeVariants: Variants = {
    initial: (dir: any) => ({
      opacity: 0,
      x: dir === "right" ? 32 : dir === "left" ? -32 : 0,
    }),
    animate: (dir: any) => ({
      opacity: 1,
      x: 0,
      transition: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
    }),
    exit: (dir: any) => ({
      opacity: 0,
      x: dir === "right" ? -16 : dir === "left" ? 16 : 0,
      transition: { duration: 0.15 },
    }),
  };

  const handleFlipComplete = () => {
    if (flipTo) {
      setDisplayLeft(flipTo.left);
      setDisplayRight(flipTo.right);
    }
    setIsFlipping(false);
    setFlipFrom(null);
    setFlipTo(null);
    setShowFold(false);
  };

  useEffect(() => {
    return () => {
      if (foldTimeoutRef.current) {
        window.clearTimeout(foldTimeoutRef.current);
      }
    };
  }, []);

  return (
    <Fragment>
      <section className="bw-page bw-left">
        <div className="bw-scroll">{displayLeft}</div>
      </section>
      <div className="bw-spine" />
      <section className="bw-page bw-right">
        <div className="bw-scroll">{displayRight}</div>
      </section>

      <AnimatePresence initial={false} mode="wait">
        {showFold && direction !== "none" && use3D && (
          <CornerFoldOverlay
            direction={direction === "right" ? "next" : "prev"}
            playing={showFold}
          />
        )}
        {isFlipping && direction !== "none" && use3D && flipFrom && flipTo && (
          <motion.div
            key={flipToken}
            custom={direction}
            variants={flipVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onAnimationComplete={handleFlipComplete}
            className={
              direction === "right"
                ? "bw-flip-layer bw-flip-right"
                : "bw-flip-layer bw-flip-left"
            }
          >
            <div className="bw-flip-shadow" />
            <div className="bw-flip-page">
              <div className="bw-flip-front">
                {direction === "right" ? flipFrom.right : flipFrom.left}
              </div>
              <div className="bw-flip-back">
                {direction === "right" ? flipTo.right : flipTo.left}
              </div>
              <div className="bw-flip-edge-highlight" />
            </div>
          </motion.div>
        )}
        {!use3D && direction !== "none" && (
          <motion.div
            key={flipToken}
            custom={direction}
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
