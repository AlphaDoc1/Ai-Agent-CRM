
import { langToBCP47 } from "./browser-tts";

export function startListening(
  langKey: string,
  onResult: (text: string) => void,
  onError: () => void,
  interimResults: boolean = false
): any | null {
  const SpeechRecognitionImpl = (window as any).SpeechRecognition 
    || (window as any).webkitSpeechRecognition;
  
  if (!SpeechRecognitionImpl) {
    console.error("[BrowserSTT] SpeechRecognition API not available");
    onError();
    return null;
  }

  const recognition = new SpeechRecognitionImpl();
  recognition.lang = langToBCP47(langKey);
  recognition.continuous = false;
  recognition.interimResults = interimResults;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    console.log("[BrowserSTT] Microphone is now listening...");
  };

  recognition.onresult = (event: any) => {
    console.log("[BrowserSTT] Result received", event);
    if (event.results && event.results.length > 0) {
      const transcript = event.results[0][0].transcript;
      console.log("[BrowserSTT] Transcript:", transcript);
      onResult(transcript);
    }
  };

  recognition.onerror = (event: any) => {
    console.error("[BrowserSTT] Error:", event.error);
    onError();
  };

  recognition.onend = () => {
    console.log("[BrowserSTT] Recognition ended");
  };

  try {
    recognition.start();
  } catch (e) {
    console.error("[BrowserSTT] Failed to start recognition", e);
    onError();
  }

  return recognition;
}

