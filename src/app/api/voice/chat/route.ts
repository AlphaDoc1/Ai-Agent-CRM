// ============================================
// API Route: Voice AI Agent
// POST /api/voice/chat — Process voice input text
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { generateVoiceResponse } from "@/lib/ai-agent";
import { createAdminClient } from "@/lib/supabase/server";
import { processPostCall } from "@/lib/post-call-pipeline";
import { ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history, callLogId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    let finalCallLogId = callLogId;

    if (!finalCallLogId) {
      // Create new call_logs entry for chat session (source = 'chat')
      const randomId = Math.random().toString(36).substring(2, 10);
      const { data: newCall, error: insertError } = await supabase
        .from("call_logs")
        .insert({
          caller_phone: `chat_${randomId}`,
          caller_name: "Web Chat Client",
          status: "in_progress",
          transcript: "",
          source: "chat",
        })
        .select("id")
        .single();

      if (insertError || !newCall) {
        console.error("[Chat Route] Failed to create call log:", insertError);
        throw new Error("Failed to initialize chat session");
      }
      finalCallLogId = newCall.id;
    }

    // Pass the real callLogId to generateVoiceResponse
    const response = await generateVoiceResponse(
      message,
      history || [],
      "service", // default type
      "Web Client", // default name
      finalCallLogId
    );

    // If call ended or escalated, sync call status and trigger post-call pipeline
    if (response.status === "ENDED" || response.status === "ESCALATED") {
      const status = response.status === "ESCALATED" ? "escalated" : "completed";
      
      const { data: callLog } = await supabase
        .from("call_logs")
        .select("created_at")
        .eq("id", finalCallLogId)
        .single();

      const durationSeconds = callLog
        ? Math.round((Date.now() - new Date(callLog.created_at).getTime()) / 1000)
        : 0;

      await supabase
        .from("call_logs")
        .update({
          status,
          duration_seconds: durationSeconds,
        })
        .eq("id", finalCallLogId);

      // Trigger post-call pipeline asynchronously in background
      processPostCall(finalCallLogId).catch(err => {
        console.error(`[Chat Route] Post-call pipeline failed for chat ${finalCallLogId}:`, err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        response: response.reply,
        status: response.status,
        metadata: response.metadata,
        callLogId: finalCallLogId,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Voice AI error" },
      { status: 500 }
    );
  }
}
