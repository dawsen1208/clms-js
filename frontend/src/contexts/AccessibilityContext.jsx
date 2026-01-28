import React, { createContext, useContext, useState, useEffect } from "react";

const AccessibilityContext = createContext();

export const useAccessibility = () => useContext(AccessibilityContext);

export const AccessibilityProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("accessibility_prefs");
      return raw ? JSON.parse(raw) : { accessibilityMode: false, ttsEnabled: false };
    } catch {
      return { accessibilityMode: false, ttsEnabled: false };
    }
  });

  const updatePrefs = (newPrefs) => {
    const next = { ...prefs, ...newPrefs };
    setPrefs(next);
    localStorage.setItem("accessibility_prefs", JSON.stringify(next));
  };

  const speak = (text) => {
    if (!prefs.ttsEnabled || !text) return;
    // Cancel previous
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Optional: Set language if needed, e.g., utterance.lang = 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const cancelSpeech = () => {
    window.speechSynthesis.cancel();
  };

  // Sync with other tabs/windows
  useEffect(() => {
    const handleStorage = (e) => {
       if (e.key === "accessibility_prefs") {
         try {
          const raw = e.newValue;
          if (raw) setPrefs(JSON.parse(raw));
         } catch {}
       }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <AccessibilityContext.Provider value={{ ...prefs, updatePrefs, speak, cancelSpeech }}>
      {children}
    </AccessibilityContext.Provider>
  );
};
