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

  // 🗣️ Global TTS Listener
  useEffect(() => {
    if (!prefs.ttsEnabled) return;

    let debounceTimer;

    const handleInteraction = (e) => {
      let target = e.target;
      
      // 1. Handle Text Nodes (Node.TEXT_NODE === 3)
      if (target.nodeType === 3) {
        target = target.parentElement;
      }

      if (!target) return;

      // 2. Find meaningful text (Traverse up slightly to find accessible labels)
      let text = "";
      let current = target;
      let depth = 0;

      while (current && depth < 3) {
        if (current.getAttribute) { // Check if element has attributes
          text = current.getAttribute("aria-label") || 
                 current.getAttribute("title") || 
                 current.getAttribute("alt");
          if (text) break;
        }
        current = current.parentElement;
        depth++;
      }

      // 3. Fallback to direct text content if no label found
      if (!text && target.innerText && target.innerText.trim().length > 0 && target.innerText.length < 100) {
        // Ignore container elements that might contain a lot of text
        // Only read if it looks like a leaf node or simple container
        if (!target.children.length || target.children.length < 3) {
           text = target.innerText.trim();
        }
      }

      if (text) {
        // 4. Debounce to prevent "choppy" audio when moving mouse quickly
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
           speak(text);
        }, 300); 
      }
    };

    // Listen to focus and mouseover for exploration
    document.addEventListener('focusin', handleInteraction);
    // Use mouseover (bubbling) instead of mouseenter (capture) for better target resolution
    // But mouseover bubbles, so we might get many events. 
    // Actually mouseover is better than mouseenter capture for traversing up.
    document.addEventListener('mouseover', handleInteraction);

    return () => {
      document.removeEventListener('focusin', handleInteraction);
      document.removeEventListener('mouseover', handleInteraction);
      clearTimeout(debounceTimer);
      window.speechSynthesis.cancel();
    };
  }, [prefs.ttsEnabled]);

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
