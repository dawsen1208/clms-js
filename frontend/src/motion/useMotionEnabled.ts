import { useMotionPref } from "./MotionProvider";

export const useMotionEnabled = () => {
  const { motionEnabled, setMotionEnabled } = useMotionPref();
  return { motionEnabled, setMotionEnabled };
};

