"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useDashboardStore, Notification } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

export default function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, fetchNotifications, addNotification, markAsRead, markAllAsRead } = useDashboardStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          console.log("[Realtime] New notification received:", payload.new);
          addNotification(payload.new as Notification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchNotifications, addNotification]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <button
        className="btn-ghost"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          border: "none",
          cursor: "pointer",
        }}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              width: "18px",
              height: "18px",
              borderRadius: "50%",
              background: "var(--accent-red)",
              color: "white",
              fontSize: "10px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #0a0a0f",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="glass-card"
          style={{
            position: "absolute",
            top: "50px",
            right: 0,
            width: "360px",
            maxHeight: "480px",
            overflowY: "auto",
            zIndex: 100,
            padding: "16px",
            boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 600 }}>Notifications</h3>
            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  style={{ 
                    fontSize: "11px", 
                    color: "var(--accent-blue)", 
                    background: "none", 
                    border: "none", 
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  Mark all as read
                </button>
              )}
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{notifications.length} recent</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {notifications.length === 0 ? (
              <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)" }}>
                <Clock size={32} style={{ marginBottom: "12px", opacity: 0.3 }} />
                <p>No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    markAsRead(n.id);
                    if (n.call_id) {
                      window.location.href = "/dashboard/analysis";
                    }
                  }}
                  style={{
                    padding: "12px",
                    borderRadius: "10px",
                    background: n.is_read ? "transparent" : "rgba(255,255,255,0.03)",
                    border: "1px solid",
                    borderColor: n.urgent_flag ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }}
                >
                  <div style={{ display: "flex", gap: "12px" }}>
                    <div style={{ color: n.urgent_flag ? "var(--accent-red)" : "var(--accent-blue)", marginTop: "2px" }}>
                      {n.urgent_flag ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: "14px", fontWeight: 600, marginBottom: "4px", color: n.urgent_flag ? "#fecaca" : "inherit" }}>
                        {n.title}
                      </p>
                      <p style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4, whiteSpace: "pre-line" }}>
                        {n.message}
                      </p>
                      <p style={{ fontSize: "10px", color: "var(--text-muted)", marginTop: "8px" }}>
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    {!n.is_read && (
                      <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent-blue)", marginTop: "6px" }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
