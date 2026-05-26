// src/context/LanguageContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../utils/secureStorage';
import { STORAGE_KEYS } from '../config/constants';

type Lang = 'en' | 'od';

// Port all translations from web LanguageContext exactly
const translations = {
  en: {
    nav: {
      home: 'Home', explore: 'Explore', groups: 'Groups',
      events: 'Events', messages: 'Messages', notifications: 'Notifications',
      members: 'Members', gallery: 'Gallery', profile: 'Profile', settings: 'Settings',
    },
    common: {
      appName: 'Pandara Samaja', appTagline: 'COMMUNITY PORTAL',
      logout: 'Logout', collapse: 'Collapse', expand: 'Expand',
      loading: 'Loading...', error: 'Something went wrong',
    },
  },
  od: {
    nav: {
      home: 'ଘର', explore: 'ଅନ୍ୱେଷଣ', groups: 'ଦଳ',
      events: 'ଅନୁଷ୍ଠାନ', messages: 'ବାର୍ତ୍ତା', notifications: 'ବିଜ୍ଞପ୍ତି',
      members: 'ସଦସ୍ୟ', gallery: 'ଗ୍ୟାଲେରୀ', profile: 'ପ୍ରୋଫାଇଲ', settings: 'ସେଟିଂ',
    },
    common: {
      appName: 'ପଣ୍ଡାର ସମାଜ', appTagline: 'ସାମୁଦାୟିକ ପୋର୍ଟାଲ',
      logout: 'ଲଗ୍ ଆଉଟ', collapse: 'ସଂକୁଚିତ', expand: 'ବିସ୍ତାର',
      loading: 'ଲୋଡ ହେଉଛି...', error: 'କିଛି ଭୁଲ ହୋଇଗଲା',
    },
  },
};

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (section: string, key: string) => string;
}

const LanguageContext = createContext<LangContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    storage.getItem(STORAGE_KEYS.LANGUAGE).then((saved) => {
      if (saved === 'en' || saved === 'od') setLangState(saved);
    });
  }, []);

  const setLang = async (l: Lang) => {
    setLangState(l);
    await storage.setItem(STORAGE_KEYS.LANGUAGE, l);
  };

  const t = (section: string, key: string): string => {
    return (translations[lang] as any)?.[section]?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
