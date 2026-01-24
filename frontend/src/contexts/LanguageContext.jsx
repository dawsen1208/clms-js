import React, { createContext, useState, useContext, useEffect } from "react";
import { translations } from "../utils/translations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("app_language") || "en";
  });

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  const t = (path, params = {}) => {
    const keys = path.split(".");
    let current = translations[language];
    for (const key of keys) {
      if (current[key] === undefined) return path;
      current = current[key];
    }

    if (typeof current === "string" && Object.keys(params).length > 0) {
      let result = current;
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`{${key}}`, "g"), value);
      }
      return result;
    }

    return current;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
