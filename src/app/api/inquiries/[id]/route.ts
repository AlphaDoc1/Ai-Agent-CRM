// ============================================
// API Route: Single Inquiry Operations
// GET /api/inquiries/[id]
// PATCH /api/inquiries/[id]
// DELETE /api/inquiries/[id]
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ApiResponse, Inquiry } from "@/lib/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("inquiries")
      .select("*, priority:lead_priority, assigned_distributor_id:assigned_distributor, distributor:distributors(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { success: false, error: "Inquiry not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data } as ApiResponse<Inquiry>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch inquiry",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    // Only allow specific fields to be updated
    const allowedFieldsMapping: Record<string, string> = {
      status: "status",
      priority: "lead_priority",
      assigned_distributor_id: "assigned_distributor",
      inquiry_type: "inquiry_type",
      ai_summary: "ai_summary",
    };

    const updates: Record<string, unknown> = {};
    for (const [frontendField, dbField] of Object.entries(allowedFieldsMapping)) {
      if (frontendField in body) {
        updates[dbField] = body[frontendField];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("inquiries")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Log the update
    await supabase.from("activity_logs").insert({
      entity_type: "inquiry",
      entity_id: id,
      action: "inquiry_updated",
      details: updates,
    });

    return NextResponse.json({ success: true, data } as ApiResponse<Inquiry>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update inquiry",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase.from("inquiries").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: "Inquiry deleted",
    } as ApiResponse);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to delete inquiry",
      },
      { status: 500 }
    );
  }
}
