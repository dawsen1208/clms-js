import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

const AccessibilityContext = createContext();

export const useAccessibility = () => useContext(AccessibilityContext);

const normalizeBool = (value) => {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") return value.trim().toLowerCase() === "true" || value.trim() === "1";
  return false;
};

const normalizePrefs = (input) => {
  const v = input && typeof input === "object" ? input : {};
  return {
    accessibilityMode: normalizeBool(v.accessibilityMode),
    ttsEnabled: normalizeBool(v.ttsEnabled),
  };
};

export const AccessibilityProvider = ({ children }) => {
  const [prefs, setPrefs] = useState(() => {
    try {
      const raw = localStorage.getItem("accessibility_prefs");
      return raw ? normalizePrefs(JSON.parse(raw)) : { accessibilityMode: false, ttsEnabled: false };
    } catch {
      return { accessibilityMode: false, ttsEnabled: false };
    }
  });

  // Use a ref to track enabled state to prevent stale closures in event listeners/timeouts
  const ttsEnabledRef = useRef(prefs.ttsEnabled);

  const getSpeechSynthesis = useCallback(() => {
    try {
      const s = typeof window !== "undefined" ? window.speechSynthesis : null;
      if (!s) return null;
      if (typeof s.cancel !== "function") return null;
      if (typeof s.speak !== "function") return null;
      return s;
    } catch {
      return null;
    }
  }, []);

  const safeCancelSpeech = useCallback(() => {
    const s = getSpeechSynthesis();
    if (!s) return;
    try {
      s.cancel();
    } catch {
      void 0;
    }
  }, [getSpeechSynthesis]);

  useEffect(() => {
    ttsEnabledRef.current = prefs.ttsEnabled;
  }, [prefs.ttsEnabled]);

  const updatePrefs = (newPrefs) => {
    setPrefs((prev) => {
      const next = normalizePrefs({ ...prev, ...newPrefs });
      try {
        localStorage.setItem("accessibility_prefs", JSON.stringify(next));
      } catch (e) {
        void e;
      }
      return next;
    });
  };

  const speak = useCallback((text) => {
    // strict check against ref to ensure we never speak if disabled
    if (!ttsEnabledRef.current || !text) return;
    
    const s = getSpeechSynthesis();
    if (!s) return;
    if (typeof SpeechSynthesisUtterance !== "function") return;

    try {
      s.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      s.speak(utterance);
    } catch {
      void 0;
    }
  }, [getSpeechSynthesis]);

  const cancelSpeech = useCallback(() => safeCancelSpeech(), [safeCancelSpeech]);

  // 🗣️ Global TTS Listener
  useEffect(() => {
    // If disabled, ensure any ongoing speech is cancelled immediately
    if (!prefs.ttsEnabled) {
      safeCancelSpeech();
      return;
    }

    let debounceTimer;

    const handleInteraction = (e) => {
      // Double check ref to be safe
      if (!ttsEnabledRef.current) return;

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
        // Reduced to 100ms for more timely feedback as requested
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
           if (ttsEnabledRef.current) {
             speak(text);
           }
        }, 100); 
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
      safeCancelSpeech();
    };
  }, [prefs.ttsEnabled, safeCancelSpeech, speak]);

  // Sync with other tabs/windows
  useEffect(() => {
    const handleStorage = (e) => {
       if (e.key === "accessibility_prefs") {
         try {
          const raw = e.newValue;
          if (raw) setPrefs(normalizePrefs(JSON.parse(raw)));
         } catch (err) {
           console.error("Failed to sync accessibility prefs from storage", err);
         }
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
