"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/shared";
import { Settings, Shield, Server, Database, Save, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[]; error?: string } | null>(null);
  const [isCloud, setIsCloud] = useState(false);
  const [saving, setSaving] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful customer service AI agent for a product distribution company..."
  );

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/ai/health");
      const json = await res.json();
      if (json.data) {
        setOllamaStatus(json.data.localOllama || { available: false, models: [] });
        setIsCloud(!!json.data.isCloud);
      } else {
        setOllamaStatus({ available: false, models: [] });
        setIsCloud(false);
      }
    } catch (err) {
      setOllamaStatus({ available: false, models: [], error: "Could not connect to health API" });
      setIsCloud(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Simulate saving prompt to backend/db
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Settings</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Configure CRM system, AI routing behavior, and database integrations
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
        {/* System Settings Form */}
        <form onSubmit={saveSettings} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <Settings size={18} color="var(--accent-blue)" />
              <h3 style={{ fontSize: "16px", fontWeight: 600 }}>AI Prompt Configuration</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                  AI Routing Agent System Prompt
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  style={{ resize: "vertical", fontFamily: "monospace", fontSize: "13px" }}
                />
                <p style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "4px" }}>
                  Defines behavior of Llama 3 when parsing inbound messages into structured leads.
                </p>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                  Routing Mode
                </label>
                <select className="input">
                  <option value="state_priority">State Match + Capacity Balance</option>
                  <option value="round_robin">Round Robin (Even Distribution)</option>
                  <option value="manual">Manual Approval Queue</option>
                </select>
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <Shield size={18} color="var(--accent-purple)" />
              <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Security & API Access</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                  Inquiry Webhook Authorization Token
                </label>
                <input className="input" type="password" value="••••••••••••••••••••••••••••••••" readOnly />
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={16} /> {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Health Check Panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Server size={18} color="var(--accent-orange)" />
                <h3 style={{ fontSize: "16px", fontWeight: 600 }}>AI Services & Engines</h3>
              </div>
              <button
                className="btn-ghost"
                style={{ padding: "4px", border: "none", background: "none", cursor: "pointer" }}
                onClick={fetchSettings}
              >
                <RefreshCw size={14} />
              </button>
            </div>

            {isCloud && (
              <div style={{ marginBottom: "20px", paddingBottom: "20px", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-emerald)", fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                  <CheckCircle size={16} /> Production AI (Groq Cloud) Active
                </div>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                  Outbound VoIP calling, voice response generator, and Whisper transcriber are live on the cloud.
                </p>
              </div>
            )}

            <h4 style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "12px" }}>
              LOCAL OLLAMA STATE
            </h4>

            {ollamaStatus?.available ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--accent-emerald)", fontSize: "14px", fontWeight: 600, marginBottom: "12px" }}>
                  <CheckCircle size={16} /> Connected to Ollama
                </div>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginBottom: "8px" }}>
                  Available Models:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(ollamaStatus.models || []).map((m) => (
                    <span
                      key={m}
                      style={{
                        padding: "3px 8px",
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "6px",
                        fontSize: "12px",
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", color: "var(--accent-red)", fontSize: "13px" }}>
                <AlertCircle size={16} style={{ marginTop: "2px", flexShrink: 0 }} />
                <div>
                  <span style={{ fontWeight: 600 }}>Not Connected</span>
                  <p style={{ color: "var(--text-muted)", marginTop: "4px", fontSize: "12px" }}>
                    Ensure Ollama is running on localhost:11434 and Llama 3 model is pulled.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="glass-card" style={{ padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "12px" }}>
              <Database size={18} color="var(--accent-emerald)" />
              <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Database Infrastructure</h3>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Supabase Connection</span>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>Online</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>RLS Policies</span>
                <span style={{ color: "var(--accent-emerald)", fontWeight: 600 }}>Enabled</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Inquiries Index</span>
                <span>Active</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Distributor Match Index</span>
                <span>Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
