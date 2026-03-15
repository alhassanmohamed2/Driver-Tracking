import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    // Try to load saved language from localStorage, default to English
    const [language, setLanguage] = useState(() => {
        return localStorage.getItem('driverLanguage') || 'en';
    });

    // Helper to update document attributes
    const updateDocumentAttributes = (lang) => {
        const isRtl = ['ar', 'ur'].includes(lang);
        document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
        document.documentElement.lang = lang;
    };

    // Keep document attributes in sync with language state
    useEffect(() => {
        updateDocumentAttributes(language);
    }, [language]);

    const toggleLanguage = () => {
        // Cycle: en -> ar -> ur -> hi -> en
        const langs = ['en', 'ar', 'ur', 'hi'];
        const currentIndex = langs.indexOf(language);
        const newLang = langs[(currentIndex + 1) % langs.length];

        setLanguage(newLang);
        localStorage.setItem('driverLanguage', newLang);
    };

    // Translation function
    const t = (key) => translations[language]?.[key] || key;

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
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
