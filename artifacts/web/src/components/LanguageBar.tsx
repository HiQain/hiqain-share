import { Globe } from "lucide-react";
import { useEffect, useSyncExternalStore } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STORAGE_KEY = "phone-formatter-language";
const PAGE_SOURCE_LANG = "en";
const OBSERVER_DEBOUNCE_MS = 350;

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

function formatLanguageTriggerLabel(languageCode: string) {
  const [baseCode] = languageCode.split("-");
  return baseCode ? `${baseCode.charAt(0).toUpperCase()}${baseCode.slice(1)}` : "En";
}

// --- In-page translation engine -------------------------------------------
// Translates the rendered DOM directly via Google's translate endpoint,
// instead of Google's Website Translator widget (which injects the
// "Translated to: X / Show original" banner and forces a full page reload).

type AttributeName = "placeholder" | "alt" | "title";

type AttributeTarget = {
  element: HTMLElement;
  attribute: AttributeName;
  original: string;
};

const translationCache = new Map<string, string>();
const originalTextNodes = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<HTMLElement, Partial<Record<AttributeName, string>>>();

let currentLanguage = getStoredLanguage();
let activeRequestId = 0;
let observer: MutationObserver | null = null;
let observerDebounceTimer: number | undefined;
let initialized = false;

const listeners = new Set<() => void>();

function getStoredLanguage() {
  if (typeof window === "undefined") {
    return PAGE_SOURCE_LANG;
  }
  return window.localStorage.getItem(STORAGE_KEY) ?? PAGE_SOURCE_LANG;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return currentLanguage;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function shouldSkipTextNode(node: Text) {
  const parent = node.parentElement;

  if (!parent || !node.nodeValue || !node.nodeValue.trim()) {
    return true;
  }

  if (parent.closest(".notranslate")) {
    return true;
  }

  if (parent.closest("script, style, noscript, iframe, svg, code, pre, textarea, input, select")) {
    return true;
  }

  return false;
}

function collectTextNodes(): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (shouldSkipTextNode(node as Text) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    if (!originalTextNodes.has(textNode)) {
      originalTextNodes.set(textNode, textNode.nodeValue ?? "");
    }
    nodes.push(textNode);
    current = walker.nextNode();
  }

  return nodes;
}

function collectAttributeTargets(): AttributeTarget[] {
  const elements = document.querySelectorAll<HTMLElement>(
    "input[placeholder], textarea[placeholder], img[alt], [title]",
  );
  const targets: AttributeTarget[] = [];
  const attributeNames: AttributeName[] = ["placeholder", "alt", "title"];

  elements.forEach((element) => {
    if (element.closest(".notranslate")) {
      return;
    }

    attributeNames.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) {
        return;
      }

      const value = element.getAttribute(attribute);
      if (!value || !value.trim()) {
        return;
      }

      let stored = originalAttributes.get(element);
      if (!stored) {
        stored = {};
        originalAttributes.set(element, stored);
      }
      if (!stored[attribute]) {
        stored[attribute] = value;
      }

      targets.push({ element, attribute, original: stored[attribute]! });
    });
  });

  return targets;
}

function restoreOriginalContent() {
  collectTextNodes().forEach((node) => {
    node.nodeValue = originalTextNodes.get(node) ?? node.nodeValue;
  });

  collectAttributeTargets().forEach((target) => {
    target.element.setAttribute(target.attribute, target.original);
  });
}

async function translateText(text: string, targetLang: string): Promise<string> {
  const cacheKey = `${targetLang}::${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=" +
    encodeURIComponent(PAGE_SOURCE_LANG) +
    "&tl=" +
    encodeURIComponent(targetLang) +
    "&dt=t&q=" +
    encodeURIComponent(text);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Translation request failed");
    }

    const payload = await response.json();
    const translated = Array.isArray(payload) && Array.isArray(payload[0])
      ? payload[0].map((part: unknown[]) => part[0] ?? "").join("")
      : text;

    translationCache.set(cacheKey, translated);
    return translated;
  } catch {
    return text;
  }
}

async function translateInBatches<T>(items: T[], mapper: (item: T) => Promise<void>) {
  const queue = items.slice();
  const concurrency = 8;

  async function runWorker(): Promise<void> {
    const item = queue.shift();
    if (item === undefined) {
      return;
    }
    await mapper(item);
    return runWorker();
  }

  await Promise.all(Array.from({ length: concurrency }, runWorker));
}

async function runTranslationPass(targetLang: string, requestId: number) {
  const textNodes = collectTextNodes();
  const attributeTargets = collectAttributeTargets();

  const uniqueTextMap = new Map<
    string,
    Array<{ type: "text"; node: Text } | { type: "attr"; target: AttributeTarget }>
  >();

  textNodes.forEach((node) => {
    const original = originalTextNodes.get(node) ?? node.nodeValue ?? "";
    if (!uniqueTextMap.has(original)) {
      uniqueTextMap.set(original, []);
    }
    uniqueTextMap.get(original)!.push({ type: "text", node });
  });

  attributeTargets.forEach((target) => {
    if (!uniqueTextMap.has(target.original)) {
      uniqueTextMap.set(target.original, []);
    }
    uniqueTextMap.get(target.original)!.push({ type: "attr", target });
  });

  await translateInBatches(Array.from(uniqueTextMap.keys()), async (original) => {
    const translated = await translateText(original, targetLang);
    if (requestId !== activeRequestId) {
      return;
    }

    uniqueTextMap.get(original)!.forEach((item) => {
      if (item.type === "text") {
        item.node.nodeValue = translated;
      } else {
        item.target.element.setAttribute(item.target.attribute, translated);
      }
    });
  });
}

async function withObserverPaused<T>(fn: () => Promise<T>): Promise<T> {
  observer?.disconnect();
  try {
    return await fn();
  } finally {
    observer?.observe(document.body, { childList: true, subtree: true, characterData: true });
  }
}

async function applyTranslation(targetLang: string) {
  const requestId = ++activeRequestId;

  await withObserverPaused(async () => {
    restoreOriginalContent();
    if (targetLang !== PAGE_SOURCE_LANG) {
      await runTranslationPass(targetLang, requestId);
    }
  });
}

function scheduleIncrementalTranslation() {
  if (currentLanguage === PAGE_SOURCE_LANG) {
    return;
  }

  window.clearTimeout(observerDebounceTimer);
  observerDebounceTimer = window.setTimeout(() => {
    const requestId = activeRequestId;
    void withObserverPaused(() => runTranslationPass(currentLanguage, requestId));
  }, OBSERVER_DEBOUNCE_MS);
}

function setLanguage(languageCode: string) {
  if (languageCode === currentLanguage) {
    return;
  }

  currentLanguage = languageCode;
  window.localStorage.setItem(STORAGE_KEY, languageCode);
  document.documentElement.lang = languageCode;
  notifyListeners();
  void applyTranslation(languageCode);
}

function ensureEngineInitialized() {
  if (initialized) {
    return;
  }
  initialized = true;

  observer = new MutationObserver(scheduleIncrementalTranslation);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });

  if (currentLanguage !== PAGE_SOURCE_LANG) {
    document.documentElement.lang = currentLanguage;
    window.setTimeout(() => void applyTranslation(currentLanguage), 0);
  }
}

function useTranslatorState() {
  const selectedLanguage = useSyncExternalStore(subscribe, getSnapshot);

  useEffect(() => {
    ensureEngineInitialized();
  }, []);

  return { selectedLanguage, selectLanguage: setLanguage };
}

// ---------------------------------------------------------------------------

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
        className={`notranslate ${className ?? "h-9 w-[156px] bg-background"}`}
        data-testid="select-language"
        aria-label="Select language"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <SelectValue placeholder="En">{triggerLabel}</SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent className="notranslate max-h-72 overflow-y-auto">
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
  const { selectedLanguage, selectLanguage } = useTranslatorState();

  return (
    <div className="border-t bg-background/95">
      <div className="container mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5">
        <div className="notranslate flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-sm font-semibold leading-none text-foreground">
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
