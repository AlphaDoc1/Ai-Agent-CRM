import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processPostCall } from "@/lib/post-call-pipeline";

export async function POST(request: NextRequest) {
  try {
    const { callId } = await request.json();

    if (!callId) {
      return NextResponse.json({ success: false, error: "callId is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Trigger post-call pipeline
    console.log(`[Analysis Reprocess] Manually triggering post-call pipeline for call ${callId}`);
    const result = await processPostCall(callId);

    if (result.success) {
      return NextResponse.json({ success: true, message: "Analysis reprocessed successfully" });
    } else {
      return NextResponse.json({ success: false, error: result.error || "Failed to reprocess analysis" }, { status: 500 });
    }
  } catch (error) {
    console.error("[Analysis Reprocess API] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to reprocess analysis" }, { status: 500 });
  }
}
