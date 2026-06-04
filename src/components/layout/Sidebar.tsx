"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Mic,
  Settings,
  LogOut,
  Zap,
  TrendingUp,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/dashboard/distributors", label: "Distributors", icon: Users },
  { href: "/dashboard/assignments", label: "Assignments", icon: TrendingUp },
  { href: "/dashboard/voice-agent", label: "Voice Agent", icon: Mic },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ marginBottom: "32px", paddingLeft: "14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--gradient-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Zap size={20} color="white" />
          </div>
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
              className="gradient-text"
            >
              AI CRM Pro
            </h1>
            <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
              Intelligent Lead Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <p
          style={{
            fontSize: "11px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--text-muted)",
            paddingLeft: "14px",
            marginBottom: "8px",
          }}
        >
          Main Menu
        </p>
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "16px" }}>
        <button
          className="sidebar-link"
          style={{ width: "100%", border: "none", background: "none", cursor: "pointer" }}
          onClick={() => {
            // Logout handled in auth flow
          }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
