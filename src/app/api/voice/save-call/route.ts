// ============================================
// API Route: Save Call Log
// POST /api/voice/save-call
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { ApiResponse, CallLog } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { caller_name, caller_phone, duration_seconds, transcript, ai_summary, status, escalated } = body;

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("call_logs")
      .insert({
        caller_name: caller_name || null,
        caller_phone: caller_phone || null,
        duration_seconds: duration_seconds || 0,
        transcript: transcript || null,
        ai_summary: ai_summary || null,
        status: escalated ? "escalated" : (status || "completed"),
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data } as ApiResponse<CallLog>, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to save call" },
      { status: 500 }
    );
  }
}
