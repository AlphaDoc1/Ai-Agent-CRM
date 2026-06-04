"use client";

import { useState, useEffect, useRef } from "react";
import { useVoiceAgentStore } from "@/lib/store";
import { LoadingSpinner } from "@/components/ui/shared";
import { Mic, MicOff, Phone, PhoneOff, AlertTriangle, Save, Volume2, ExternalLink } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function VoiceAgentPage() {
  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    currentTranscript,
    callDuration,
    setListening,
    setProcessing,
    setSpeaking,
    addToTranscript,
    setCurrentTranscript,
    setCallDuration,
    resetCall,
  } = useVoiceAgentStore();

  const [callActive, setCallActive] = useState(false);
  const [chatCallLogId, setChatCallLogId] = useState<string | null>(null);
  const [ollamaHealthy, setOllamaHealthy] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [statusMessage, setStatusMessage] = useState("Idle");
  const [micPermission, setMicPermission] = useState<boolean | null>(null);
  const [fallbackInput, setFallbackInput] = useState("");
  const [hasNetworkError, setHasNetworkError] = useState(false);

  // VoIP Outbound telephony states
  const [activeTab, setActiveTab] = useState<"mic" | "phone">("mic");
  const [voipName, setVoipName] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [voipPhone, setVoipPhone] = useState("");
  const [voipType, setVoipType] = useState<"ai" | "service">("service");
  const [voipCallActive, setVoipCallActive] = useState(false);
  const [voipCallSid, setVoipCallSid] = useState("");
  const [voipStatus, setVoipStatus] = useState("Idle");
  const [voipTranscript, setVoipTranscript] = useState<string[]>([]);
  const [voipDuration, setVoipDuration] = useState(0);
  const [isTriggeringVoip, setIsTriggeringVoip] = useState(false);
  const [isCloudMode, setIsCloudMode] = useState(false);

  // Trigger outbound call
  const startVoipCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voipName.trim() || !voipPhone.trim()) return;

    setIsTriggeringVoip(true);
    setVoipStatus("Triggering outbound call via Twilio...");
    setVoipTranscript([]);
    setVoipDuration(0);

    const fullPhoneNumber = `${countryCode}${voipPhone.trim().replace(/\D/g, "")}`;

    try {
      const res = await fetch("/api/voice/click-to-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: voipName,
          phone: fullPhoneNumber,
          type: voipType,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.callSid) {
        setVoipCallSid(json.data.callSid);
        setVoipCallActive(true);
        setVoipStatus("Calling your phone... Please answer and press any key to connect!");
      } else {
        throw new Error(json.error || "Failed to initiate call");
      }
    } catch (err: any) {
      console.error(err);
      setVoipStatus(`Failed to call: ${err.message}`);
      alert(`Error triggering call: ${err.message}`);
    } finally {
      setIsTriggeringVoip(false);
    }
  };

  // VoIP Realtime Transcript Subscription Effect
  useEffect(() => {
    if (!voipCallActive || !voipCallSid) return;

    const supabase = createClient();
    
    console.log(`[Realtime] Subscribing to call_logs for CallSid: ${voipCallSid}...`);
    const channel = supabase
      .channel("voip-call-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        (payload) => {
          const row = payload.new as any;
          // Verify if row matches our CallSid (contained in caller_phone)
          if (row && row.caller_phone && row.caller_phone.includes(voipCallSid)) {
            console.log("[Realtime] Call log update received:", row);
            
            // Extract the transcript text
            if (row.transcript) {
              const lines = row.transcript.split("\n").filter(Boolean);
              setVoipTranscript(lines);
            }
            
            // Update duration
            if (row.duration_seconds !== undefined) {
              setVoipDuration(row.duration_seconds);
            }
            
            // Update status message
            if (row.status === "in_progress") {
              setVoipStatus("Call Connected - Speak on your phone!");
            } else if (row.status === "completed") {
              setVoipStatus("Call Completed");
              setVoipCallActive(false);
            } else if (row.status === "failed") {
              setVoipStatus("Call Failed");
              setVoipCallActive(false);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [voipCallActive, voipCallSid]);

  const callActiveRef = useRef(callActive);
  useEffect(() => {
    callActiveRef.current = callActive;
  }, [callActive]);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check Ollama health on mount
  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/ai/health");
        const json = await res.json();
        setOllamaHealthy(json.success);
        if (json.data?.isCloud) {
          setIsCloudMode(true);
        }
      } catch (err) {
        setOllamaHealthy(false);
      } finally {
        setCheckingHealth(false);
      }
    }
    checkHealth();
    
    // Check Speech Recognition support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setStatusMessage("Web Speech Recognition not supported in this browser.");
    }

    synthesisRef.current = window.speechSynthesis;
  }, []);

  // Auto-scroll transcript to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript, currentTranscript]);

  // Duration timer
  useEffect(() => {
    if (callActive) {
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(callDuration + 1);
      }, 1000);
    } else {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    }
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
    };
  }, [callActive, callDuration, setCallDuration]);

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, "0");
    const s = (sec % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const startVoiceRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      setListening(true);
      setStatusMessage("Listening to microphone...");
    };

    rec.onerror = (e: any) => {
      const errType = e.error || "unknown";
      // Don't treat routine occurrences like silence ("no-speech") or user interrupts ("aborted") as console errors
      if (errType === "no-speech" || errType === "aborted") {
        setStatusMessage(errType === "no-speech" ? "Silence detected..." : "Listening paused.");
        return;
      }
      console.error("Speech Recognition Error (code):", errType, e);
      if (errType === "network") {
        setHasNetworkError(true);
        setStatusMessage("Speech Recognition network error. Google servers unreachable.");
      } else if (errType === "not-allowed") {
        setMicPermission(false);
        setStatusMessage("Microphone permission denied.");
      } else {
        setStatusMessage(`Speech Recognition Error: ${errType}`);
      }
    };

    rec.onend = () => {
      setListening(false);
      const active = callActiveRef.current;
      const { isProcessing, isSpeaking } = useVoiceAgentStore.getState();
      
      // Restart recognition only if call is active and AI is not processing/speaking
      if (active && !isProcessing && !isSpeaking) {
        try {
          rec.start();
        } catch (err) {
          console.error("Error restarting recognition:", err);
        }
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

      if (interimTranscript) {
        setCurrentTranscript(interimTranscript);
      }

      if (finalTranscript) {
        setCurrentTranscript("");
        addToTranscript(`User: ${finalTranscript}`);
        
        // Stop recognition momentarily while processing & speaking
        rec.stop();
        await handleAIResponse(finalTranscript);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const handleAIResponse = async (userText: string) => {
    setProcessing(true);
    setStatusMessage("AI is thinking...");

    try {
      const res = await fetch("/api/voice/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          history: transcript,
          callLogId: chatCallLogId,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.response) {
        const reply = json.data.response;
        if (json.data?.callLogId) {
          setChatCallLogId(json.data.callLogId);
        }
        addToTranscript(`Agent: ${reply}`);
        setProcessing(false);
        await speakText(reply);
      } else {
        throw new Error(json.error || "Failed to generate reply");
      }
    } catch (err) {
      console.error(err);
      setProcessing(false);
      const errorMsg = "I apologize, I'm having trouble processing that response. Can you repeat?";
      addToTranscript(`Agent: ${errorMsg}`);
      await speakText(errorMsg);
    }
  };

  const speakText = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      if (!synthesisRef.current) {
        resolve();
        return;
      }

      // Cancel any ongoing speaking
      synthesisRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        setSpeaking(true);
        setStatusMessage("Agent is speaking...");
      };

      utterance.onend = () => {
        setSpeaking(false);
        setStatusMessage("Listening...");
        // Resume recognition using latest ref state
        if (callActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
        resolve();
      };

      utterance.onerror = (e) => {
        console.error("Speech Synthesis Error:", e);
        setSpeaking(false);
        if (callActiveRef.current && recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (err) {}
        }
        resolve();
      };

      synthesisRef.current.speak(utterance);
    });
  };

  const startCall = async () => {
    // Request mic permissions first
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission(true);
    } catch (err) {
      setMicPermission(false);
      setStatusMessage("Microphone permission denied.");
      return;
    }

    resetCall();
    setChatCallLogId(null);
    setCallActive(true);
    callActiveRef.current = true;
    setHasNetworkError(false);
    setFallbackInput("");
    startVoiceRecognition();
    
    // Greeting
    const greeting = "Hello! Thank you for calling our team. How can I help you today?";
    addToTranscript(`Agent: ${greeting}`);
    speakText(greeting);
  };

  const endCall = () => {
    setCallActive(false);
    callActiveRef.current = false;
    setStatusMessage("Call Ended");

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {}
    }
    if (synthesisRef.current) {
      try {
        synthesisRef.current.cancel();
      } catch (err) {}
    }
  };

  const saveCallAsInquiry = async () => {
    if (transcript.length === 0) return;
    setStatusMessage("Saving call details...");
    
    try {
      // Find User transcript blocks
      const userLines = transcript
        .filter((line) => line.startsWith("User:"))
        .map((line) => line.replace("User: ", ""));
      
      const fullMessage = transcript.join("\n");
      
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `Call Lead ${new Date().toLocaleTimeString()}`,
          phone: "Voice call capture",
          message: fullMessage,
          source: "voice",
        }),
      });

      if (res.ok) {
        // Save Call Log record
        await fetch("/api/voice/save-call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            caller_name: "Voice caller",
            duration_seconds: callDuration,
            transcript: fullMessage,
            status: "completed",
          }),
        });

        setStatusMessage("Call successfully logged & parsed into Inquiry!");
        alert("Call lead saved & routed!");
      }
    } catch (err) {
      console.error(err);
      setStatusMessage("Failed to save call");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Voice AI Agent</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Talk to the local AI agent using your microphone or receive a call on your real phone
        </p>
      </div>

      {/* Cloud Active Badge / Ollama Alert */}
      {isCloudMode && !checkingHealth && (
        <div
          style={{
            background: "rgba(16,185,129,0.1)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--accent-emerald)", boxShadow: "0 0 8px var(--accent-emerald)" }} />
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-emerald)" }}>
              Production AI (Groq Cloud) Active
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Calls are running at ultra-fast speeds via Groq. Local Ollama server is bypassed.
            </p>
          </div>
        </div>
      )}

      {!ollamaHealthy && !checkingHealth && !isCloudMode && (
        <div
          style={{
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <AlertTriangle color="var(--accent-red)" size={20} />
          <div>
            <h4 style={{ fontSize: "14px", fontWeight: 600, color: "var(--accent-red)" }}>
              Ollama Server Disconnected
            </h4>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              Please ensure Ollama is running locally at <strong>http://localhost:11434</strong> with the <strong>llama3</strong> model installed, or configure a <strong>GROQ_API_KEY</strong> in your .env file.
            </p>
          </div>
        </div>
      )}

      {/* Voice Console Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.3fr",
          gap: "24px",
        }}
      >
        {/* Left Side: Calling UI */}
        <div className="glass-card" style={{ padding: "28px", display: "flex", flexDirection: "column" }}>
          
          {/* Tab Selection */}
          <div style={{ display: "flex", width: "100%", borderBottom: "1px solid var(--border-subtle)", marginBottom: "24px" }}>
            <button
              onClick={() => setActiveTab("mic")}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "mic" ? "2px solid var(--accent-blue)" : "none",
                color: activeTab === "mic" ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "color 0.2s ease"
              }}
            >
              <Mic size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
              Web Mic
            </button>
            <button
              onClick={() => setActiveTab("phone")}
              style={{
                flex: 1,
                padding: "12px",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === "phone" ? "2px solid var(--accent-blue)" : "none",
                color: activeTab === "phone" ? "var(--text-primary)" : "var(--text-secondary)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
                transition: "color 0.2s ease"
              }}
            >
              <Phone size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
              Outbound
            </button>
          </div>

          {activeTab === "mic" ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}>
              {/* Dialer Circle */}
              <div
                style={{
                  position: "relative",
                  width: "140px",
                  height: "140px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "24px",
                }}
              >
                {/* Visualizer Pulsing Ring */}
                {callActive && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: "50%",
                      border: "2px solid var(--accent-blue)",
                      animation: "pulse-glow 1.5s infinite ease-in-out",
                      transform: isSpeaking ? "scale(1.15)" : isListening ? "scale(1.08)" : "none",
                      transition: "transform 0.2s ease",
                      opacity: 0.4,
                    }}
                  />
                )}
                <div
                  className={`voice-pulse`}
                  style={{
                    width: "100px",
                    height: "100px",
                    borderRadius: "50%",
                    background: callActive ? "var(--gradient-primary)" : "var(--bg-elevated)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}
                >
                  {isSpeaking ? (
                    <Volume2 size={30} color="white" />
                  ) : isListening ? (
                    <Mic size={30} color="white" />
                  ) : (
                    <MicOff size={30} color="var(--text-muted)" />
                  )}
                </div>
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "4px" }}>
                {callActive ? "Call Connected" : "Local Voice Assistant"}
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "24px" }}>
                {callActive ? `Duration: ${formatDuration(callDuration)}` : "Click start call below"}
              </p>

              {/* Action buttons */}
              <div style={{ display: "flex", gap: "12px", width: "100%", maxWidth: "260px" }}>
                {!callActive ? (
                  <button
                    className="btn btn-primary"
                    style={{ width: "100%", padding: "12px" }}
                    onClick={startCall}
                    disabled={!ollamaHealthy && !isCloudMode}
                  >
                    <Phone size={16} /> Start Web Call
                  </button>
                ) : (
                  <button
                    className="btn btn-danger"
                    style={{ width: "100%", padding: "12px" }}
                    onClick={endCall}
                  >
                    <PhoneOff size={16} /> End Call
                  </button>
                )}
              </div>

              <div
                style={{
                  marginTop: "24px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "var(--bg-secondary)",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                <strong>Status:</strong> {statusMessage}
              </div>

              {/* Fallback Text Input */}
              {callActive && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!fallbackInput.trim() || isProcessing || isSpeaking) return;
                    const text = fallbackInput.trim();
                    setFallbackInput("");
                    addToTranscript(`User: ${text}`);
                    if (recognitionRef.current) {
                      try {
                        recognitionRef.current.stop();
                      } catch (err) {}
                    }
                    handleAIResponse(text);
                  }}
                  style={{
                    marginTop: "20px",
                    width: "100%",
                    display: "flex",
                    gap: "8px",
                  }}
                >
                  <input
                    type="text"
                    value={fallbackInput}
                    onChange={(e) => setFallbackInput(e.target.value)}
                    placeholder="Type fallback message..."
                    disabled={isProcessing || isSpeaking}
                    className="input"
                    style={{ fontSize: "13px" }}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={!fallbackInput.trim() || isProcessing || isSpeaking}
                    style={{ padding: "8px 14px", fontSize: "13px" }}
                  >
                    Send
                  </button>
                </form>
              )}

              {/* Network Error Tip */}
              {hasNetworkError && (
                <p style={{ fontSize: "11px", color: "var(--accent-red)", marginTop: "12px", textAlign: "center", lineHeight: "1.4" }}>
                  ⚠️ Speech Recognition failed: Browsers require internet/Google server access for Web Speech-to-Text. You can use the text box above to test the conversation!
                </p>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {!voipCallActive ? (
                <form onSubmit={startVoipCall} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {/* Header */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    paddingBottom: "16px",
                    borderBottom: "1px solid var(--border-subtle)"
                  }}>
                    <div style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      background: "rgba(139, 92, 246, 0.15)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      <Phone size={16} color="var(--accent-purple)" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                        AI Customer Service Call
                      </h3>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, marginTop: "2px" }}>
                        Enter details below and the AI agent will call the number
                      </p>
                    </div>
                  </div>

                  {/* Name Field */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      marginBottom: "8px",
                      letterSpacing: "0.5px"
                    }}>
                      CALLER NAME
                    </label>
                    <input
                      type="text"
                      className="input"
                      required
                      placeholder="e.g. Rajesh Sharma"
                      value={voipName}
                      onChange={(e) => setVoipName(e.target.value)}
                      disabled={isTriggeringVoip}
                      style={{
                        width: "100%",
                        padding: "12px 14px",
                        fontSize: "14px",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  {/* Phone Field */}
                  <div>
                    <label style={{
                      display: "block",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      fontWeight: 600,
                      marginBottom: "8px",
                      letterSpacing: "0.5px"
                    }}>
                      PHONE NUMBER
                    </label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "stretch" }}>
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        disabled={isTriggeringVoip}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          padding: "12px 10px",
                          fontSize: "14px",
                          outline: "none",
                          cursor: "pointer",
                          minWidth: "90px",
                          flexShrink: 0
                        }}
                      >
                        <option value="+91">🇮🇳 +91</option>
                        <option value="+1">🇺🇸 +1</option>
                        <option value="+44">🇬🇧 +44</option>
                        <option value="+61">🇦🇺 +61</option>
                        <option value="+971">🇦🇪 +971</option>
                      </select>
                      <input
                        type="tel"
                        className="input"
                        required
                        placeholder="9876543210"
                        value={voipPhone}
                        onChange={(e) => setVoipPhone(e.target.value.replace(/\D/g, ""))}
                        disabled={isTriggeringVoip}
                        maxLength={10}
                        style={{
                          flex: 1,
                          padding: "12px 14px",
                          fontSize: "14px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                  </div>

                  {/* Call Button */}
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isTriggeringVoip || (!ollamaHealthy && !isCloudMode) || !voipName.trim() || !voipPhone.trim()}
                    style={{
                      width: "100%",
                      padding: "14px",
                      marginTop: "4px",
                      fontSize: "14px",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px"
                    }}
                  >
                    {isTriggeringVoip ? (
                      <>
                        <span style={{
                          width: "14px",
                          height: "14px",
                          border: "2px solid rgba(255,255,255,0.3)",
                          borderTopColor: "white",
                          borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                          display: "inline-block"
                        }} />
                        Dialing your phone...
                      </>
                    ) : (
                      <>
                        <Phone size={16} /> Call Now
                      </>
                    )}
                  </button>

                  {/* Tip Banner */}
                  <div
                    style={{
                      background: "rgba(245, 158, 11, 0.08)",
                      border: "1px solid rgba(245, 158, 11, 0.2)",
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontSize: "11px",
                      color: "var(--accent-orange)",
                      lineHeight: "1.5"
                    }}
                  >
                    <strong>💡 Tip:</strong> Outbound calls on Twilio Free Trial are limited to verified numbers. Answer the call and press any key to connect the AI agent.
                  </div>
                </form>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, padding: "20px 0" }}>
                  {/* VoIP Active visualizer */}
                  <div
                    style={{
                      position: "relative",
                      width: "120px",
                      height: "120px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "24px",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "50%",
                        border: "2px solid var(--accent-emerald)",
                        animation: "pulse-glow 1.5s infinite ease-in-out",
                        opacity: 0.4,
                      }}
                    />
                    <div
                      style={{
                        width: "80px",
                        height: "80px",
                        borderRadius: "50%",
                        background: "var(--gradient-success)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Volume2 size={26} color="white" />
                    </div>
                  </div>

                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
                    Outbound VoIP Call Active
                  </h3>
                  <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "20px" }}>
                    Duration: {formatDuration(voipDuration)}
                  </p>

                  <div
                    style={{
                      padding: "12px 16px",
                      borderRadius: "8px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "12px",
                      textAlign: "center",
                      color: "var(--text-secondary)",
                      width: "100%",
                      marginBottom: "20px"
                    }}
                  >
                    <strong>Call Status:</strong> {voipStatus}
                  </div>

                  <div
                    style={{
                      background: "rgba(59, 130, 246, 0.08)",
                      border: "1px solid rgba(59, 130, 246, 0.2)",
                      borderRadius: "8px",
                      padding: "12px",
                      fontSize: "11px",
                      color: "var(--accent-blue)",
                      lineHeight: "1.4",
                      textAlign: "center"
                    }}
                  >
                    📞 You are talking on your phone! The live transcript from Whisper and Ollama is streaming directly to the sidebar.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Conversation Transcript */}
        <div className="glass-card" style={{ padding: "24px", display: "flex", flexDirection: "column", height: "480px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              borderBottom: "1px solid var(--border-subtle)",
              paddingBottom: "12px",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Live Transcript</h3>
            {activeTab === "phone" ? (
              <span className="badge" style={{ borderColor: "rgba(16, 185, 129, 0.3)", color: "var(--accent-emerald)", background: "rgba(16, 185, 129, 0.05)" }}>
                Auto-Synced to DB
              </span>
            ) : (
              transcript.length > 0 && (
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "12px", padding: "6px 12px" }}
                  onClick={saveCallAsInquiry}
                >
                  <Save size={14} /> Log & Sync Inquiry
                </button>
              )
            )}
          </div>

          {/* Scrollable Conversation area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: "8px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {(activeTab === "phone" ? voipTranscript : transcript).length === 0 && !currentTranscript && (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  fontSize: "14px",
                }}
              >
                No transcript active. Speak or start a call.
              </div>
            )}

            {(activeTab === "phone" ? voipTranscript : transcript).map((line, i) => {
              const isUser = line.startsWith("User:");
              const cleanLine = line.replace(/^(User|Agent): /, "");
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isUser ? "flex-end" : "flex-start",
                    maxWidth: "80%",
                    background: isUser ? "rgba(59, 130, 246, 0.15)" : "var(--bg-elevated)",
                    border: isUser
                      ? "1px solid rgba(59, 130, 246, 0.3)"
                      : "1px solid var(--border-subtle)",
                    borderRadius: isUser ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                    padding: "10px 14px",
                    fontSize: "14px",
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: "11px", color: isUser ? "var(--accent-blue)" : "var(--accent-purple)", marginBottom: "4px" }}>
                    {isUser ? "You" : "Voice AI Assistant"}
                  </p>
                  <p style={{ color: "var(--text-primary)" }}>{cleanLine}</p>
                </div>
              );
            })}

            {/* Interim Transcript (Browser voice only) */}
            {activeTab === "mic" && currentTranscript && (
              <div
                style={{
                  alignSelf: "flex-end",
                  maxWidth: "80%",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: "12px 12px 2px 12px",
                  padding: "10px 14px",
                  fontSize: "14px",
                  opacity: 0.7,
                }}
              >
                <p style={{ fontWeight: 600, fontSize: "11px", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Speaking...
                </p>
                <p>{currentTranscript}</p>
              </div>
            )}

            {/* AI thinking indicator */}
            {activeTab === "mic" && isProcessing && (
              <div style={{ alignSelf: "flex-start", opacity: 0.7 }}>
                <div
                  style={{
                    display: "flex",
                    gap: "4px",
                    padding: "10px 14px",
                    background: "var(--bg-elevated)",
                    borderRadius: "12px 12px 12px 2px",
                  }}
                >
                  <span className="dot" style={{ width: "6px", height: "6px", background: "white", borderRadius: "50%", animation: "pulse-glow 1s infinite alternate" }} />
                  <span className="dot" style={{ width: "6px", height: "6px", background: "white", borderRadius: "50%", animation: "pulse-glow 1s infinite alternate", animationDelay: "0.2s" }} />
                  <span className="dot" style={{ width: "6px", height: "6px", background: "white", borderRadius: "50%", animation: "pulse-glow 1s infinite alternate", animationDelay: "0.4s" }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
