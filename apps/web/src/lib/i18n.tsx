'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import enMessages from '@/locales/en.json';
import hiMessages from '@/locales/hi.json';
import mrMessages from '@/locales/mr.json';
import { Globe, Check } from 'lucide-react';

export type SupportedLanguage = 'en' | 'hi' | 'mr';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (path: string, fallback?: string) => string;
}

const translations: Record<SupportedLanguage, any> = {
  en: enMessages,
  hi: hiMessages,
  mr: mrMessages,
};

export const LANGUAGE_LABELS: Record<SupportedLanguage, { label: string; native: string }> = {
  en: { label: 'English', native: 'English' },
  hi: { label: 'Hindi', native: 'हिन्दी' },
  mr: { label: 'Marathi', native: 'मराठी' },
};

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('en');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('greencity_lang') as SupportedLanguage;
      if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
        setLanguageState(saved);
      }
    }
  }, []);

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('greencity_lang', lang);
    }
  };

  const t = (path: string, fallback?: string): string => {
    const parts = path.split('.');
    let current: any = translations[language];

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // Fallback to English if translation key is missing in target language
        let fallbackEn: any = translations.en;
        for (const p of parts) {
          if (fallbackEn && typeof fallbackEn === 'object' && p in fallbackEn) {
            fallbackEn = fallbackEn[p];
          } else {
            fallbackEn = null;
            break;
          }
        }
        return (typeof fallbackEn === 'string' ? fallbackEn : fallback) || path;
      }
    }

    return typeof current === 'string' ? current : (fallback || path);
  };

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(I18nContext);
  if (!context) {
    // Graceful fallback if used outside provider
    return {
      language: 'en' as SupportedLanguage,
      setLanguage: () => {},
      t: (path: string, fallback?: string) => fallback || path,
    };
  }
  return context;
};

export const LanguageSelector: React.FC<{ variant?: 'header' | 'mobile' }> = ({ variant = 'header' }) => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'mobile') {
    return (
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg">
        {(['en', 'hi', 'mr'] as SupportedLanguage[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLanguage(l)}
            className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-all ${
              language === l
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
            }`}
          >
            {LANGUAGE_LABELS[l].native}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-200 transition-colors"
        aria-expanded={isOpen}
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600" />
        <span>{LANGUAGE_LABELS[language].native}</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            {(['en', 'hi', 'mr'] as SupportedLanguage[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => {
                  setLanguage(l);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors ${
                  language === l
                    ? 'font-bold text-emerald-700 bg-emerald-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{LANGUAGE_LABELS[l].native}</span>
                {language === l && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
