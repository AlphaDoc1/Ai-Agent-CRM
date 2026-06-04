"use client";

import { useEffect } from "react";
import { useDashboardStore } from "@/lib/store";
import { StatCard, LoadingSpinner } from "@/components/ui/shared";
import {
  MessageSquare,
  UserPlus,
  CheckCircle,
  Users,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const STATUS_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#f97316",
  "#10b981",
  "#6b7280",
  "#ef4444",
];

const PRIORITY_COLORS: Record<string, string> = {
  low: "#64748b",
  medium: "#3b82f6",
  high: "#f59e0b",
  urgent: "#ef4444",
};

import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const { stats, isLoading, fetchStats } = useDashboardStore();

  useEffect(() => {
    fetchStats();

    // Subscribe to realtime database changes to update stats instantly when phone leads are routed
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiries" },
        () => {
          console.log("[Realtime] Inquiries changed, refreshing dashboard stats...");
          fetchStats();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_logs" },
        () => {
          console.log("[Realtime] Call logs changed, refreshing dashboard stats...");
          fetchStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchStats]);

  if (isLoading || !stats) {
    return <LoadingSpinner />;
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Dashboard</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
          Real-time overview of your CRM performance
        </p>
      </div>

      {/* Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <StatCard
          title="Total Leads"
          value={stats.totalLeads}
          icon={<MessageSquare size={22} color="white" />}
          gradient="var(--gradient-primary)"
        />
        <StatCard
          title="New Leads"
          value={stats.newLeads}
          icon={<UserPlus size={22} color="white" />}
          gradient="linear-gradient(135deg, #8b5cf6, #6366f1)"
          trend="Today"
          trendUp={true}
        />
        <StatCard
          title="Assigned"
          value={stats.assignedLeads}
          icon={<TrendingUp size={22} color="white" />}
          gradient="linear-gradient(135deg, #f59e0b, #f97316)"
        />
        <StatCard
          title="Converted"
          value={stats.convertedLeads}
          icon={<CheckCircle size={22} color="white" />}
          gradient="var(--gradient-success)"
        />
        <StatCard
          title="Distributors"
          value={stats.activeDistributors}
          icon={<Users size={22} color="white" />}
          gradient="linear-gradient(135deg, #ec4899, #be185d)"
        />
        <StatCard
          title="AI Processed"
          value={stats.totalLeads - stats.newLeads}
          icon={<Zap size={22} color="white" />}
          gradient="linear-gradient(135deg, #06b6d4, #0891b2)"
        />
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "20px",
          marginBottom: "28px",
        }}
      >
        {/* Leads Trend Chart */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
            Leads Trend (30 Days)
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={stats.leadsTrend}>
              <defs>
                <linearGradient id="leadGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="date"
                stroke="#6b6b80"
                fontSize={11}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis stroke="#6b6b80" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1c1c28",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#leadGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie Chart */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
            Leads by Status
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.leadsByStatus}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="count"
                nameKey="status"
                stroke="none"
              >
                {stats.leadsByStatus.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={STATUS_COLORS[index % STATUS_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#1c1c28",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "13px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            {stats.leadsByStatus.map((item, i) => (
              <div
                key={item.status}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px" }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "2px",
                    background: STATUS_COLORS[i % STATUS_COLORS.length],
                  }}
                />
                <span style={{ color: "var(--text-muted)", textTransform: "capitalize" }}>
                  {item.status.replace("_", " ")} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
      >
        {/* Priority Bar Chart */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
            Leads by Priority
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.leadsByPriority}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="priority" stroke="#6b6b80" fontSize={12} />
              <YAxis stroke="#6b6b80" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "#1c1c28",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {stats.leadsByPriority.map((entry) => (
                  <Cell
                    key={entry.priority}
                    fill={PRIORITY_COLORS[entry.priority] || "#6b7280"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Distributors */}
        <div className="glass-card" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "20px" }}>
            Top Distributors
          </h3>
          {stats.topDistributors.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>No data yet</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {stats.topDistributors.map((dist, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    background: "var(--bg-secondary)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        background: STATUS_COLORS[i],
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "white",
                      }}
                    >
                      {i + 1}
                    </div>
                    <span style={{ fontSize: "14px", fontWeight: 500 }}>
                      {dist.name}
                    </span>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "14px", fontWeight: 600 }}>{dist.leads}</p>
                    <p style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                      {dist.conversions} converted
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
