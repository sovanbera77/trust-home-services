import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { useStore } from './store';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'mr', label: 'मराठी' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' }
];

const resources = {
  en: {
    translation: {
      app_name: 'Trust Home Services',
      dashboard: 'Dashboard',
      logout: 'Logout',
      language: { title: 'Language' }
    }
  },
  bn: {
    translation: {
      app_name: 'ট্রাস্ট হোম সার্ভিসেস',
      dashboard: 'ড্যাশবোর্ড',
      logout: 'লগ আউট',
      language: { title: 'ভাষা' }
    }
  },
  hi: {
    translation: {
      app_name: 'ट्रस्ट होम सर्विसेज',
      dashboard: 'डैशबोर्ड',
      logout: 'लॉग आउट',
      language: { title: 'भाषा' }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

// Polyfill the existing `t` function used globally
export const t = (key: string, fallback?: string): string => {
  const currentLang = useStore.getState().lang || 'en';
  // Attempt to use i18next if the key exists
  const value = i18n.getResource(currentLang, 'translation', key);
  if (value) return value;
  
  if (fallback) return fallback;

  // If no translation or fallback is found, elegantly format the key into readable English
  // e.g. "dashboard.newRequest" -> "New Request"
  const parts = key.split('.');
  const lastPart = parts[parts.length - 1];
  
  return lastPart
    .replace(/([A-Z])/g, ' $1') // Insert space before capital letters
    .replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
    .trim();
};

export default i18n;
