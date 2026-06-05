// ============================================
// API Route: Handle Speech Input and AI Voice Response
// POST /api/voice/respond
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateVoiceResponse } from "@/lib/ai-agent";
import { processPostCall } from "@/lib/post-call-pipeline";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const callType = searchParams.get("type") || "ai";

    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = (formData.get("From") as string) || "Unknown";
    const speechResult = formData.get("SpeechResult") as string;

    // Resolve public URL
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${proto}://${host}`;

    console.log(`[Telephony] Gathered speech. CallSid: ${callSid}, Speech: "${speechResult}"`);

    if (!speechResult) {
      // If we didn't capture any speech, prompt the user again
      const retryTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">
    I'm sorry, I didn't quite catch that. Could you repeat it?
  </Say>
  <Gather input="speech" action="${publicUrl}/api/voice/respond?type=${encodeURIComponent(callType)}" speechTimeout="auto" enhanced="true" language="en-US" />
</Response>`;
      return new NextResponse(retryTwiml, {
        headers: { "Content-Type": "application/xml" },
      });
    }

    const supabase = createAdminClient();

    // 1. Fetch the active call log and history using CallSid
    const { data: callLog, error: fetchError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("call_sid", callSid)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    let historyLines: string[] = [];

    if (fetchError || !callLog) {
      console.warn(`[Telephony] Call log not found for CallSid: ${callSid}.`);
    } else {
      const currentTranscript = callLog.transcript || "";
      if (currentTranscript.trim()) {
        historyLines = currentTranscript.split("\n").filter(Boolean);
      }
    }

    // 2. Query Llama 3 / generate response
    const callerName = callLog?.caller_name ? callLog.caller_name.replace(/\s+\(\+?\d+\)/g, "").trim() : "Customer";
    const preferredLang = callLog?.preferred_language || "en-US";
    
    console.log(`[Telephony] Querying AI for voice reply. Lang: ${preferredLang}, Caller: ${callerName}`);
    
    const agentResponse = await generateVoiceResponse(
      speechResult,
      historyLines,
      callType,
      callerName,
      callLog?.id || ""
    );
    
    const reply = agentResponse.reply;
    console.log(`[Telephony] AI reply: "${reply}"`);

    const isEnding = agentResponse.status === "ENDED" || agentResponse.status === "ESCALATED";

    // 3. Update the call log and caller name in Supabase
    if (callLog) {
      const updateData: any = {};
      
      // Update caller name if changed
      const currentName = callLog.caller_name;
      const extractedName = agentResponse.metadata.customer_name;
      if (extractedName && currentName !== extractedName) {
        updateData.caller_name = extractedName;
        console.log(`[Telephony] Extracted caller name: "${extractedName}". Updating call log...`);
      }

      if (isEnding) {
        const durationSeconds = Math.round((Date.now() - new Date(callLog.created_at).getTime()) / 1000);
        updateData.status = agentResponse.status === "ESCALATED" ? "escalated" : "completed";
        updateData.duration_seconds = durationSeconds;
        
        // Trigger post-call pipeline asynchronously (non-blocking)
        processPostCall(callLog.id).catch(err => {
          console.error(`[Telephony] Post-call pipeline failed for call ${callLog.id}:`, err);
        });
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from("call_logs")
          .update(updateData)
          .eq("id", callLog.id);

        if (updateError) {
          console.error("[Telephony] Failed to update call status/caller_name:", updateError);
        }
      }
    }

    // 4. Return TwiML with the AI response and a new Gather listener (or Hangup if done)
    let twiml = "";
    if (isEnding) {
      console.log(`[Telephony] Ending call for CallSid: ${callSid} based on status: ${agentResponse.status}`);
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${preferredLang}">
    ${reply}
  </Say>
  <Hangup/>
</Response>`;
    } else {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${preferredLang}">
    ${reply}
  </Say>
  <Gather input="speech" action="${publicUrl}/api/voice/respond?type=${encodeURIComponent(callType)}" speechTimeout="auto" enhanced="true" language="${preferredLang}" />
</Response>`;
    }

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Telephony] Error in speech response route:", error);
    const { searchParams } = new URL(request.url);
    const callType = searchParams.get("type") || "ai";
    
    // Resolve public URL again in catch block to be safe
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${proto}://${host}`;

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">Sorry, I had trouble processing that. Can you repeat it?</Say>
  <Gather input="speech" action="${publicUrl}/api/voice/respond?type=${encodeURIComponent(callType)}" speechTimeout="auto" enhanced="true" language="en-US" />
</Response>`;
    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
