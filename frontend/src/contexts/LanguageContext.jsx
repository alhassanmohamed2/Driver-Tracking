import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Try to load saved language from localStorage, default to English
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('driverLanguage') || 'en';
    });

    // Set initial direction on mount
    useEffect(() => {
        const isRtl = ['ar', 'ur'].includes(language);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = language;
    }, []);

    const toggleLanguage = () => {
        // Cycle: en -> ar -> ur -> hi -> en
        const langs = ['en', 'ar', 'ur', 'hi'];
        const currentIndex = langs.indexOf(language);
        const newLang = langs[(currentIndex + 1) % langs.length];

        setLanguage(newLang);
        localStorage.setItem('driverLanguage', newLang);

        // Update document direction: ar and ur are rtl, others ltr
        const isRtl = ['ar', 'ur'].includes(newLang);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = newLang;
    };

    // Translation function
    const t = (key) => translations[language]?.[key] || key;

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
