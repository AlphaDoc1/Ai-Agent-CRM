"use client";

import { useEffect, useState } from "react";
import { useInquiryStore } from "@/lib/store";
import { StatusBadge, EmptyState, LoadingSpinner } from "@/components/ui/shared";
import { formatDateTime } from "@/lib/utils";
import { Plus, Search, Filter, MessageSquare, X, Send } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createInquirySchema, type CreateInquiryInput } from "@/lib/validations";

import { createClient } from "@/lib/supabase/client";

export default function InquiriesPage() {
  const {
    inquiries, isLoading, filters,
    setFilter, fetchInquiries,
  } = useInquiryStore();
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInquiries();

    // Subscribe to realtime database changes for inquiries
    const supabase = createClient();
    const channel = supabase
      .channel("inquiries-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inquiries" },
        () => {
          console.log("[Realtime] Inquiries changed, refreshing inquiry list...");
          fetchInquiries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchInquiries]);

  // Re-fetch on filter change
  useEffect(() => {
    const timeout = setTimeout(() => fetchInquiries(), 300);
    return () => clearTimeout(timeout);
  }, [filters.status, filters.priority, filters.search, fetchInquiries]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateInquiryInput>({
    resolver: zodResolver(createInquirySchema),
    defaultValues: { source: "web" },
  });

  const onSubmit = async (data: CreateInquiryInput) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        reset();
        setShowForm(false);
        fetchInquiries();
      }
    } catch (err) {
      console.error("Create inquiry error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700 }}>Inquiries</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Manage all customer inquiries and leads
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={16} /> New Inquiry
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", flex: "1", minWidth: "200px" }}>
          <Search
            size={15}
            style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            className="input"
            placeholder="Search by name, email, phone..."
            style={{ paddingLeft: "36px" }}
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
        <select
          className="input"
          style={{ width: "160px" }}
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All Status</option>
          <option value="new">New</option>
          <option value="ai_processed">AI Processed</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="converted">Converted</option>
          <option value="closed">Closed</option>
          <option value="escalated">Escalated</option>
        </select>
        <select
          className="input"
          style={{ width: "160px" }}
          value={filters.priority}
          onChange={(e) => setFilter("priority", e.target.value)}
        >
          <option value="">All Priority</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : inquiries.length === 0 ? (
        <EmptyState
          title="No inquiries found"
          description="Create your first inquiry to get started"
          icon={<MessageSquare size={28} />}
          action={
            <button className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Plus size={16} /> Create Inquiry
            </button>
          }
        />
      ) : (
        <div className="glass-card" style={{ overflow: "hidden" }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact</th>
                <th>State / City</th>
                <th>Product</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Source</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => (
                <tr key={inq.id}>
                  <td style={{ fontWeight: 500 }}>{inq.name}</td>
                  <td>
                    <div style={{ fontSize: "13px" }}>
                      {inq.email && <div style={{ color: "var(--text-secondary)" }}>{inq.email}</div>}
                      {inq.phone && <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{inq.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <span style={{ color: "var(--text-secondary)" }}>
                      {inq.state || "—"}{inq.city ? `, ${inq.city}` : ""}
                    </span>
                  </td>
                  <td style={{ color: "var(--text-secondary)" }}>
                    {inq.product_interest || "—"}
                  </td>
                  <td>
                    <StatusBadge type="status" value={inq.status} />
                  </td>
                  <td>
                    <StatusBadge type="priority" value={inq.priority} />
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "12px", textTransform: "uppercase" }}>
                    {inq.source}
                  </td>
                  <td style={{ color: "var(--text-muted)", fontSize: "13px", whiteSpace: "nowrap" }}>
                    {formatDateTime(inq.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Inquiry Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
              }}
            >
              <h2 style={{ fontSize: "20px", fontWeight: 600 }}>New Inquiry</h2>
              <button
                className="btn-ghost"
                style={{ border: "none", background: "none", cursor: "pointer", color: "var(--text-muted)" }}
                onClick={() => setShowForm(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Name */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>
                    Name *
                  </label>
                  <input className={`input ${errors.name ? "input-error" : ""}`} placeholder="Customer name" {...register("name")} />
                  {errors.name && <p style={{ color: "var(--accent-red)", fontSize: "12px", marginTop: "4px" }}>{errors.name.message}</p>}
                </div>

                {/* Phone & Email row */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Phone</label>
                    <input className="input" placeholder="+91-XXXXXXXXXX" {...register("phone")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Email</label>
                    <input className="input" placeholder="email@example.com" {...register("email")} />
                  </div>
                </div>

                {/* State & City */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>State</label>
                    <input className="input" placeholder="Maharashtra" {...register("state")} />
                  </div>
                  <div>
                    <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>City</label>
                    <input className="input" placeholder="Mumbai" {...register("city")} />
                  </div>
                </div>

                {/* Product Interest */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Product Interest</label>
                  <input className="input" placeholder="Product or service of interest" {...register("product_interest")} />
                </div>

                {/* Message */}
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Message</label>
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="Customer message or inquiry details..."
                    style={{ resize: "vertical" }}
                    {...register("message")}
                  />
                </div>

                {/* Submit */}
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? "Creating..." : <><Send size={14} /> Create & Analyze</>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
