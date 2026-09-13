"use client"

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from './translations';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['es']) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>('es');

  // Load language from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('hp_lang') as Language;
    if (savedLang && (savedLang === 'es' || savedLang === 'en' || savedLang === 'ht')) {
      setLanguage(savedLang);
    }
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('hp_lang', lang);
  };

  const t = (key: keyof typeof translations['es']): string => {
    return translations[language][key] || translations['es'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
