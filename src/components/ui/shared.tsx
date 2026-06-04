"use client";

import { getStatusColor, getPriorityColor, capitalize } from "@/lib/utils";

interface BadgeProps {
  type: "status" | "priority";
  value: string;
}

export function StatusBadge({ type, value }: BadgeProps) {
  const colorClass =
    type === "priority" ? getPriorityColor(value) : getStatusColor(value);
  const label = value.replace(/_/g, " ");

  return (
    <span className={`badge ${colorClass}`}>
      {capitalize(label)}
    </span>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  gradient?: string;
}

export function StatCard({ title, value, icon, trend, trendUp, gradient }: StatCardProps) {
  return (
    <div className="stat-card animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "8px" }}>
            {title}
          </p>
          <p style={{ fontSize: "32px", fontWeight: 700, lineHeight: 1 }}>
            {value}
          </p>
          {trend && (
            <p
              style={{
                fontSize: "12px",
                marginTop: "8px",
                color: trendUp ? "var(--accent-emerald)" : "var(--accent-red)",
              }}
            >
              {trendUp ? "↑" : "↓"} {trend}
            </p>
          )}
        </div>
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: gradient || "var(--gradient-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.9,
          }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: "64px",
          height: "64px",
          borderRadius: "16px",
          background: "var(--bg-elevated)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "16px",
          color: "var(--text-muted)",
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "4px" }}>
        {title}
      </h3>
      <p style={{ fontSize: "14px", color: "var(--text-muted)", marginBottom: "20px" }}>
        {description}
      </p>
      {action}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          border: "3px solid var(--border-subtle)",
          borderTopColor: "var(--accent-blue)",
          borderRadius: "50%",
          animation: "spin-slow 0.8s linear infinite",
        }}
      />
    </div>
  );
}
