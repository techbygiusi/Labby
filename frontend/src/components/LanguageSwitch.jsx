import React, { useEffect, useState } from 'react';

export const LANGUAGE_STORAGE_KEY = 'hosting-admin-overlay-language';

const LANGUAGES = [
  { code: 'en', label: 'EN', title: 'English' },
  { code: 'de', label: 'DE', title: 'Deutsch' }
];

export function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'de' || stored === 'en' ? stored : 'en';
  } catch (_) {
    return 'en';
  }
}

export function storeLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    window.dispatchEvent(new CustomEvent('portal-language-change', { detail: { language } }));
  } catch (_) {
    // Keep English as the fallback when storage is unavailable.
  }
}

export default function LanguageSwitch({ value, onChange, className = '' }) {
  const [localValue, setLocalValue] = useState(value || readStoredLanguage());

  useEffect(() => {
    if (value) setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handleChange = (event) => {
      const language = event.detail?.language || readStoredLanguage();
      setLocalValue(language);
      if (onChange) onChange(language);
    };

    window.addEventListener('portal-language-change', handleChange);
    return () => window.removeEventListener('portal-language-change', handleChange);
  }, [onChange]);

  const current = value || localValue;

  const selectLanguage = (language) => {
    setLocalValue(language);
    storeLanguage(language);
    if (onChange) onChange(language);
  };

  return (
    <div className={`language-switch language-switch-${current} ${className}`.trim()} role="group" aria-label="Language">
      <span className="language-switch-thumb" aria-hidden="true" />
      {LANGUAGES.map(option => (
        <button
          key={option.code}
          type="button"
          className={current === option.code ? 'active' : ''}
          onClick={() => selectLanguage(option.code)}
          title={option.title}
          aria-pressed={current === option.code}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
