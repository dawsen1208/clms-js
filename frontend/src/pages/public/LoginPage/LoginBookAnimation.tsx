import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMotionEnabled } from "../../../motion/useMotionEnabled";

type LoginBookAnimationProps = {
  running: boolean;
  status: "idle" | "signing" | "opening" | "error";
};

const penPath = "M2 22 L22 2 M14 2 L22 2 L22 10";

type Phase = "open" | "closing" | "signed" | "opening";

export const LoginBookAnimation: React.FC<LoginBookAnimationProps> = ({
  running,
  status,
}) => {
  const { motionEnabled } = useMotionEnabled();
  const [phase, setPhase] = useState<Phase>("open");
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    if (!running || !motionEnabled) {
      setPhase("open");
      setShowSignature(false);
      return;
    }

    const closingMs = 900;
    const signingMs = 1200;
    const openingMs = 900;

    setPhase("closing");
    setShowSignature(false);

    const t1 = setTimeout(() => {
      if (status === "error") return;
      setPhase("signed");
      setShowSignature(true);
    }, closingMs);

    const t2 = setTimeout(() => {
      if (status === "error") return;
      setPhase("opening");
    }, closingMs + signingMs);

    const t3 = setTimeout(() => {
      if (status === "error") return;
      setPhase("open");
      setShowSignature(false);
    }, closingMs + signingMs + openingMs);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [running, status, motionEnabled]);

  if (!running) return null;

  if (!motionEnabled) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
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
          <div
            style={{
              padding: "16px 24px",
              borderRadius: 12,
              background: "rgba(0,0,0,0.7)",
            }}
          >
            Signing in…
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const coverRotate =
    phase === "closing" || phase === "signed" ? -160 : 0;

  const shadowOpacity =
    phase === "closing" || phase === "signed" ? 0.4 : 0.18;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(circle at top, rgba(0,0,0,0.8), rgba(0,0,0,0.95))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            perspective: 1400,
            width: 420,
            maxWidth: "92vw",
            height: 260,
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              transformStyle: "preserve-3d",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                background:
                  "linear-gradient(140deg, #fefaf5, #f3e1ce)",
                boxShadow:
                  "0 28px 70px rgba(0,0,0,0.38), 0 12px 24px rgba(0,0,0,0.45)",
              }}
            />
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, #f6e4cf, #e4c4a2)",
                transformOrigin: "left center",
                backfaceVisibility: "hidden",
              }}
              initial={{ rotateY: 0 }}
              animate={{ rotateY: coverRotate }}
              transition={{
                duration: 0.9,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            />
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                background:
                  "radial-gradient(circle at 10% 0%, rgba(255,255,255,0.8), transparent 60%), linear-gradient(140deg,#fdf7f0,#f1e1d2)",
                mixBlendMode: "soft-light",
              }}
              animate={{ opacity: shadowOpacity }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {showSignature && (
            <motion.svg
              width="160"
              height="80"
              viewBox="0 0 24 24"
              style={{
                position: "absolute",
                right: 36,
                bottom: 36,
              }}
            >
              <motion.path
                d={penPath}
                stroke="rgba(60,40,20,0.85)"
                strokeWidth={2.6}
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: 1,
                  ease: "easeInOut",
                }}
              />
            </motion.svg>
          )}

          <div
            style={{
              position: "absolute",
              left: 24,
              bottom: 20,
              fontSize: 12,
              letterSpacing: 0.08,
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            Signing in…
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
