// ============================================
// Post-Call Pipeline — Analyze completed calls
// Classifies, summarizes, and creates notifications
// ============================================
import { PostCallPipelineResult } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

/**
 * Call LLM for post-call analysis (routes to Groq Cloud if key present, falls back to Ollama).
 */
async function callPipelineLLM(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }
      console.warn("[PostCallPipeline] Groq API failed, falling back to Ollama.");
    } catch (err) {
      console.warn("[PostCallPipeline] Groq exception, falling back to Ollama:", err);
    }
  }

  // Local Ollama fallback
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3",
      prompt,
      stream: false,
      options: { temperature: 0.3, num_predict: 500 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama API error (${response.status})`);
  }
  const data = await response.json();
  return data.response || "";
}

/**
 * Process a completed call: classify, summarize, and create notifications.
 * Returns { success: true } on full success, or { success: false, error: "STEP_FAILED" } on failure.
 * All errors are also logged to call_analysis.pipeline_error.
 */
export async function processPostCall(callId: string): Promise<PostCallPipelineResult> {
  const supabase = createAdminClient();

  // Step 1: Fetch all turns for this call
  let turns;
  try {
    const { data, error } = await supabase
      .from("call_turns")
      .select("*")
      .eq("call_id", callId)
      .order("turn_index", { ascending: true });

    if (error) throw error;
    turns = data || [];
  } catch (err) {
    console.error("[PostCallPipeline] Failed to fetch turns:", err);
    await logPipelineError(supabase, callId, "TURN_FETCH_FAILED");
    return { success: false, error: "TURN_FETCH_FAILED" };
  }

  if (turns.length === 0) {
    console.warn("[PostCallPipeline] No turns found for call:", callId);
    return { success: true };
  }

  // Step 2: Separate into CUSTOMER and AGENT lines
  const customerLines = turns
    .filter((t: { speaker: string }) => t.speaker === "CUSTOMER")
    .map((t: { text: string }) => t.text);
  const agentLines = turns
    .filter((t: { speaker: string }) => t.speaker === "AGENT")
    .map((t: { text: string }) => t.text);
  const fullTranscript = turns
    .map((t: { speaker: string; text: string }) => `${t.speaker}: ${t.text}`)
    .join("\n");

  // Step 3: Send to LLM for classification and summary
  let callGroup: string;
  let summaryNote: string;
  try {
    const prompt = `Analyze this customer support call transcript and provide:
1. Classification into ONE of these groups: ORDER, PAYMENT, PRODUCT, ACCOUNT, GENERAL
2. A concise 2-3 sentence summary of the call.

CUSTOMER MESSAGES:
${customerLines.join("\n")}

AGENT MESSAGES:
${agentLines.join("\n")}

Respond with ONLY a JSON object:
{"call_group": "ORDER|PAYMENT|PRODUCT|ACCOUNT|GENERAL", "summary": "2-3 sentence summary"}`;

    const raw = await callPipelineLLM(prompt);
    const cleaned = raw.trim().replace(/\`\`\`json\s*/gi, "").replace(/\`\`\`\s*/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]);
    const validGroups = ["ORDER", "PAYMENT", "PRODUCT", "ACCOUNT", "GENERAL"];
    callGroup = validGroups.includes(parsed.call_group?.toUpperCase())
      ? parsed.call_group.toUpperCase()
      : "GENERAL";
    summaryNote = parsed.summary || "Call completed. No summary generated.";
  } catch (err) {
    console.error("[PostCallPipeline] LLM classification failed:", err);
    await logPipelineError(supabase, callId, "LLM_CLASSIFICATION_FAILED");
    return { success: false, error: "LLM_CLASSIFICATION_FAILED" };
  }

  // Step 4: Update call_analysis with group and summary
  try {
    // Fetch current analysis to check resolution status
    const { data: analysis } = await supabase
      .from("call_analysis")
      .select("resolution_status")
      .eq("call_id", callId)
      .single();

    const isEscalated = analysis?.resolution_status === "ESCALATED";

    const { error } = await supabase
      .from("call_analysis")
      .update({
        call_group: callGroup,
        summary_note: summaryNote,
        notification_flag: true,
        urgent_flag: isEscalated,
        pipeline_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("call_id", callId);

    if (error) throw error;
  } catch (err) {
    console.error("[PostCallPipeline] Summary update failed:", err);
    await logPipelineError(supabase, callId, "SUMMARY_UPDATE_FAILED");
    return { success: false, error: "SUMMARY_UPDATE_FAILED" };
  }

  // Step 5: Fetch caller name for notification title
  let callerName = "Customer";
  try {
    const { data: callLog } = await supabase
      .from("call_logs")
      .select("caller_name")
      .eq("id", callId)
      .single();
    if (callLog?.caller_name) {
      callerName = callLog.caller_name;
    }
  } catch {
    // Non-critical, use default
  }

  // Step 6: Fetch resolution status for notification
  let isEscalated = false;
  try {
    const { data: analysis } = await supabase
      .from("call_analysis")
      .select("resolution_status")
      .eq("call_id", callId)
      .single();
    isEscalated = analysis?.resolution_status === "ESCALATED";
  } catch {
    // Non-critical
  }

  // Step 7: Insert notification
  try {
    const title = isEscalated
      ? `Escalated ${callGroup} Issue — ${callerName}`
      : `${callGroup} Call Completed — ${callerName}`;

    const { error } = await supabase.from("notifications").insert({
      call_id: callId,
      title,
      message: summaryNote,
      call_group: callGroup,
      urgent_flag: isEscalated,
    });

    if (error) throw error;
  } catch (err) {
    console.error("[PostCallPipeline] Notification insert failed:", err);
    await logPipelineError(supabase, callId, "NOTIFICATION_INSERT_FAILED");
    return { success: false, error: "NOTIFICATION_INSERT_FAILED" };
  }

  // Step 8: Update call_logs with final AI summary
  try {
    await supabase
      .from("call_logs")
      .update({ ai_summary: summaryNote })
      .eq("id", callId);
  } catch (err) {
    console.warn("[PostCallPipeline] ai_summary update warning:", err);
    // Non-critical — don't fail the pipeline for this
  }

  console.log(`[PostCallPipeline] Successfully processed call ${callId}. Group: ${callGroup}`);
  return { success: true };
}

/** Log a pipeline error to the call_analysis table */
async function logPipelineError(
  supabase: ReturnType<typeof createAdminClient>,
  callId: string,
  error: string
) {
  try {
    await supabase
      .from("call_analysis")
      .update({ pipeline_error: error, updated_at: new Date().toISOString() })
      .eq("call_id", callId);
  } catch (err) {
    console.error("[PostCallPipeline] Failed to log pipeline error:", err);
  }
}
