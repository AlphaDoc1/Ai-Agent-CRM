"use client";

import { useState, useEffect } from "react";
import { LoadingSpinner } from "@/components/ui/shared";
import { FileText, User, Calendar, Tag, AlertTriangle, CheckCircle, Info, MessageSquare, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { useDashboardStore, CallAnalysis } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";

function AnalysisCard({ analysis }: { analysis: CallAnalysis }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const { fetchCallAnalyses } = useDashboardStore();

  const handleReprocess = async () => {
    setIsReprocessing(true);
    try {
      const res = await fetch("/api/dashboard/analysis/reprocess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: analysis.call_id }),
      });
      const data = await res.json();
      if (data.success) {
        fetchCallAnalyses(); // Refresh the list
      } else {
        alert("Failed to reprocess analysis: " + data.error);
      }
    } catch (err) {
      alert("Error reprocessing analysis");
    } finally {
      setIsReprocessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "RESOLVED":
      case "ENDED": return "var(--accent-green)";
      case "ESCALATED": return "var(--accent-red)";
      case "UNRESOLVED": return "var(--accent-yellow)";
      case "ACTIVE": return "var(--accent-blue)";
      default: return "var(--text-muted)";
    }
  };

  const isOldActive = analysis.resolution_status === "ACTIVE" && 
    (Date.now() - new Date(analysis.call_logs?.created_at || analysis.updated_at).getTime() > 5 * 60 * 1000);

  return (
    <div className="glass-card" style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <div style={{ 
            width: "40px", 
            height: "40px", 
            borderRadius: "10px", 
            background: analysis.resolution_status === "ESCALATED" ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: analysis.resolution_status === "ESCALATED" ? "var(--accent-red)" : "var(--accent-blue)"
          }}>
            {analysis.resolution_status === "ESCALATED" ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
          </div>
          <div>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>{analysis.issue_type || "General Inquiry"}</h3>
            <div style={{ display: "flex", gap: "12px", marginTop: "4px", fontSize: "12px", color: "var(--text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Calendar size={12} /> {new Date(analysis.call_logs?.created_at || analysis.updated_at).toLocaleString()}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Tag size={12} /> {analysis.call_group || "Uncategorized"}
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Clock size={12} /> {analysis.call_logs?.duration_seconds || 0}s
              </span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {(isOldActive || analysis.pipeline_error) && (
            <button
              onClick={handleReprocess}
              disabled={isReprocessing}
              style={{
                padding: "4px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                background: "rgba(59, 130, 246, 0.1)",
                color: "var(--accent-blue)",
                border: "1px solid var(--accent-blue)",
                cursor: "pointer",
                opacity: isReprocessing ? 0.5 : 1
              }}
            >
              {isReprocessing ? "Processing..." : "Retry AI Analysis"}
            </button>
          )}
          <div style={{ 
            padding: "4px 12px", 
            borderRadius: "20px", 
            fontSize: "12px", 
            fontWeight: 600,
            background: getStatusColor(analysis.resolution_status),
            color: "white"
          }}>
            {analysis.resolution_status}
          </div>
        </div>
      </div>

      {analysis.pipeline_error ? (
        <div style={{ 
          background: "rgba(239, 68, 68, 0.1)", 
          padding: "12px", 
          borderRadius: "8px", 
          border: "1px solid rgba(239, 68, 68, 0.2)",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center",
          color: "#fecaca"
        }}>
          <AlertTriangle size={16} />
          <span style={{ fontSize: "13px" }}>AI Pipeline Error: {analysis.pipeline_error}</span>
        </div>
      ) : null}

      <div style={{ 
        background: "rgba(0,0,0,0.2)", 
        padding: "20px", 
        borderRadius: "12px", 
        border: "1px solid var(--border-subtle)",
        marginBottom: "20px"
      }}>
        <pre style={{ 
          whiteSpace: "pre-wrap", 
          fontFamily: "inherit", 
          fontSize: "14px", 
          lineHeight: 1.6,
          color: "#e2e8f0" 
        }}>
          {analysis.summary_note || (analysis.pipeline_error ? "Summary failed to generate." : "Summary being generated by AI...")}
        </pre>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        <div style={{ fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Customer</span>
          <span style={{ fontWeight: 500 }}>{analysis.call_logs?.caller_name || analysis.customer_id || "Not Linked"}</span>
        </div>
        <div style={{ fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Order ID</span>
          <span style={{ fontWeight: 500 }}>{analysis.order_id || "NA"}</span>
        </div>
        <div style={{ fontSize: "13px" }}>
          <span style={{ color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>Sentiment Score</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ flex: 1, height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px" }}>
              <div style={{ 
                width: `${analysis.sentiment_score * 100}%`, 
                height: "100%", 
                background: analysis.sentiment_score > 0.6 ? "var(--accent-green)" : analysis.sentiment_score > 0.3 ? "var(--accent-yellow)" : "var(--accent-red)",
                borderRadius: "2px"
              }} />
            </div>
            <span style={{ fontWeight: 600 }}>{Math.round(analysis.sentiment_score * 100)}%</span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setShowTranscript(!showTranscript)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          color: "var(--accent-blue)",
          fontSize: "13px",
          fontWeight: 500,
          cursor: "pointer",
          padding: 0
        }}
      >
        <MessageSquare size={16} />
        {showTranscript ? "Hide Transcript" : "View Full Transcript"}
        {showTranscript ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showTranscript && (
        <div style={{ 
          marginTop: "16px", 
          padding: "16px", 
          background: "rgba(255,255,255,0.03)", 
          borderRadius: "8px",
          maxHeight: "300px",
          overflowY: "auto",
          fontSize: "13px",
          lineHeight: 1.5,
          border: "1px dashed var(--border-subtle)"
        }}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", color: "var(--text-muted)" }}>
            {analysis.call_logs?.transcript || "No transcript available for this call."}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const { callAnalyses: analyses, fetchCallAnalyses, isLoading } = useDashboardStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchCallAnalyses();

    // Subscribe to real-time analysis updates
    const supabase = createClient();
    const channel = supabase
      .channel("realtime-analysis")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_analysis" },
        (payload) => {
          console.log("[Realtime] Analysis changed:", payload);
          // Refresh the whole list to ensure we get joined data
          fetchCallAnalyses();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCallAnalyses]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchCallAnalyses();
    setIsRefreshing(false);
  };

  if (isLoading && analyses.length === 0) return <LoadingSpinner />;

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ fontSize: "26px", fontWeight: 700 }}>AI Call Analysis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", marginTop: "4px" }}>
            Detailed AI-generated summaries and sentiment reports for all support calls
          </p>
        </div>
        <button 
          onClick={handleManualRefresh}
          disabled={isRefreshing || isLoading}
          style={{
            padding: "8px 16px",
            borderRadius: "8px",
            background: "var(--accent-blue)",
            color: "white",
            border: "none",
            fontSize: "13px",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            opacity: (isRefreshing || isLoading) ? 0.7 : 1,
            transition: "all 0.2s ease"
          }}
        >
          <Clock size={16} className={(isRefreshing || isLoading) ? "animate-spin" : ""} />
          {(isRefreshing || isLoading) ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gap: "20px" }}>
        {analyses.length === 0 ? (
          <div className="glass-card" style={{ padding: "48px", textAlign: "center" }}>
            <FileText size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
            <p style={{ color: "var(--text-muted)" }}>No call analysis reports found.</p>
          </div>
        ) : (
          analyses.map((analysis) => (
            <AnalysisCard key={analysis.id} analysis={analysis} />
          ))
        )}
      </div>
    </div>
  );
}
