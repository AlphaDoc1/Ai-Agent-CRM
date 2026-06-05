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

  // Step 3: Send to LLM for classification and summary (NEW INSTRUCTIONS)
  let analysis: {
    main_issue: string;
    resolution_status: string;
    sentiment: string;
    keywords: string[];
    group: string;
    description: string;
    agent_action: string;
  };

  try {
    const prompt = `Analyze this Elanpro (Commercial Refrigeration) customer support call conversation.
CUSTOMER MESSAGES:
${customerLines.join("\n")}

AGENT MESSAGES:
${agentLines.join("\n")}

STRICT INSTRUCTIONS:
Extract the following information and respond with ONLY a JSON object:
1. main_issue: A 1-sentence summary of the core problem.
2. resolution_status: Exactly one of "Resolved", "Unresolved", or "Escalated".
3. sentiment: Exactly one of "Positive", "Neutral", or "Frustrated".
4. keywords: An array of 3-5 key problem keywords.
5. group: Categorize into ONE: "ORDER_GROUP", "PAYMENT_GROUP", "PRODUCT_GROUP", "ACCOUNT_GROUP", or "GENERAL_GROUP".
   - ORDER_GROUP: wrong item, missing item, not delivered, late delivery, return, replacement
   - PAYMENT_GROUP: refund, double charge, payment failed, billing issue
   - PRODUCT_GROUP: defective product, quality issue, product info, warranty
   - ACCOUNT_GROUP: login, profile, password, account access
   - GENERAL_GROUP: anything else
6. description: A 2-3 line description of what the customer said.
7. agent_action: What the agent responded or did.

JSON format:
{
  "main_issue": "...",
  "resolution_status": "...",
  "sentiment": "...",
  "keywords": ["...", "..."],
  "group": "...",
  "description": "...",
  "agent_action": "..."
}`;

    const raw = await callPipelineLLM(prompt);
    const cleaned = raw.trim().replace(/\`\`\`json\s*/gi, "").replace(/\`\`\`\s*/g, "");
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");
    analysis = JSON.parse(jsonMatch[0]);
  } catch (err) {
    console.error("[PostCallPipeline] LLM analysis failed:", err);
    await logPipelineError(supabase, callId, "LLM_ANALYSIS_FAILED");
    return { success: false, error: "LLM_ANALYSIS_FAILED" };
  }

  // Step 4: Create Call Summary Note (EXACT FORMAT)
  let callLogData;
  let analysisData;
  try {
    const { data: log } = await supabase.from("call_logs").select("*").eq("id", callId).single();
    const { data: ana } = await supabase.from("call_analysis").select("*").eq("call_id", callId).single();
    callLogData = log;
    analysisData = ana;
  } catch { /* Ignore */ }

  const timestamp = callLogData?.created_at ? new Date(callLogData.created_at).toLocaleString() : new Date().toLocaleString();
  const actionRequired = (analysis.resolution_status === "Unresolved" || analysis.resolution_status === "Escalated") ? "Yes" : "No";
  
  const summaryNote = `--- 
CALL SUMMARY 
Call ID: ${callId} 
Date & Time: ${timestamp} 
Customer Name: ${callLogData?.caller_name || "Unknown"} 
Customer ID: ${analysisData?.customer_id || "NA"} 
Order ID: ${analysisData?.order_id || "NA"} 
Issue Category: ${analysis.group} 
Issue Description: ${analysis.description} 
Agent Action Taken: ${analysis.agent_action} 
Resolution Status: ${analysis.resolution_status} 
Customer Sentiment: ${analysis.sentiment} 
Action Required: ${actionRequired} 
---`;

  // Step 5: Route to Dashboard Group
  try {
    const isUrgent = actionRequired === "Yes";

    const { error } = await supabase
      .from("call_analysis")
      .update({
        call_group: analysis.group,
        summary_note: summaryNote,
        notification_flag: true,
        urgent_flag: isUrgent,
        resolution_status: analysis.resolution_status.toUpperCase(),
        sentiment_score: analysis.sentiment === "Positive" ? 0.9 : analysis.sentiment === "Neutral" ? 0.5 : 0.1,
        pipeline_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("call_id", callId);

    if (error) throw error;
  } catch (err) {
    console.error("[PostCallPipeline] Analysis update failed:", err);
    await logPipelineError(supabase, callId, "ANALYSIS_UPDATE_FAILED");
    return { success: false, error: "ANALYSIS_UPDATE_FAILED" };
  }

  // Step 6: Group Notification
  try {
    const notificationMessage = `New support case assigned. 
Customer ${callLogData?.caller_name || "Customer"} (ID: ${analysisData?.customer_id || "NA"}) reported a ${analysis.group} issue. 
Status: ${analysis.resolution_status}. 
Action Required: ${actionRequired}. 
Check dashboard for full summary.`;

    const { error } = await supabase.from("notifications").insert({
      call_id: callId,
      title: `New Support Case: ${analysis.group}`,
      message: notificationMessage,
      call_group: analysis.group,
      urgent_flag: (analysis.resolution_status === "Unresolved" || analysis.resolution_status === "Escalated"),
    });

    if (error) throw error;
  } catch (err) {
    console.error("[PostCallPipeline] Notification insert failed:", err);
    // Non-critical but log it
  }

  // Step 8: Update call_logs with final AI summary and separated transcript
  try {
    const formattedTranscript = turns
      .map((t: { speaker: string; text: string; created_at: string }) => 
        `[${new Date(t.created_at).toLocaleTimeString()}] ${t.speaker}: ${t.text}`
      )
      .join("\n");

    await supabase
      .from("call_logs")
      .update({ 
        ai_summary: analysis.main_issue, // Use the 1-sentence issue as summary
        transcript: formattedTranscript 
      })
      .eq("id", callId);
  } catch (err) {
    console.warn("[PostCallPipeline] call_logs final update warning:", err);
  }

  console.log(`[PostCallPipeline] Successfully processed call ${callId}. Group: ${analysis.group}`);
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
