"use client";

import { useEffect, useState } from "react";
import { StatusBadge, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { formatDateTime } from "@/lib/utils";
import { TrendingUp, ChevronDown } from "lucide-react";
import type { LeadAssignment, ApiResponse } from "@/lib/types";

import { createClient } from "@/lib/supabase/client";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<LeadAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchAssignments = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/assignments?${params.toString()}`);
      const json: ApiResponse<LeadAssignment[]> = await res.json();
      if (json.success && json.data) setAssignments(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();

    // Subscribe to realtime database changes for assignments
    const supabase = createClient();
    const channel = supabase
      .channel("assignments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lead_assignments" },
        () => {
          console.log("[Realtime] Lead assignments changed, refreshing list...");
          fetchAssignments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`/api/assignments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchAssignments();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Lead Assignments</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Track lead assignments and distributor progress
          </p>
        </div>
        <select
          className="input"
          style={{ width: "180px" }}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Accepted</option>
          <option value="in_progress">In Progress</option>
          <option value="converted">Converted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : assignments.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Assignments are created automatically when inquiries are processed by AI"
          icon={<TrendingUp size={28} />}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {assignments.map((a) => (
            <div key={a.id} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", flex: 1 }}>
                  {/* Lead Info */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "15px" }}>
                      {(a.inquiry as LeadAssignment["inquiry"])?.name || "Unknown Lead"}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {(a.inquiry as LeadAssignment["inquiry"])?.email || "No email"} •{" "}
                      {(a.inquiry as LeadAssignment["inquiry"])?.state || "Unknown State"}
                    </p>
                  </div>

                  {/* Arrow */}
                  <div style={{ color: "var(--text-muted)", padding: "0 12px" }}>→</div>

                  {/* Distributor */}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: "15px" }}>
                      {(a.distributor as LeadAssignment["distributor"])?.name || "Unassigned"}
                    </p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", marginTop: "2px" }}>
                      {(a.distributor as LeadAssignment["distributor"])?.state || ""} •{" "}
                      {(a.distributor as LeadAssignment["distributor"])?.phone || ""}
                    </p>
                  </div>
                </div>

                {/* Status & Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <StatusBadge type="status" value={a.status} />
                  <div style={{ fontSize: "12px", color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                    {formatDateTime(a.assigned_at)}
                  </div>
                  <div style={{ position: "relative" }}>
                    <select
                      className="input"
                      style={{ width: "140px", fontSize: "12px", padding: "6px 10px" }}
                      value={a.status}
                      onChange={(e) => updateStatus(a.id, e.target.value)}
                    >
                      <option value="pending">Pending</option>
                      <option value="accepted">Accept</option>
                      <option value="in_progress">In Progress</option>
                      <option value="converted">Converted</option>
                      <option value="rejected">Reject</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* AI Summary */}
              {(a.inquiry as LeadAssignment["inquiry"])?.ai_summary && (
                <div style={{
                  marginTop: "12px", paddingTop: "12px",
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: "13px", color: "var(--text-secondary)",
                }}>
                  <span style={{ color: "var(--accent-purple)", fontWeight: 500, marginRight: "6px" }}>AI Summary:</span>
                  {(a.inquiry as LeadAssignment["inquiry"])?.ai_summary}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
