
"use client";

import React, { useReducer, useEffect, useRef, useState } from "react";
import {
  simulateIncomingCall,
  simulateLanguageSelect,
  simulateSpeak,
  simulateHangup,
  parseTwiML
} from "./twilio-simulator";
import { speakText, stopSpeaking, isBrowserSpeaking } from "./browser-tts";
import { startListening } from "./browser-stt";
import { LANGUAGE_REGISTRY, getLanguageByDigit } from "@/lib/language-config";

type SimulatorPhase =
  | "idle"
  | "calling"
  | "language_select"
  | "greeting"
  | "listening"
  | "processing"
  | "agent_speaking"
  | "interrupted"
  | "ended";

interface LogEntry {
  timestamp: string;
  speaker:
    | "SYSTEM"
    | "API"
    | "USER"
    | "AGENT"
    | "PIPELINE"
    | "ERROR";
  text: string;
}

interface SimulatorState {
  phase: SimulatorPhase;
  callSid: string | null;
  selectedLang: string | null;
  transcript: string;
  agentText: string;
  isSpeaking: boolean;
  isListening: boolean;
  turnCount: number;
  interruptionCount: number;
  intent: string | null;
  logs: LogEntry[];
  error: string | null;
  callStartTime: number | null;
  callerPhone: string;
  lastTwiML: string | null;
  sessionData: any | null;
}

type Action =
  | { type: "CALL_NOW"; callSid: string }
  | { type: "SET_CALLER_PHONE"; phone: string }
  | { type: "LANGUAGE_SELECTED"; digit: string }
  | { type: "USER_SPOKE"; text: string }
  | { type: "INTERRUPT_DETECTED" }
  | { type: "END_CALL" }
  | { type: "FETCH_SESSION" }
  | { type: "SET_PHASE"; phase: SimulatorPhase }
  | { type: "ADD_LOG"; speaker: LogEntry["speaker"]; text: string }
  | { type: "SET_LAST_TWIML"; twiml: string }
  | { type: "SET_SESSION_DATA"; data: any }
  | { type: "SET_ERROR"; error: string | null };

const initialState: SimulatorState = {
  phase: "idle",
  callSid: null,
  selectedLang: null,
  transcript: "",
  agentText: "",
  isSpeaking: false,
  isListening: false,
  turnCount: 0,
  interruptionCount: 0,
  intent: null,
  logs: [],
  error: null,
  callStartTime: null,
  callerPhone: "+911234567890",
  lastTwiML: null,
  sessionData: null
};

function reducer(state: SimulatorState, action: Action): SimulatorState {
  switch (action.type) {
    case "SET_CALLER_PHONE":
      return { ...state, callerPhone: action.phone };
    case "CALL_NOW": {
        return {
          ...initialState,
          callSid: action.callSid,
          callerPhone: state.callerPhone,
          callStartTime: Date.now()
        };
      }
    case "LANGUAGE_SELECTED":
      return { ...state, selectedLang: action.digit };
    case "USER_SPOKE":
      return { ...state, transcript: action.text };
    case "INTERRUPT_DETECTED":
      return {
        ...state,
        phase: "interrupted",
        interruptionCount: state.interruptionCount + 1
      };
    case "END_CALL":
      return { ...state, phase: "ended", isSpeaking: false, isListening: false };
    case "SET_PHASE":
      return { ...state, phase: action.phase };
    case "ADD_LOG": {
        const timestamp = new Date().toLocaleTimeString("en-US", { hour12: false });
        return {
          ...state,
          logs: [
            ...state.logs,
            {
              timestamp,
              speaker: action.speaker,
              text: action.text
            }
          ]
        };
      }
    case "SET_LAST_TWIML":
      return { ...state, lastTwiML: action.twiml };
    case "SET_SESSION_DATA":
      return { ...state, sessionData: action.data };
    case "SET_ERROR":
      return { ...state, error: action.error };
    default:
      return state;
  }
}

function getStatusBadgeColor(phase: SimulatorPhase) {
  switch (phase) {
    case "idle": return { bg: "#1f2937", text: "#9ca3af" };
    case "calling": return { bg: "#1e3a5f", text: "#60a5fa" };
    case "language_select": return { bg: "#1e3a5f", text: "#60a5fa" };
    case "listening": return { bg: "#064e3b", text: "#34d399" };
    case "processing": return { bg: "#451a03", text: "#fbbf24" };
    case "agent_speaking": return { bg: "#4c1d95", text: "#a78bfa" };
    case "interrupted": return { bg: "#7f1d1d", text: "#fca5a5" };
    case "ended": return { bg: "#1f2937", text: "#9ca3af" };
    default: return { bg: "#1f2937", text: "#9ca3af" };
  }
}

function getSpeakerColor(speaker: LogEntry["speaker"]) {
  switch (speaker) {
    case "SYSTEM": return "#6b7280";
    case "API": return "#3b82f6";
    case "USER": return "#22c55e";
    case "AGENT": return "#f59e0b";
    case "PIPELINE": return "#14b8a6";
    case "ERROR": return "#ef4444";
    default: return "#e5e7eb";
  }
}

export default function TestCallPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const bargeRecognitionRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Auto-scroll to bottom of logs
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [state.logs]);

  const handleCallNow = async () => {
    const newCallSid = `SIM_${Date.now()}`;
    dispatch({ type: "CALL_NOW", callSid: newCallSid });
    dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "Initiating test call..." });

    // Step 1: Call /incoming
    try {
      const { twiml, parsed } = await simulateIncomingCall(
        newCallSid,
        state.callerPhone
      );
      dispatch({ type: "SET_LAST_TWIML", twiml });
      dispatch({ type: "ADD_LOG", speaker: "API", text: "POST /api/voice/incoming" });

      // Simulate call started
      dispatch({ type: "SET_PHASE", phase: "language_select" });

      if (parsed.sayText) {
        // Speak the IVR menu
        dispatch({ type: "ADD_LOG", speaker: "AGENT", text: parsed.sayText });
        try {
          await speakText(parsed.sayText, "hi");
        } catch (speechErr) {
          console.warn("Initial speech error (continuing anyway):", speechErr);
          dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "Warning: Browser speech failed, but continuing call." });
        }
      }
    } catch (error: any) {
      console.error("Call now error:", error);
      dispatch({ type: "SET_ERROR", error: error.message });
      dispatch({ type: "ADD_LOG", speaker: "ERROR", text: "Call failed" });
      dispatch({ type: "SET_PHASE", phase: "ended" });
    }
  };

  const handleLanguageSelect = async (digit: string) => {
    const langConfig = getLanguageByDigit(digit);
    if (!langConfig || !state.callSid) return;
    stopSpeaking();
    dispatch({ type: "ADD_LOG", speaker: "USER", text: `Pressed ${digit} for ${langConfig.englishName}` });
    (async () => {
      try {
        dispatch({ type: "SET_PHASE", phase: "greeting" });
        const { twiml, parsed } = await simulateLanguageSelect(
          state.callSid!,
          digit,
          state.callerPhone
        );
        dispatch({ type: "SET_LAST_TWIML", twiml });
        dispatch({ type: "ADD_LOG", speaker: "API", text: "POST /api/voice/language" });

        if (parsed.sayText) {
          dispatch({ type: "ADD_LOG", speaker: "AGENT", text: parsed.sayText });
          try {
            await speakText(parsed.sayText, langConfig.key);
          } catch (speechErr) {
            console.warn("Language select speech error:", speechErr);
            dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "Warning: Browser speech failed." });
          }
        }

        dispatch({ type: "SET_PHASE", phase: "listening" });
        startMic();
      } catch (error: any) {
        console.error("Language select error:", error);
        dispatch({ type: "ADD_LOG", speaker: "ERROR", text: `Language select failed: ${error.message}` });
        dispatch({ type: "SET_PHASE", phase: "ended" });
      }
    })();
  };

  const startMic = () => {
    dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "[Mic] Mic active — speak now" });
    if (!state.selectedLang) {
      console.warn("startMic called without selectedLang");
      return;
    }
    const langConfig = getLanguageByDigit(state.selectedLang);
    if (!langConfig) {
      console.warn("startMic: could not find langConfig for", state.selectedLang);
      return;
    }

    console.log("[BrowserSTT] Attempting to start mic for language:", langConfig.key);
    
    // Abort previous recognition if it exists
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch (e) {}
    }

    recognitionRef.current = startListening(
      langConfig.key,
      async (text) => {
        handleUserSpoke(text);
      },
      () => {
        dispatch({ type: "ADD_LOG", speaker: "ERROR", text: "Microphone error or permission denied" });
        console.error("[BrowserSTT] Recognition error callback triggered");
      },
      false
    );

    if (!recognitionRef.current) {
      dispatch({ type: "ADD_LOG", speaker: "ERROR", text: "Web Speech API not supported in this browser" });
    }
  };

  const handleUserSpoke = async (text: string) => {
    stopSpeaking();
    if (!state.callSid || !state.selectedLang) return;
    const langConfig = getLanguageByDigit(state.selectedLang);
    if (!langConfig) return;

    dispatch({ type: "ADD_LOG", speaker: "USER", text: `"${text}"` });
    dispatch({ type: "USER_SPOKE", text: text });
    dispatch({ type: "SET_PHASE", phase: "processing" });

    try {
      const { twiml, parsed } = await simulateSpeak(
        state.callSid!,
        text,
        langConfig.bcp47,
        state.callerPhone
      );
      dispatch({ type: "SET_LAST_TWIML", twiml });
      dispatch({ type: "ADD_LOG", speaker: "API", text: "POST /api/voice/respond" });

      if (parsed.sayText) {
        dispatch({ type: "ADD_LOG", speaker: "AGENT", text: parsed.sayText });
        try {
          await speakText(parsed.sayText, langConfig.key);
        } catch (speechErr) {
          console.warn("Conversation speech error:", speechErr);
          dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "Warning: Browser speech failed." });
        }
      }
      dispatch({ type: "SET_PHASE", phase: "listening" });
      startMic();
    } catch (error: any) {
      console.error("User spoke error:", error);
    }
  };

  const handleEndCall = async () => {
    stopSpeaking();
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    dispatch({ type: "END_CALL" });

    const duration = (Date.now() - (state.callStartTime || 0)) / 1000;
    await simulateHangup(state.callSid!, duration, state.callerPhone);
    dispatch({ type: "ADD_LOG", speaker: "API", text: "POST /api/voice/status-callback" });
    dispatch({ type: "ADD_LOG", speaker: "PIPELINE", text: "Post-call pipeline triggered (runs async on server)" });
  };

  const handleFetchSession = async () => {
    if (!state.callSid) return;
    fetch(`/api/debug/session?callSid=${state.callSid}`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_SESSION_DATA", data });
        dispatch({ type: "ADD_LOG", speaker: "SYSTEM", text: "Session fetched" });
      } else {
        dispatch({ type: "ADD_LOG", speaker: "ERROR", text: "Failed to fetch session" });
      }
    });
  };

  const statusColor = getStatusBadgeColor(state.phase);

  return (
    <div style={{ background: "#0d0f12", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "2rem" }}>
        <h1 style={{ margin: 0, color: "#e8eaf0", fontSize: "1.5rem", fontWeight: 600 }}>
          Elanpro Test Call Simulator
        </h1>
        <p style={{ color: "#8b8fa8", fontSize: "0.875rem", marginTop: "0.5rem" }}>
          No Twilio credits needed — calls the same API routes!
        </p>
      </div>

      <div style={{ display: "flex", flex: 1, padding: "0 2rem 2rem 2rem", gap: "1.5rem", flexDirection: "row" }}>
        {/* Left: Call Panel */}
        <div style={{ width: "40%", background: "#161920", borderRadius: "0.75rem", padding: "1.5rem", border: "1px solid #2a2d35" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", color: "#8b8fa8", marginBottom: "0.5rem", fontSize: "0.875rem" }}>
              Test caller phone (for DB lookup)
            </label>
            <input
              type="text"
              value={state.callerPhone}
              onChange={(e) => dispatch({ type: "SET_CALLER_PHONE", phone: e.target.value })}
              disabled={state.phase !== "idle"}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                background: "#0d0f12",
                border: "1px solid #2a2d35",
                borderRadius: "0.375rem",
                color: "#e8eaf0"
              }}
            />
            <p style={{ color: "#8b8fa8", fontSize: "0.75rem", marginTop: "0.5rem" }}>
              Use a phone number that exists in your customers table to test returning-customer context loading.
            </p>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{
              display: "inline-block",
              padding: "0.25rem 0.75rem",
              borderRadius: "9999px",
              background: statusColor.bg,
              color: statusColor.text,
              fontSize: "0.875rem",
              fontWeight: 500,
              textTransform: "capitalize"
            }}>
              Status: {state.phase.replace("_", " ")}
            </div>
          </div>

          {state.phase === "idle" && (
            <button
              onClick={handleCallNow}
              style={{
                width: "100%",
                background: "#166534",
                color: "#ffffff",
                padding: "1rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer"
              }}
            >
              [Phone] Call Now
            </button>
          )}

          {state.phase !== "idle" && state.phase !== "ended" && (
            <button
              onClick={handleEndCall}
              style={{
                width: "100%",
                background: "#dc2626",
                color: "#ffffff",
                padding: "1rem",
                fontSize: "1rem",
                fontWeight: 600,
                border: "none",
                borderRadius: "0.5rem",
                cursor: "pointer",
                marginBottom: "1rem"
              }}
            >
              ⏹️ End Call
            </button>
          )}

          {state.phase === "language_select" && (
            <div style={{ marginTop: "1.5rem" }}>
              <h3 style={{ color: "#e8eaf0", marginBottom: "1rem", fontSize: "1.125rem" }}>
                Select a Language
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {LANGUAGE_REGISTRY.map(lang => (
                  <button
                    key={lang.dtmfDigit}
                    onClick={() => handleLanguageSelect(lang.dtmfDigit)}
                    style={{
                      background: "#161920",
                      border: "1px solid #2a2d35",
                      padding: "0.75rem",
                      borderRadius: "0.5rem",
                      color: "#e8eaf0",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                      [{lang.dtmfDigit}] {lang.nativeName}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#8b8fa8" }}>
                      {lang.englishName}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {state.agentText && (
            <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#0d0f12", borderRadius: "0.5rem", border: "1px solid #2a2d35" }}>
              <p style={{ fontSize: "0.75rem", color: "#8b8fa8", marginBottom: "0.5rem" }}>[Speaker] Agent speaking</p>
              <p style={{ color: "#e8eaf0", margin: 0 }}>'{state.agentText}'</p>
            </div>
          )}
        </div>

        {/* Right: Debug Panel */}
        <div style={{ flex: 1, background: "#161920", borderRadius: "0.75rem", padding: "1.5rem", border: "1px solid #2a2d35", display: "flex", flexDirection: "column" }}>
          <h2 style={{ color: "#e8eaf0", fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Call Debug Log</h2>

          <div
            ref={logContainerRef}
            style={{
              flex: 1,
              maxHeight: "500px",
              overflow: "auto",
              padding: "1rem",
              background: "#0d0f12",
              borderRadius: "0.5rem",
              border: "1px solid #2a2d35",
              marginBottom: "1rem"
            }}
          >
            {state.logs.map((log, i) => (
              <div key={i} style={{ marginBottom: "0.5rem", display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{log.timestamp}</span>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: getSpeakerColor(log.speaker),
                  textTransform: "uppercase"
                }}>
                  {log.speaker}
                </span>
                <span style={{ color: "#e8eaf0" }}>{log.text}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem", padding: "1rem", background: "#0d0f12", borderRadius: "0.5rem", border: "1px solid #2a2d35" }}>
            <div style={{ color: "#8b8fa8" }}>
              Intent: {state.intent || "—"}</div>
            <div style={{ color: "#8b8fa8" }}>
              Lang: {state.selectedLang ? getLanguageByDigit(state.selectedLang)?.englishName || "—" : "—"}</div>
            <div style={{ color: "#8b8fa8" }}>Turns: {state.turnCount}</div>
            <div style={{ color: "#8b8fa8" }}>Interruptions: {state.interruptionCount}</div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              onClick={handleFetchSession}
              style={{
                background: "#1e3a5f",
                color: "#60a5fa",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                fontSize: "0.875rem",
                cursor: "pointer"
              }}
            >
              Fetch Session
            </button>
          </div>
        </div>
      </div>

      {/* Collapsible sections */}
      <div style={{ display: "flex", gap: "1.5rem", padding: "0 2rem 2rem 2rem" }}>
        {state.lastTwiML && (
          <div style={{ flex: 1, background: "#161920", borderRadius: "0.75rem", padding: "1.5rem", border: "1px solid #2a2d35" }}>
            <h3 style={{ color: "#e8eaf0", fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
              Last TwiML
            </h3>
            <pre style={{ whiteSpace: "pre-wrap", color: "#e8eaf0", fontSize: "0.75rem", background: "#0d0f12", padding: "1rem", borderRadius: "0.5rem", overflow: "auto", border: "1px solid #2a2d35" }}>
              {state.lastTwiML}
            </pre>
          </div>
        )}
        {state.sessionData && (
          <div style={{ flex: 1, background: "#161920", borderRadius: "0.75rem", padding: "1.5rem", border: "1px solid #2a2d35" }}>
            <h3 style={{ color: "#e8eaf0", fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" } }>
              Session Data
            </h3>
            <pre style={{ whiteSpace: "pre-wrap", color: "#e8eaf0", fontSize: "0.75rem", background: "#0d0f12", padding: "1rem", borderRadius: "0.5rem", overflow: "auto", border: "1px solid #2a2d35" }}>
              {JSON.stringify(state.sessionData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

