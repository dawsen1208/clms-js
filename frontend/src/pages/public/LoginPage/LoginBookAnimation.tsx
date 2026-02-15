import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionEnabled } from "../../../motion/useMotionEnabled";

type LoginBookAnimationProps = {
  running: boolean;
  status: "idle" | "signing" | "opening" | "error";
};

const penPath = "M2 22 L22 2 M14 2 L22 2 L22 10";

export const LoginBookAnimation: React.FC<LoginBookAnimationProps> = ({
  running,
  status,
}) => {
  const { motionEnabled } = useMotionEnabled();
  const [phase, setPhase] = useState<"open" | "closed" | "reopen">("open");

  useEffect(() => {
    if (!running) return;
    setPhase("open");
    const t1 = setTimeout(() => setPhase("closed"), 40);
    const t2 = setTimeout(() => {
      if (status !== "error") {
        setPhase("reopen");
      }
    }, 600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [running, status]);

  if (!running) return null;

  if (!motionEnabled) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          zIndex: 2000,
        }}
      >
        <div>Signing in…</div>
      </div>
    );
  }

  const isClosed = phase === "closed";
  const isReopen = phase === "reopen";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background: "radial-gradient(circle at top, rgba(0,0,0,0.8), rgba(0,0,0,0.95))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            perspective: 1200,
            width: 420,
            maxWidth: "92vw",
            height: 260,
            position: "relative",
          }}
        >
          <motion.div
            initial={{ rotateY: 0 }}
            animate={{
              rotateY: isClosed ? 180 : isReopen ? 0 : 0,
            }}
            transition={{
              duration: 0.9,
              ease: [0.2, 0.8, 0.2, 1],
            }}
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, #fefaf5, #f1e1ce)",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
                backfaceVisibility: "hidden",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(135deg, #f1e1ce, #e4c4a2)",
                borderRadius: 16,
                boxShadow: "0 24px 60px rgba(0,0,0,0.32)",
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            />
          </motion.div>

          <motion.svg
            width="160"
            height="80"
            viewBox="0 0 24 24"
            style={{
              position: "absolute",
              right: -18,
              bottom: -10,
            }}
          >
            <motion.path
              d={penPath}
              stroke="#f5f0e6"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: isClosed ? 1 : 0 }}
              transition={{
                duration: 0.32,
                ease: "easeInOut",
                delay: 0.25,
              }}
            />
          </motion.svg>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

