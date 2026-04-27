import { Globe } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: {
          InlineLayout?: {
            SIMPLE: unknown;
          };
          new (
            options: {
              pageLanguage: string;
              includedLanguages: string;
              autoDisplay: boolean;
              layout?: unknown;
            },
            elementId: string,
          ): unknown;
        };
      };
    };
    googleTranslateElementInit?: () => void;
    __phoneFormatterTranslateReady?: boolean;
  }
}

const GOOGLE_SCRIPT_ID = "google-translate-script";
const STORAGE_KEY = "phone-formatter-language";

export const LANGUAGE_OPTIONS: ReadonlyArray<{
  label: string;
  code: string;
  italic?: boolean;
}> = [
  { label: "Afrikaans", code: "af" },
  { label: "Albanian", code: "sq" },
  { label: "Amharic", code: "am" },
  { label: "Arabic", code: "ar" },
  { label: "Armenian", code: "hy" },
  { label: "Azerbaijani", code: "az" },
  { label: "Basque", code: "eu" },
  { label: "Belarusian", code: "be" },
  { label: "Bengali", code: "bn" },
  { label: "Bosnian", code: "bs" },
  { label: "Bulgarian", code: "bg" },
  { label: "Catalan", code: "ca" },
  { label: "Cebuano", code: "ceb" },
  { label: "Chinese (Simplified)", code: "zh-CN" },
  { label: "Chinese (Traditional)", code: "zh-TW" },
  { label: "Corsican", code: "co" },
  { label: "Croatian", code: "hr" },
  { label: "Czech", code: "cs" },
  { label: "Danish", code: "da" },
  { label: "Dutch", code: "nl" },
  { label: "English", code: "en" },
  { label: "Esperanto", code: "eo" },
  { label: "Estonian", code: "et" },
  { label: "Filipino", code: "tl" },
  { label: "Finnish", code: "fi" },
  { label: "French", code: "fr" },
  { label: "Frisian", code: "fy" },
  { label: "Galician", code: "gl" },
  { label: "Hindi", code: "hi" },
  { label: "Haitian Creole", code: "ht" },
  { label: "Hausa", code: "ha" },
  { label: "Hawaiian", code: "haw" },
  { label: "Hebrew", code: "iw" },
  { label: "Hmong", code: "hmn" },
  { label: "Hungarian", code: "hu" },
  { label: "Icelandic", code: "is" },
  { label: "Igbo", code: "ig" },
  { label: "Indonesian", code: "id" },
  { label: "Irish", code: "ga" },
  { label: "Italian", code: "it" },
  { label: "Japanese", code: "ja" },
  { label: "Javanese", code: "jw" },
  { label: "Kannada", code: "kn" },
  { label: "Kazakh", code: "kk" },
  { label: "Khmer", code: "km" },
  { label: "Kinyarwanda", code: "rw" },
  { label: "Korean", code: "ko" },
  { label: "Kurdish", code: "ku" },
  { label: "Kyrgyz", code: "ky" },
  { label: "Lao", code: "lo" },
  { label: "Latin", code: "la" },
  { label: "Latvian", code: "lv" },
  { label: "Lithuanian", code: "lt" },
  { label: "Luxembourgish", code: "lb" },
  { label: "Macedonian", code: "mk" },
  { label: "Malagasy", code: "mg" },
  { label: "Malay", code: "ms" },
  { label: "Malayalam", code: "ml" },
  { label: "Maltese", code: "mt" },
  { label: "Maori", code: "mi" },
  { label: "Marathi", code: "mr" },
  { label: "Mongolian", code: "mn" },
  { label: "Myanmar (Burmese)", code: "my" },
  { label: "Nepali", code: "ne" },
  { label: "Norwegian", code: "no" },
  { label: "Nyanja", code: "ny" },
  { label: "Odia", code: "or" },
  { label: "Pashto", code: "ps" },
  { label: "Persian", code: "fa" },
  { label: "Polish", code: "pl" },
  { label: "Portuguese", code: "pt" },
  { label: "Punjabi", code: "pa" },
  { label: "Romanian", code: "ro" },
  { label: "Russian", code: "ru" },
  { label: "Samoan", code: "sm" },
  { label: "Scots Gaelic", code: "gd" },
  { label: "Serbian", code: "sr" },
  { label: "Sesotho", code: "st" },
  { label: "Shona", code: "sn" },
  { label: "Sindhi", code: "sd" },
  { label: "Sinhala", code: "si" },
  { label: "Slovak", code: "sk" },
  { label: "Slovenian", code: "sl" },
  { label: "Somali", code: "so" },
  { label: "German", code: "de" },
  { label: "Spanish", code: "es" },
  { label: "Sundanese", code: "su" },
  { label: "Swahili", code: "sw" },
  { label: "Swedish", code: "sv" },
  { label: "Tajik", code: "tg" },
  { label: "Tamil", code: "ta" },
  { label: "Tatar", code: "tt" },
  { label: "Telugu", code: "te" },
  { label: "Thai", code: "th" },
  { label: "Turkish", code: "tr" },
  { label: "Turkmen", code: "tk" },
  { label: "Ukrainian", code: "uk" },
  { label: "Urdu", code: "ur" },
  { label: "Uyghur", code: "ug" },
  { label: "Uzbek", code: "uz" },
  { label: "Vietnamese", code: "vi" },
  { label: "Welsh", code: "cy" },
  { label: "Xhosa", code: "xh" },
  { label: "Yiddish", code: "yi" },
  { label: "Yoruba", code: "yo" },
  { label: "Zulu", code: "zu" },
];

const FOOTER_LANGUAGE_CODES = ["en", "de", "es", "fr", "it", "pt", "id", "ru", "th", "ar"];

const FOOTER_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS.filter((language) =>
  FOOTER_LANGUAGE_CODES.includes(language.code),
);

type LanguageCode = (typeof LANGUAGE_OPTIONS)[number]["code"];

function formatLanguageTriggerLabel(languageCode: string) {
  const [baseCode] = languageCode.split("-");
  return baseCode ? `${baseCode.charAt(0).toUpperCase()}${baseCode.slice(1)}` : "En";
}

function getGoogleTranslateCookieValue(languageCode: string) {
  return `/en/${languageCode}`;
}

function setGoogleTranslateCookie(languageCode: string) {
  const value = getGoogleTranslateCookieValue(languageCode);
  const cookie = `googtrans=${value}; path=/`;

  document.cookie = cookie;

  const hostname = window.location.hostname;

  if (hostname.includes(".")) {
    document.cookie = `${cookie}; domain=${hostname}`;
  }
}

function getStoredLanguage() {
  const cookieMatch = document.cookie.match(/(?:^|;\s*)googtrans=([^;]+)/);

  if (cookieMatch?.[1]) {
    const cookieValue = decodeURIComponent(cookieMatch[1]);
    const languageFromCookie = cookieValue.split("/").pop();

    if (languageFromCookie) {
      return languageFromCookie;
    }
  }

  return window.localStorage.getItem(STORAGE_KEY) ?? "en";
}

function getTranslateSelect() {
  return document.querySelector<HTMLSelectElement>(".goog-te-combo");
}

function dispatchTranslateChange(languageCode: string) {
  const select = getTranslateSelect();

  if (!select) {
    return false;
  }

  select.value = languageCode;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  document.documentElement.lang = languageCode;
  window.localStorage.setItem(STORAGE_KEY, languageCode);
  return true;
}

function translateToLanguage(languageCode: LanguageCode, selectedLanguage: string) {
  if (languageCode === selectedLanguage) {
    return;
  }

  setGoogleTranslateCookie(languageCode);
  window.localStorage.setItem(STORAGE_KEY, languageCode);
  document.documentElement.lang = languageCode;

  if (dispatchTranslateChange(languageCode)) {
    window.setTimeout(() => {
      window.location.reload();
    }, 150);
    return;
  }

  window.location.reload();
}

function useTranslatorState() {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translatorStatus, setTranslatorStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    const storedLanguage = getStoredLanguage();
    setSelectedLanguage(storedLanguage);

    const initializeTranslator = () => {
      if (
        window.google?.translate?.TranslateElement &&
        !window.__phoneFormatterTranslateReady
      ) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: LANGUAGE_OPTIONS.map((language) => language.code).join(","),
            autoDisplay: false,
            layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE,
          },
          "google_translate_element",
        );

        window.__phoneFormatterTranslateReady = true;
      }

      if (!window.__phoneFormatterTranslateReady) {
        return;
      }

      setTranslatorStatus("ready");

      const languageToApply = getStoredLanguage();
      window.setTimeout(() => {
        dispatchTranslateChange(languageToApply);
      }, 250);
    };

    window.googleTranslateElementInit = initializeTranslator;

    if (window.google?.translate?.TranslateElement) {
      initializeTranslator();
      return undefined;
    }

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;

    const handleScriptLoad = () => {
      window.setTimeout(() => {
        if (window.google?.translate?.TranslateElement) {
          initializeTranslator();
          return;
        }

        setTranslatorStatus("error");
      }, 150);
    };

    const handleScriptError = () => {
      setTranslatorStatus("error");
    };

    if (existingScript) {
      existingScript.addEventListener("load", handleScriptLoad);
      existingScript.addEventListener("error", handleScriptError);
      handleScriptLoad();

      return () => {
        existingScript.removeEventListener("load", handleScriptLoad);
        existingScript.removeEventListener("error", handleScriptError);
      };
    }

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src = "https://translate.google.com/translate_a/element.js";
    script.async = true;
    script.addEventListener("load", handleScriptLoad);
    script.addEventListener("error", handleScriptError);
    document.body.appendChild(script);

    const timeoutId = window.setTimeout(() => {
      if (!window.google?.translate?.TranslateElement) {
        setTranslatorStatus("error");
      }
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", handleScriptLoad);
      script.removeEventListener("error", handleScriptError);
    };
  }, []);

  const selectLanguage = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    translateToLanguage(languageCode as LanguageCode, selectedLanguage);
  };

  return { selectedLanguage, selectLanguage, translatorStatus };
}

export function LanguageSelector({
  className,
}: {
  className?: string;
}) {
  const { selectedLanguage, selectLanguage } = useTranslatorState();
  const triggerLabel = formatLanguageTriggerLabel(selectedLanguage);

  return (
    <Select value={selectedLanguage} onValueChange={selectLanguage}>
      <SelectTrigger
        className={className ?? "h-9 w-[156px] bg-background"}
        data-testid="select-language"
        aria-label="Select language"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="En">{triggerLabel}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="max-h-72 overflow-y-auto">
        {LANGUAGE_OPTIONS.map((language) => (
          <SelectItem key={language.code} value={language.code}>
            <span className={language.italic ? "italic" : undefined}>{language.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LanguageBar() {
  const { selectedLanguage, selectLanguage, translatorStatus } = useTranslatorState();

  return (
    <div className="border-t bg-background/95">
      <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-semibold leading-none text-foreground">
          {FOOTER_LANGUAGE_OPTIONS.map((language) => {
            const isActive = selectedLanguage === language.code;

            return (
              <button
                key={language.code}
                type="button"
                onClick={() => selectLanguage(language.code)}
                className={[
                  "cursor-pointer py-1 transition-colors hover:text-primary",
                  language.italic ? "italic" : "",
                  isActive ? "text-primary" : "text-foreground",
                ]
                  .filter(Boolean)
                  .join(" ")}
                data-testid={`button-language-${language.code}`}
              >
                {language.label}
              </button>
            );
          })}
        </div> 
      </div>
    </div>
  );
}
