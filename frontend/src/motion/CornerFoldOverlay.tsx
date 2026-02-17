import React from "react";
import { useMotionEnabled } from "./useMotionEnabled";

type CornerFoldOverlayProps = {
  direction: "next" | "prev";
  playing: boolean;
};

export const CornerFoldOverlay: React.FC<CornerFoldOverlayProps> = ({
  direction,
  playing,
}) => {
  const { motionEnabled } = useMotionEnabled();

  if (!playing || !motionEnabled) {
    return null;
  }

  const isNext = direction === "next";

  return (
    <div
      className={
        isNext
          ? "bw-fold-overlay bw-fold-overlay-next"
          : "bw-fold-overlay bw-fold-overlay-prev"
      }
    >
      <div className="bw-fold-dim" />
      <div className="bw-fold-corner" />
    </div>
  );
};

