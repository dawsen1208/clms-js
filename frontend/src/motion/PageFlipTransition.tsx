import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { Grid } from "antd";
import { useMotionPref } from "./MotionProvider";

const routeOrder = ["home","search","borrow","return","assistant","notifications","feedback","profile","settings"];

const getKeyFromPath = (pathname: string) => {
  const seg = pathname.split("/").filter(Boolean)[0] || "home";
  return seg;
};

export const PageFlipTransition: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navType = useNavigationType();
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { motionEnabled } = useMotionPref();

  const [prevKey, setPrevKey] = useState(getKeyFromPath(location.pathname));
  const curKey = getKeyFromPath(location.pathname);
  const directionRef = useRef<"left" | "right" | "none">("none");

  useEffect(() => {
    const prevIdx = routeOrder.indexOf(prevKey);
    const curIdx = routeOrder.indexOf(curKey);
    if (prevIdx >= 0 && curIdx >= 0) {
      directionRef.current = curIdx > prevIdx ? "right" : curIdx < prevIdx ? "left" : "none";
    } else {
      directionRef.current = "none";
    }
    setPrevKey(curKey);
  }, [curKey, prevKey]);

  const flipVariants = useMemo<Variants>(() => {
    const base = {
      duration: 0.52,
      ease: [0.2, 0.8, 0.2, 1],
    };
    return {
      initial: (dir: any) =>
        dir === "none" ? { opacity: 0, rotateY: 0 } : { opacity: 0.9, rotateY: dir === "right" ? 15 : -15 },
      animate: (dir: any) =>
        dir === "none"
          ? { opacity: 1, rotateY: 0, transition: { ...base, duration: 0.28 } }
          : { opacity: 1, rotateY: 0, transition: base },
      exit: (dir: any) =>
        dir === "none" ? { opacity: 0 } : { opacity: 0.85, rotateY: dir === "right" ? -25 : 25, transition: base },
    };
  }, []);

  const slideVariants: Variants = {
    initial: (dir: any) => ({ opacity: 0, x: dir === "right" ? 30 : dir === "left" ? -30 : 0 }),
    animate: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } },
    exit: (dir: any) => ({ opacity: 0, x: dir === "right" ? -20 : dir === "left" ? 20 : 0, transition: { duration: 0.24 } }),
  };

  const dir = directionRef.current;
  const use3D = motionEnabled && !isMobile;

  return (
    <div style={{ position: "relative", height: "100%", perspective: 1200, overflow: "hidden" }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          custom={dir}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ height: "100%", willChange: "transform", transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
          variants={use3D ? flipVariants : slideVariants}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
