import React from "react";
import { LayoutGroup, motion } from "framer-motion";
import { useMotionPref } from "./MotionProvider";

export const CardSharedRoot: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <LayoutGroup>{children}</LayoutGroup>;
};

export const SharedCover: React.FC<{ id: string; children: React.ReactNode; style?: React.CSSProperties }> = ({ id, children, style }) => {
  const { motionEnabled } = useMotionPref();
  if (!motionEnabled) return <div style={style}>{children}</div>;
  return (
    <motion.div layoutId={`cover-${id}`} style={style}>
      {children}
    </motion.div>
  );
};

