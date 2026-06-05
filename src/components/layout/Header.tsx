"use client";

import { Bell, Search } from "lucide-react";
import { useState } from "react";
import NotificationCenter from "../notifications/NotificationCenter";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 32px",
        borderBottom: "1px solid var(--border-subtle)",
        background: "rgba(10, 10, 15, 0.8)",
        backdropFilter: "blur(20px)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Search */}
      <div style={{ position: "relative", width: "360px" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
          }}
        />
        <input
          type="text"
          placeholder="Search inquiries, distributors..."
          className="input"
          style={{ paddingLeft: "36px" }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right side */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Notifications */}
        <NotificationCenter />

        {/* User avatar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "6px 14px 6px 6px",
            borderRadius: "10px",
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            A
          </div>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 500, lineHeight: 1.2 }}>
              Admin
            </p>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Administrator
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
