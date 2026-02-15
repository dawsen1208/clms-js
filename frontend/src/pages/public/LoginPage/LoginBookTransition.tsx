import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionPref } from "../../../motion/MotionProvider";

const penPath = "M2 22 L22 2 M14 2 L22 2 L22 10";

const LoginBookTransition: React.FC<{ running: boolean; status?: "opening" | "idle" }>= ({ running, status = "idle" }) => {
  const { motionEnabled } = useMotionPref();
  const min900Ref = useRef<number>(0);

  useEffect(() => {
    if (running) {
      min900Ref.current = Date.now();
    }
  }, [running]);

  if (!running) return null;

  if (!motionEnabled) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 9999 }}>
        <div>Loading…</div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 9999, display: "grid", placeItems: "center" }}
      >
        <div style={{ perspective: 1200, width: 420, maxWidth: "90vw", height: 280, position: "relative" }}>
          <motion.div
            initial={{ rotateY: 0, scale: 1 }}
            animate={{ rotateY: status === "opening" ? 0 : 180, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ width: "100%", height: "100%", position: "relative", transformStyle: "preserve-3d" }}
          >
            <div style={{ position: "absolute", inset: 0, background: "#fff", backfaceVisibility: "hidden", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} />
            <div style={{ position: "absolute", inset: 0, background: "#faf7f0", transform: "rotateY(180deg)", backfaceVisibility: "hidden", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }} />
          </motion.div>
          <motion.svg width="160" height="80" viewBox="0 0 24 24" style={{ position: "absolute", right: -8, bottom: -8 }}>
            <motion.path d={penPath} stroke="#333" strokeWidth="2" fill="none" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, ease: "easeInOut", delay: 0.2 }} />
          </motion.svg>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoginBookTransition;

