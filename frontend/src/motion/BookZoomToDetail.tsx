import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Grid } from "antd";
import { motion } from "framer-motion";
import { useMotionEnabled } from "./useMotionEnabled";

type BookZoomToDetailProps = {
  children: React.ReactNode;
};

export const BookZoomToDetail: React.FC<BookZoomToDetailProps> = ({
  children,
}) => {
  const location = useLocation();
  const { motionEnabled } = useMotionEnabled();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const prevPathRef = useRef(location.pathname);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const prev = prevPathRef.current;
    const next = location.pathname;
    prevPathRef.current = next;

    const cameFromReader =
      prev.startsWith("/home") || prev.startsWith("/search");
    const isDetail = next.startsWith("/book/");

    if (!motionEnabled || isMobile) {
      setActive(false);
      return;
    }

    if (cameFromReader && isDetail) {
      setActive(true);
      const t = setTimeout(() => {
        setActive(false);
      }, 420);
      return () => clearTimeout(t);
    }
  }, [location.pathname, motionEnabled, isMobile]);

  const scaleAnimation = active
    ? { scale: [1, 0.98, 1] }
    : { scale: 1 };

  const scaleTransition = active
    ? {
        duration: 0.36,
        times: [0, 0.35, 1],
        ease: [0.2, 0.8, 0.2, 1],
      }
    : { duration: 0.2 };

  return (
    <motion.div
      style={{ position: "relative", width: "100%", height: "100%" }}
      animate={scaleAnimation}
      transition={scaleTransition}
    >
      {active && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 24,
            background:
              "radial-gradient(circle at top, rgba(255,255,255,0.9), rgba(230,220,205,0.9))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 3,
          }}
        >
          <div
            style={{
              width: "72%",
              maxWidth: 640,
              height: "60%",
              borderRadius: 18,
              background:
                "repeating-linear-gradient(135deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 2px, rgba(240,230,215,0.9) 2px, rgba(240,230,215,0.9) 4px)",
              boxShadow: "0 18px 38px rgba(0,0,0,0.22)",
            }}
          />
        </div>
      )}
      {children}
    </motion.div>
  );
};

