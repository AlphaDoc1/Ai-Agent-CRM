// ============================================
// API Route: Dashboard Stats
// GET /api/dashboard/stats
// ============================================
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ApiResponse, DashboardStats } from "@/lib/types";

export async function GET() {
  try {
    const supabase = createAdminClient();

    // Fetch all counts in parallel
    const [
      totalLeadsRes,
      newLeadsRes,
      assignedLeadsRes,
      convertedLeadsRes,
      totalDistributorsRes,
      activeDistributorsRes,
      statusCountsRes,
      priorityCountsRes,
      recentLeadsRes,
      topDistributorsRes,
      urgentIssuesRes,
      recentAnalysesRes,
    ] = await Promise.all([
      supabase.from("inquiries").select("id", { count: "exact", head: true }),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "new"),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "assigned"),
      supabase
        .from("inquiries")
        .select("id", { count: "exact", head: true })
        .eq("status", "converted"),
      supabase
        .from("distributors")
        .select("id", { count: "exact", head: true }),
      supabase
        .from("distributors")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      // Status breakdown
      supabase.from("inquiries").select("status"),
      // Priority breakdown
      supabase.from("inquiries").select("priority"),
      // Recent leads (last 30 days, grouped by date)
      supabase
        .from("inquiries")
        .select("created_at")
        .gte(
          "created_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        )
        .order("created_at", { ascending: true }),
      // Top distributors
      supabase
        .from("distributors")
        .select("name, total_leads_assigned, total_conversions")
        .eq("is_active", true)
        .order("total_leads_assigned", { ascending: false })
        .limit(5),
      // Urgent issues from call analysis
      supabase
        .from("call_analysis")
        .select("id", { count: "exact", head: true })
        .eq("urgent_flag", true),
      // Recent call analyses
      supabase
        .from("call_analysis")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    // Process status counts
    const statusCounts: Record<string, number> = {};
    (statusCountsRes.data || []).forEach((row: { status: string }) => {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    });
    const leadsByStatus = Object.entries(statusCounts).map(
      ([status, count]) => ({ status, count })
    );

    // Process priority counts
    const priorityCounts: Record<string, number> = {};
    (priorityCountsRes.data || []).forEach((row: { priority: string }) => {
      priorityCounts[row.priority] =
        (priorityCounts[row.priority] || 0) + 1;
    });
    const leadsByPriority = Object.entries(priorityCounts).map(
      ([priority, count]) => ({ priority, count })
    );

    // Process leads trend (group by date)
    const dateCounts: Record<string, number> = {};
    (recentLeadsRes.data || []).forEach(
      (row: { created_at: string }) => {
        const date = new Date(row.created_at).toISOString().split("T")[0];
        dateCounts[date] = (dateCounts[date] || 0) + 1;
      }
    );
    const leadsTrend = Object.entries(dateCounts).map(([date, count]) => ({
      date,
      count,
    }));

    // Top distributors
    const topDistributors = (topDistributorsRes.data || []).map(
      (d: {
        name: string;
        total_leads_assigned: number;
        total_conversions: number;
      }) => ({
        name: d.name,
        leads: d.total_leads_assigned,
        conversions: d.total_conversions,
      })
    );

    const stats: DashboardStats = {
      totalLeads: totalLeadsRes.count || 0,
      newLeads: newLeadsRes.count || 0,
      assignedLeads: assignedLeadsRes.count || 0,
      convertedLeads: convertedLeadsRes.count || 0,
      totalDistributors: totalDistributorsRes.count || 0,
      activeDistributors: activeDistributorsRes.count || 0,
      urgentIssuesCount: urgentIssuesRes.count || 0,
      leadsByStatus,
      leadsByPriority,
      leadsTrend,
      topDistributors,
      recentAnalyses: recentAnalysesRes.data || [],
    };

    return NextResponse.json({
      success: true,
      data: stats,
    } as ApiResponse<DashboardStats>);
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to fetch stats",
      },
      { status: 500 }
    );
  }
}
