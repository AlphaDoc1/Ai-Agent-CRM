
export interface LanguageConfig {
  key: string;
  nativeName: string;
  englishName: string;
  bcp47: string;
  dtmfDigit: string;
}

export const LANGUAGE_REGISTRY: LanguageConfig[] = [
  {
    key: "en",
    nativeName: "English",
    englishName: "English",
    bcp47: "en-IN",
    dtmfDigit: "1"
  },
  {
    key: "hi",
    nativeName: "हिंदी",
    englishName: "Hindi",
    bcp47: "hi-IN",
    dtmfDigit: "2"
  },
  {
    key: "ta",
    nativeName: "தமிழ்",
    englishName: "Tamil",
    bcp47: "ta-IN",
    dtmfDigit: "3"
  },
  {
    key: "te",
    nativeName: "తెలుగు",
    englishName: "Telugu",
    bcp47: "te-IN",
    dtmfDigit: "4"
  },
  {
    key: "kn",
    nativeName: "ಕನ್ನಡ",
    englishName: "Kannada",
    bcp47: "kn-IN",
    dtmfDigit: "5"
  },
  {
    key: "mr",
    nativeName: "मराठी",
    englishName: "Marathi",
    bcp47: "mr-IN",
    dtmfDigit: "6"
  },
  {
    key: "bn",
    nativeName: "বাংলা",
    englishName: "Bengali",
    bcp47: "bn-IN",
    dtmfDigit: "7"
  },
  {
    key: "gu",
    nativeName: "ગુજરાતી",
    englishName: "Gujarati",
    bcp47: "gu-IN",
    dtmfDigit: "8"
  }
];

export function getLanguageByDigit(digit: string): LanguageConfig | null {
  return LANGUAGE_REGISTRY.find(lang => lang.dtmfDigit === digit) || null;
}

export function getLanguageByKey(key: string): LanguageConfig | null {
  return LANGUAGE_REGISTRY.find(lang => lang.key === key) || null;
}

