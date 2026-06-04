"use client";

import { useState, useEffect, useRef } from "react";

export default function TalkPage() {
  const [callActive, setCallActive] = useState(false);
  const [chatCallLogId, setChatCallLogId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Tap the button to start talking");
  const [transcript, setTranscript] = useState<string[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [fallbackInput, setFallbackInput] = useState("");
  const [hasNetworkError, setHasNetworkError] = useState(false);
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [aiReady, setAiReady] = useState(true);
  const [chatMode, setChatMode] = useState(false); // text-only mode when mic unavailable
  const [errorLog, setErrorLog] = useState<string | null>(null);

  const callActiveRef = useRef(callActive);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Listen for global window errors and unhandled promise rejections
  useEffect(() => {
    const handleErr = (event: ErrorEvent) => {
      setErrorLog(`Error: ${event.message} at ${event.filename}:${event.lineno}`);
    };
    const handleRej = (event: PromiseRejectionEvent) => {
      setErrorLog(`Unhandled Promise Rejection: ${event.reason}`);
    };
    window.addEventListener("error", handleErr);
    window.addEventListener("unhandledrejection", handleRej);
    return () => {
      window.removeEventListener("error", handleErr);
      window.removeEventListener("unhandledrejection", handleRej);
    };
  }, []);

  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);

  // Check AI health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/ai/health");
        const json = await res.json();
        setAiReady(json.success);
      } catch {
        setAiReady(false);
      }
    }
    checkHealth();
    synthesisRef.current = window.speechSynthesis;
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentTranscript]);

  // Duration timer
  useEffect(() => {
    if (callActive) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [callActive]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const addToTranscript = (line: string) => {
    setTranscript((prev) => [...prev, line]);
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Speech Recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setIsListening(true);
      setStatusMessage("Listening...");
    };

    rec.onerror = (e: any) => {
      const errType = e.error || "unknown";
      if (errType === "no-speech" || errType === "aborted") {
        setStatusMessage(errType === "no-speech" ? "Silence detected..." : "Listening paused.");
        return;
      }
      if (errType === "network") {
        setHasNetworkError(true);
        setStatusMessage("Network error. Use the text box below.");
      } else if (errType === "not-allowed") {
        setMicPermission(false);
        setChatMode(true);
        setStatusMessage("Microphone permission denied. Type your message below!");
      } else {
        setStatusMessage(`Error: ${errType}`);
      }
    };

    rec.onend = () => {
      setIsListening(false);
      if (callActiveRef.current && !isProcessing && !isSpeaking) {
        try { rec.start(); } catch {}
      }
    };

    rec.onresult = async (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript) setCurrentTranscript(interimTranscript);

      if (finalTranscript) {
        setCurrentTranscript("");
        addToTranscript(`User: ${finalTranscript}`);
        rec.stop();
        await handleAIResponse(finalTranscript);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const handleAIResponse = async (userText: string) => {
    setIsProcessing(true);
    setStatusMessage("AI is thinking...");

    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText, history: transcript, callLogId: chatCallLogId }),
      });

      const json = await res.json();
      if (json.success && json.data?.response) {
        const reply = json.data.response;
        if (json.data?.callLogId) {
          setChatCallLogId(json.data.callLogId);
        }
        addToTranscript(`Agent: ${reply}`);
        setIsProcessing(false);
        await speakText(reply);
      } else {
        throw new Error(json.error || "Failed");
      }
    } catch {
      setIsProcessing(false);
      const errorMsg = "Sorry, I'm having trouble right now. Could you try again?";
      addToTranscript(`Agent: ${errorMsg}`);
      await speakText(errorMsg);
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthesisRef.current) { resolve(); return; }
      synthesisRef.current.cancel();

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => {
          setIsSpeaking(true);
          setStatusMessage("AI is speaking...");
        };
        utterance.onend = () => {
          setIsSpeaking(false);
          setStatusMessage("Listening...");
          if (callActiveRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
          resolve();
        };
        utterance.onerror = (e) => {
          console.warn("SpeechSynthesisUtterance error:", e);
          setIsSpeaking(false);
          if (callActiveRef.current && recognitionRef.current) {
            try { recognitionRef.current.start(); } catch {}
          }
          resolve();
        };
        synthesisRef.current.speak(utterance);
      } catch (err) {
        console.warn("SpeechSynthesis failed to initialize:", err);
        resolve();
      }
    });
  };

  const startCall = async () => {
    try {
      setStatusMessage("Starting...");
      setTranscript([]);
      setCallDuration(0);
      setChatCallLogId(null);
      setHasNetworkError(false);
      setFallbackInput("");
      setCallActive(true);
      callActiveRef.current = true;

      const greeting = "Hello! Thank you for reaching out. How can I help you today?";
      addToTranscript(`Agent: ${greeting}`);

      // Check mic access asynchronously to prevent blocking the UI
      (async () => {
        let hasMic = false;
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            await navigator.mediaDevices.getUserMedia({ audio: true });
            setMicPermission(true);
            hasMic = true;
          } else {
            console.warn("[Talk] navigator.mediaDevices not available");
            setMicPermission(false);
          }
        } catch (err) {
          console.warn("[Talk] Mic permission denied or error:", err);
          setMicPermission(false);
        }

        // Only start recognition if the call is still active
        if (callActiveRef.current) {
          if (hasMic) {
            const SpeechRecognition =
              (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
              startVoiceRecognition();
            } else {
              setChatMode(true);
              setStatusMessage("Voice not supported in this browser. Type your message below!");
            }
          } else {
            setChatMode(true);
            setStatusMessage("No microphone access. Type your message below!");
          }
        }
      })();

      // Try to speak, but don't block if it fails
      try {
        speakText(greeting);
      } catch (err) {
        console.warn("Greeting speakText error:", err);
      }
    } catch (err) {
      console.error("Failed to start call:", err);
      setErrorLog(`Failed to start call: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const endCall = () => {
    setCallActive(false);
    callActiveRef.current = false;
    setStatusMessage("Call ended. Tap to start again.");
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
    if (synthesisRef.current) { try { synthesisRef.current.cancel(); } catch {} }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #0a0a0f 0%, #0f0f1a 40%, #111122 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "20px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    }}>

      {/* Header */}
      <div style={{
        textAlign: "center",
        marginTop: "20px",
        marginBottom: "24px",
      }}>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 16px",
          borderRadius: "20px",
          background: "rgba(59, 130, 246, 0.1)",
          border: "1px solid rgba(59, 130, 246, 0.2)",
          marginBottom: "16px",
          fontSize: "12px",
          color: "#3b82f6",
          fontWeight: 600,
          letterSpacing: "0.5px",
        }}>
          <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: aiReady ? "#10b981" : "#ef4444", boxShadow: aiReady ? "0 0 8px #10b981" : "0 0 8px #ef4444" }} />
          {aiReady ? "AI Agent Online" : "AI Agent Offline"}
        </div>

        <h1 style={{
          fontSize: "clamp(24px, 5vw, 36px)",
          fontWeight: 800,
          background: "linear-gradient(135deg, #f0f0f5, #a0a0b5)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: "8px",
          lineHeight: 1.2,
        }}>
          Talk to Our AI Assistant
        </h1>
        <p style={{
          color: "#6b6b80",
          fontSize: "14px",
          maxWidth: "400px",
          margin: "0 auto",
        }}>
          Speak directly through your browser — no app downloads, no phone calls, no charges.
        </p>
      </div>

      {errorLog && (
        <div style={{
          width: "100%",
          maxWidth: "440px",
          padding: "12px",
          background: "rgba(239, 68, 68, 0.2)",
          border: "1px solid #ef4444",
          color: "#fca5a5",
          borderRadius: "10px",
          marginBottom: "16px",
          fontSize: "12px",
          wordBreak: "break-all",
        }}>
          <strong>Browser JS Error:</strong>
          <pre style={{ margin: "4px 0 0 0", fontFamily: "monospace", whiteSpace: "pre-wrap" }}>{errorLog}</pre>
        </div>
      )}

      {/* Main Card */}
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "rgba(22, 22, 31, 0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}>

        {/* Pulse Circle */}
        <div style={{
          position: "relative",
          width: "140px",
          height: "140px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "20px",
        }}>
          {/* Outer ring animation */}
          {callActive && (
            <div style={{
              position: "absolute",
              inset: "-8px",
              borderRadius: "50%",
              border: isSpeaking ? "2px solid #8b5cf6" : "2px solid #3b82f6",
              animation: "talkPulse 1.5s infinite ease-in-out",
              opacity: 0.4,
            }} />
          )}
          {callActive && (
            <div style={{
              position: "absolute",
              inset: "-16px",
              borderRadius: "50%",
              border: "1px solid rgba(59,130,246,0.15)",
              animation: "talkPulse 2s infinite ease-in-out",
              animationDelay: "0.3s",
              opacity: 0.2,
            }} />
          )}

          {/* Main circle */}
          <button
            onClick={callActive ? endCall : startCall}
            disabled={false}
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "none",
              cursor: "pointer",
              background: callActive
                ? isSpeaking
                  ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                  : isListening
                    ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                    : "linear-gradient(135deg, #ef4444, #dc2626)"
                : "linear-gradient(135deg, #10b981, #059669)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
              boxShadow: callActive
                ? "0 0 30px rgba(59,130,246,0.3)"
                : "0 0 30px rgba(16,185,129,0.3)",
              transform: callActive && isSpeaking ? "scale(1.05)" : "scale(1)",
            }}
          >
            {callActive ? (
              isSpeaking ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              ) : isListening ? (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              )
            ) : (
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            )}
          </button>
        </div>

        {/* Status Text */}
        <h2 style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#f0f0f5",
          marginBottom: "4px",
          textAlign: "center",
        }}>
          {callActive ? (chatMode ? "Chat Mode" : isSpeaking ? "AI Speaking" : isListening ? "Listening..." : "Processing") : "Start Conversation"}
        </h2>
        <p style={{
          fontSize: "13px",
          color: "#6b6b80",
          textAlign: "center",
          marginBottom: "16px",
        }}>
          {callActive ? formatDuration(callDuration) : "Tap the green button above"}
        </p>

        {/* Status Badge */}
        <div style={{
          padding: "8px 16px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.06)",
          fontSize: "12px",
          color: "#a0a0b5",
          textAlign: "center",
          width: "100%",
          marginBottom: "16px",
        }}>
          {statusMessage}
        </div>

        {/* Text input — always visible when call is active */}
        {callActive && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!fallbackInput.trim() || isProcessing || isSpeaking) return;
              const text = fallbackInput.trim();
              setFallbackInput("");
              addToTranscript(`User: ${text}`);
              if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} }
              handleAIResponse(text);
            }}
            style={{
              width: "100%",
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
            }}
          >
            <input
              type="text"
              value={fallbackInput}
              onChange={(e) => setFallbackInput(e.target.value)}
              placeholder={chatMode ? "Type your message..." : "Or type your message here..."}
              disabled={isProcessing || isSpeaking}
              autoFocus={chatMode}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.04)",
                color: "#f0f0f5",
                fontSize: "13px",
                outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={!fallbackInput.trim() || isProcessing || isSpeaking}
              style={{
                padding: "10px 18px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                color: "white",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                opacity: !fallbackInput.trim() || isProcessing || isSpeaking ? 0.4 : 1,
                fontFamily: "inherit",
              }}
            >
              Send
            </button>
          </form>
        )}

        {hasNetworkError && (
          <p style={{ fontSize: "11px", color: "#ef4444", textAlign: "center", marginBottom: "8px" }}>
            ⚠️ Speech Recognition needs internet. Use the text box to chat instead.
          </p>
        )}

        {micPermission === false && !callActive && (
          <p style={{ fontSize: "11px", color: "#f59e0b", textAlign: "center", marginBottom: "8px" }}>
            💡 Mic not available? No problem — tap the button and type your message instead.
          </p>
        )}
      </div>

      {/* Transcript Card */}
      {transcript.length > 0 && (
        <div style={{
          width: "100%",
          maxWidth: "440px",
          marginTop: "16px",
          background: "rgba(22, 22, 31, 0.85)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "16px",
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          padding: "20px",
          maxHeight: "320px",
          display: "flex",
          flexDirection: "column",
        }}>
          <h3 style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#a0a0b5",
            marginBottom: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}>
            Conversation
          </h3>

          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              paddingRight: "4px",
            }}
          >
            {transcript.map((line, i) => {
              const isUser = line.startsWith("User:");
              const cleanLine = line.replace(/^(User|Agent): /, "");
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    background: isUser ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
                    border: isUser ? "1px solid rgba(59,130,246,0.25)" : "1px solid rgba(255,255,255,0.06)",
                    borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    padding: "10px 14px",
                  }}
                >
                  <p style={{
                    fontWeight: 700,
                    fontSize: "10px",
                    color: isUser ? "#3b82f6" : "#8b5cf6",
                    marginBottom: "3px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    {isUser ? "You" : "AI Assistant"}
                  </p>
                  <p style={{ color: "#f0f0f5", fontSize: "13px", lineHeight: "1.5" }}>{cleanLine}</p>
                </div>
              );
            })}

            {/* Interim speech */}
            {currentTranscript && (
              <div style={{
                alignSelf: "flex-end",
                maxWidth: "85%",
                background: "rgba(255,255,255,0.03)",
                border: "1px dashed rgba(255,255,255,0.12)",
                borderRadius: "12px 12px 2px 12px",
                padding: "10px 14px",
                opacity: 0.6,
              }}>
                <p style={{ fontWeight: 600, fontSize: "10px", color: "#6b6b80", marginBottom: "3px" }}>Speaking...</p>
                <p style={{ color: "#a0a0b5", fontSize: "13px" }}>{currentTranscript}</p>
              </div>
            )}

            {/* AI thinking dots */}
            {isProcessing && (
              <div style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: "5px",
                padding: "12px 16px",
                background: "rgba(255,255,255,0.05)",
                borderRadius: "12px 12px 12px 2px",
              }}>
                <span style={{ width: "6px", height: "6px", background: "#8b5cf6", borderRadius: "50%", animation: "talkDot 1s infinite alternate" }} />
                <span style={{ width: "6px", height: "6px", background: "#8b5cf6", borderRadius: "50%", animation: "talkDot 1s infinite alternate", animationDelay: "0.2s" }} />
                <span style={{ width: "6px", height: "6px", background: "#8b5cf6", borderRadius: "50%", animation: "talkDot 1s infinite alternate", animationDelay: "0.4s" }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <p style={{
        marginTop: "24px",
        fontSize: "11px",
        color: "#4a4a5c",
        textAlign: "center",
      }}>
        Powered by AI CRM Pro • No data stored on your device
      </p>

      {/* Animations */}
      <style>{`
        @keyframes talkPulse {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.08); opacity: 0.15; }
        }
        @keyframes talkDot {
          0% { opacity: 0.3; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
