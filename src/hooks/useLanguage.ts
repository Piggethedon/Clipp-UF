import { useState, useEffect } from 'react';
import languageData from '@/data/languages.json';

type Language = 'sv' | 'en';
type LanguageData = typeof languageData;

export function useLanguage() {
  const [currentLanguage, setCurrentLanguage] = useState<Language>('sv');

  const changeLanguage = (lang: Language) => {
    setCurrentLanguage(lang);
    localStorage.setItem('clipp-language', lang);
  };

  useEffect(() => {
    const savedLanguage = localStorage.getItem('clipp-language') as Language;
    if (savedLanguage && (savedLanguage === 'sv' || savedLanguage === 'en')) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  const t = (path: string): string => {
    const keys = path.split('.');
    let value: any = languageData[currentLanguage];
    
    for (const key of keys) {
      value = value?.[key];
    }
    
    return value || path;
  };

  return {
    currentLanguage,
    changeLanguage,
    t,
    languages: ['sv', 'en'] as Language[]
  };
}