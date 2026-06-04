// ============================================
// API Route: Lead Assignments
// GET /api/assignments — List with joins
// PATCH updates handled via /api/assignments/[id]
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ApiResponse, LeadAssignment } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const distributorId = searchParams.get("distributor_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("lead_assignments")
      .select("*, inquiry:inquiries(*), distributor:distributors(*)")
      .order("assigned_at", { ascending: false });

    if (distributorId) query = query.eq("distributor_id", distributorId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<LeadAssignment[]>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch assignments",
      },
      { status: 500 }
    );
  }
}
