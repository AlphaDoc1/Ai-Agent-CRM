"use client";

import Link from "next/link";
import { Zap, ArrowRight, BarChart3, Mic, Users, Brain } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background:
          "radial-gradient(ellipse at top, rgba(59, 130, 246, 0.08) 0%, transparent 50%), var(--bg-primary)",
      }}
    >
      {/* Hero */}
      <div
        className="animate-fade-in"
        style={{ textAlign: "center", maxWidth: "720px" }}
      >
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            borderRadius: "100px",
            background: "rgba(59, 130, 246, 0.1)",
            border: "1px solid rgba(59, 130, 246, 0.2)",
            fontSize: "13px",
            color: "var(--accent-blue)",
            marginBottom: "24px",
          }}
        >
          <Zap size={14} />
          AI-Powered CRM Platform
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 800,
            lineHeight: 1.1,
            marginBottom: "20px",
            letterSpacing: "-0.02em",
          }}
        >
          Intelligent{" "}
          <span className="gradient-text">Lead Management</span>
          <br />
          & Distribution
        </h1>

        <p
          style={{
            fontSize: "18px",
            color: "var(--text-secondary)",
            marginBottom: "36px",
            lineHeight: 1.7,
          }}
        >
          Automate inquiry processing with AI, assign leads to distributors
          intelligently, and engage customers with our voice AI agent — all
          from one powerful dashboard.
        </p>

        <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
          <Link href="/dashboard" className="btn btn-primary" style={{ fontSize: "16px", padding: "14px 28px" }}>
            Open Dashboard
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/dashboard/voice-agent"
            className="btn btn-secondary"
            style={{ fontSize: "16px", padding: "14px 28px" }}
          >
            <Mic size={18} />
            Try Voice Agent
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
          maxWidth: "900px",
          width: "100%",
          marginTop: "80px",
        }}
      >
        {[
          {
            icon: <Brain size={24} />,
            title: "AI Analysis",
            desc: "Every inquiry is analyzed by Llama 3 for priority, type, and routing.",
            gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
          },
          {
            icon: <Users size={24} />,
            title: "Auto Routing",
            desc: "Leads are automatically assigned to the best distributor by state.",
            gradient: "linear-gradient(135deg, #10b981, #059669)",
          },
          {
            icon: <Mic size={24} />,
            title: "Voice Agent",
            desc: "Browser-based voice AI for real-time customer conversations.",
            gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
          },
          {
            icon: <BarChart3 size={24} />,
            title: "Live Analytics",
            desc: "Real-time dashboards with charts, trends, and KPIs.",
            gradient: "var(--gradient-primary)",
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="glass-card animate-fade-in"
            style={{
              padding: "28px",
              animationDelay: `${i * 0.1}s`,
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: feature.gradient,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px",
                color: "white",
              }}
            >
              {feature.icon}
            </div>
            <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>
              {feature.title}
            </h3>
            <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
