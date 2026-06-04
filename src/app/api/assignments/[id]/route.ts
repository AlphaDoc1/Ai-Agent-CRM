// ============================================
// API Route: Single Assignment Update
// PATCH /api/assignments/[id]
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { updateAssignmentSchema } from "@/lib/validations";
import { ApiResponse, LeadAssignment } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validation = updateAssignmentSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { status, notes } = validation.data;

    const { data, error } = await supabase
      .from("lead_assignments")
      .update({ status, notes: notes || null })
      .eq("id", id)
      .select("*, inquiry:inquiries(*), distributor:distributors(*)")
      .single();

    if (error) throw error;

    // Sync inquiry status
    if (data?.inquiry_id) {
      const statusMap: Record<string, string> = {
        accepted: "in_progress",
        in_progress: "in_progress",
        converted: "converted",
        rejected: "escalated",
      };
      if (statusMap[status]) {
        await supabase
          .from("inquiries")
          .update({ status: statusMap[status] })
          .eq("id", data.inquiry_id);
      }
    }

    await supabase.from("activity_logs").insert({
      entity_type: "assignment",
      entity_id: id,
      action: "assignment_updated",
      details: { status },
    });

    return NextResponse.json({ success: true, data } as ApiResponse<LeadAssignment>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed" },
      { status: 500 }
    );
  }
}
