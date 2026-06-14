
import { LANGUAGE_REGISTRY, getLanguageByKey } from "@/lib/language-config";

export function langToBCP47(langKey: string): string {
  const langConfig = getLanguageByKey(langKey);
  if (langConfig) {
    return langConfig.bcp47;
  }
  return "en-IN";
}

export async function speakText(text: string, langKey: string): Promise<void> {
  // Ensure voices are loaded
  if (typeof window !== 'undefined' && window.speechSynthesis.getVoices().length === 0) {
    await new Promise(resolve => {
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve(true);
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
      // Fallback if event never fires
      setTimeout(resolve, 500);
    });
  }

  return new Promise((resolve, reject) => {
    window.speechSynthesis.cancel();
    
    // Small delay to ensure previous speech is fully cancelled
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const bcp47Lang = langToBCP47(langKey);
      utterance.lang = bcp47Lang;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      // Pick best available voice
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(voice => voice.lang.startsWith(bcp47Lang.split("-")[0])) 
        || voices.find(voice => voice.lang.startsWith("en"));
      if (match) {
        utterance.voice = match;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e: any) => {
        // Detailed error logging
        console.warn(`[BrowserTTS] Speech error: ${e.error || 'unknown'}. Language: ${langKey}`, e);
        
        // Don't reject on common non-fatal errors
        const nonFatalErrors = ['interrupted', 'canceled', 'not-allowed'];
        if (nonFatalErrors.includes(e.error)) {
          resolve();
        } else {
          // If a specific language failed (e.g. Hindi), try English fallback once
          if (langKey !== 'en') {
            console.log(`[BrowserTTS] Retrying with English fallback...`);
            speakText(text, 'en').then(resolve).catch(reject);
          } else {
            reject(e);
          }
        }
      };
      
      window.speechSynthesis.speak(utterance);
    }, 50);
  });
}

export function stopSpeaking(): void {
  window.speechSynthesis.cancel();
}

export function isBrowserSpeaking(): boolean {
  return window.speechSynthesis.speaking;
}

