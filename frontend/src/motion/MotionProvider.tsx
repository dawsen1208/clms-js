import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type MotionContextType = {
  motionEnabled: boolean;
  setMotionEnabled: (on: boolean) => void;
};

const MotionContext = createContext<MotionContextType>({
  motionEnabled: true,
  setMotionEnabled: () => {},
});

export const useMotionPref = () => useContext(MotionContext);

export const MotionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      // @ts-ignore
      const mql = ("matches" in e) ? e : mq;
      setPrefersReduced(mql.matches);
    };
    try {
      // Modern browsers
      mq.addEventListener("change", handler as EventListener);
      return () => mq.removeEventListener("change", handler as EventListener);
    } catch {
      // Fallback
      // @ts-ignore
      mq.addListener(handler);
      // @ts-ignore
      return () => mq.removeListener(handler);
    }
  }, []);
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ilms_motion");
      if (!saved) return true;
      return saved === "on";
    } catch {
      return true;
    }
  });

  const motionEnabled = useMemo(() => enabled && !prefersReduced, [enabled, prefersReduced]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "ilms_motion" && e.newValue) {
        setEnabled(e.newValue === "on");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const api = useMemo<MotionContextType>(() => ({
    motionEnabled,
    setMotionEnabled: (on: boolean) => {
      setEnabled(on);
      try {
        localStorage.setItem("ilms_motion", on ? "on" : "off");
        window.dispatchEvent(new StorageEvent("storage", { key: "ilms_motion", newValue: on ? "on" : "off" }));
      } catch {}
    }
  }), [motionEnabled]);

  return (
    <MotionContext.Provider value={api}>
      {children}
    </MotionContext.Provider>
  );
};
