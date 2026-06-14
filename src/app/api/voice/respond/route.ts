
// ============================================
// API Route: Handle Speech Input and AI Voice Response
// POST /api/voice/respond
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateVoiceResponse, generateAgentResponse } from "@/lib/ai-agent";
import { getSession, updateSession, pushHistory, type CallSession } from "@/lib/redis";
import { resolvePublicUrl } from "@/lib/utils";

function detectInterruption(session: any, newInput: string): boolean {
  if (!session) return false;
  if (!session.history.length) return false;

  const lastEntry = session.history[session.history.length - 1];
  const lastIsAssistant = 
    (typeof lastEntry === 'string' && lastEntry.startsWith('Agent:')) || 
    (typeof lastEntry === 'object' && lastEntry.role === 'assistant');

  if (!lastIsAssistant) return false;

  const timeSinceLastAgentTurn = session.lastAgentTurnTime 
    ? Date.now() - session.lastAgentTurnTime 
    : 9999999;
  
  if (timeSinceLastAgentTurn > 4000) return false;
  if (newInput.trim().length < 4) return false;

  return true;
}

export async function POST(request: NextRequest) {
  let callSid: string | null = null;
  let session: CallSession | null = null;
  let lang: 'hi' | 'en' | 'ta' | 'te' | 'kn' | 'mr' | 'bn' | 'gu' = 'en';
  let langCode = "en-IN";
  let voice = "Polly.Raveena";
  
  try {
    const { searchParams } = new URL(request.url);
    const isTimeout = searchParams.get("timeout") === "true";

    const formData = await request.formData();
    callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    let speechResult = formData.get("SpeechResult") as string;

    // Resolve public URL dynamically
    const publicUrl = await resolvePublicUrl(request);

    console.log(`[Telephony] Respond route called. CallSid: ${callSid}, Speech: "${speechResult}", Status: ${callStatus}`);

    session = await getSession(callSid);
    lang = session?.lang || "en";
    langCode = lang === "hi" ? "hi-IN" : "en-IN";
    voice = lang === "hi" ? "Polly.Aditi" : "Polly.Raveena";
    const supabase = createAdminClient();

    // Fetch call log using call_sid, with robustness
    let callLog = null;
    let callLogId = session?.callLogId;
    if (callLogId) {
      const { data: logData, error: logError } = await supabase.from("call_logs").select("*").eq("id", callLogId).single();
      if (logData) callLog = logData;
      if (logError) console.warn("[Telephony] Failed to fetch call log by id:", logError.message);
    } else if (callSid) {
      const { data: logsData, error: logsError } = await supabase.from("call_logs").select("*").eq("call_sid", callSid).order("created_at", { ascending: false }).limit(1);
      if (logsData && logsData.length > 0) {
        callLog = logsData[0];
        // Update session with found callLogId
        if (session) await updateSession(callSid, { callLogId: callLog.id });
      }
      if (logsError) console.warn("[Telephony] Failed to fetch call log by call_sid:", logsError.message);
    }

    // Handle "null" speechResult (Twilio sometimes sends "null" string)
    if (!speechResult || speechResult === "null" || speechResult.trim() === "") {
      const retryMsg = lang === "hi" 
        ? "Mujhe apki baat nahi sunai de rahi hai. Kya aap dobara kah sakte hain?" 
        : "I didn't catch that. Could you repeat it?";
      const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/voice/respond" method="POST" speechTimeout="2" language="${langCode}" timeout="10" bargeIn="true">
    <Say voice="${voice}" language="${langCode}">${retryMsg}</Say>
  </Gather>
  <Redirect>${publicUrl}/api/voice/respond?timeout=true</Redirect>
</Response>`;
      return new NextResponse(twiml, { headers: { "Content-Type": "application/xml" } });
    }

    // Log USER message clearly
    console.log(`\n========== CALL ${callSid} ==========`);
    console.log(`[USER] ${speechResult}`);
    console.log(`====================================`);

    let isInterruption = false;
    if (session) {
      isInterruption = detectInterruption(session, speechResult);
      
      if (isInterruption) {
        if (speechResult.trim().length < 4) {
          console.log("[Telephony][INTERRUPTION] Noise detected. Resuming previous response.");
          const previousResponse = session.interruptionBuffer || "";
          const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/voice/respond" method="POST" speechTimeout="2" language="${langCode}" timeout="15" bargeIn="true">
    <Say voice="${voice}" language="${langCode}">${previousResponse}</Say>
  </Gather>
  <Redirect>${publicUrl}/api/voice/respond?timeout=true</Redirect>
</Response>`;
          await updateSession(callSid, { interruptionBuffer: null });
          return new NextResponse(twiml, { headers: { "Content-Type": "application/xml" } });
        }

        console.log(`[Telephony][INTERRUPTION] ${callSid} customer interrupted at turn ${session.turnIndex}`);
        if (callLog?.id) {
          const { error: turnError } = await supabase.from("call_turns").insert({ 
            call_id: callLog.id, 
            turn_index: session.turnIndex++, 
            speaker: "SYSTEM", 
            text: "INTERRUPTION_DETECTED" 
          });
          if (turnError) console.warn("[Telephony][INTERRUPTION] Failed to insert interruption turn:", turnError.message);
        }
        
        let lastAgentContent = "";
        const newHistory = [...session.history];
        if (newHistory.length) {
          const lastEntry: any = newHistory[newHistory.length - 1];
          if (typeof lastEntry === 'string' && lastEntry.startsWith('Agent:')) {
            lastAgentContent = lastEntry.substring(6).trim();
          } else if (typeof lastEntry === 'object' && lastEntry.role === 'assistant') {
            lastAgentContent = lastEntry.content;
          }
          newHistory.pop();
        }
        newHistory.push({
          role: "system", 
          content: "Customer interrupted. Previous agent response was cut short. Prioritise customer's new question. Do not resume previous topic unless customer asks."
        });

        await updateSession(callSid, { 
          history: newHistory, 
          interruptionCount: (session.interruptionCount || 0) + 1, 
          interruptionBuffer: lastAgentContent,
          turnIndex: session.turnIndex 
        });
      }
    }

    const callerName = session?.customerName || "Customer";
    let voiceReply = "";
    let isEnding = false;
    
    try {
      // First, push USER message to history!
      await pushHistory(callSid, "user", speechResult);
      
      voiceReply = await generateAgentResponse(callSid, speechResult);
      
      // Then, push AGENT response to history!
      await pushHistory(callSid, "assistant", voiceReply);
      
      // Update turn index!
      if (session) {
        await updateSession(callSid, { 
          turnIndex: (session.turnIndex || 0) + 2 
        });
      }
      
      // Insert into call_turns!
      if (callLog?.id) {
        const currentTurnIndex = session?.turnIndex || 0;
        // Insert USER turn!
        const { error: userTurnErr } = await supabase.from("call_turns").insert({
          call_id: callLog.id,
          turn_index: currentTurnIndex,
          speaker: "USER",
          text: speechResult
        });
        if (userTurnErr) console.warn("[Telephony] Failed to insert user turn:", userTurnErr.message);
        // Insert AGENT turn!
        const { error: agentTurnErr } = await supabase.from("call_turns").insert({
          call_id: callLog.id,
          turn_index: currentTurnIndex + 1,
          speaker: "AGENT",
          text: voiceReply
        });
        if (agentTurnErr) console.warn("[Telephony] Failed to insert agent turn:", agentTurnErr.message);
      }
      
      // Log AGENT response clearly
      console.log(`\n========== CALL ${callSid} ==========`);
      console.log(`[AGENT] ${voiceReply}`);
      console.log(`====================================`);
      
      if (voiceReply.includes("shukriya") || voiceReply.includes("thank you") || voiceReply.includes("bye") || voiceReply.includes("alvida")) {
        isEnding = true;
      } else if (voiceReply.includes("manager") || voiceReply.includes("escalated")) {
        isEnding = true;
      }
    } catch (err) {
      if (err === "INTERRUPTED_BY_NEW_QUERY" || (err as any)?.name === "AbortError") {
        return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, { headers: { "Content-Type": "application/xml" } });
      }
      throw err;
    }

    if (session) {
      await updateSession(callSid, { lastAgentTurnTime: Date.now(), interruptionBuffer: null });
    }

    if (callLog?.id && isEnding) {
      const durationSeconds = Math.round((Date.now() - new Date(callLog.created_at).getTime()) / 1000);
      const updateData: any = {
        status: voiceReply.includes("manager") ? "escalated" : "completed",
        duration_seconds: durationSeconds
      };
      await supabase.from("call_logs").update(updateData).eq("id", callLog.id);
    }

    let twiml = "";
    if (isEnding) {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="${voice}" language="${langCode}">${voiceReply}</Say>
  <Hangup/>
</Response>`;
    } else {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/voice/respond" method="POST" speechTimeout="2" language="${langCode}" timeout="15" bargeIn="true">
    <Say voice="${voice}" language="${langCode}">${voiceReply}</Say>
  </Gather>
  <Redirect>${publicUrl}/api/voice/respond?timeout=true</Redirect>
</Response>`;
    }
    return new NextResponse(twiml, { headers: { "Content-Type": "application/xml" } });
  } catch (error: any) {
    if (error === "INTERRUPTED_BY_NEW_QUERY" || error.name === 'AbortError') {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response/>`, { headers: { "Content-Type": "application/xml" } });
    }
    console.error("[Telephony] Error in respond route:", error);

    // Try to resolve public URL even in error
    let publicUrl: string;
    try {
      publicUrl = await resolvePublicUrl(request);
    } catch {
      publicUrl = "https://headdress-vocally-widen.ngrok-free.dev"; // fallback
    }

    // Use already retrieved language info if available, else default to en
    const errorMsg = lang === "hi" 
      ? "Mujhe abhi dikkat ho rahi hai. Phir se kahiye." 
      : "Sorry, I'm having trouble. Please repeat that.";

    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/voice/respond" method="POST" speechTimeout="2" language="${langCode}" timeout="10" bargeIn="true">
    <Say voice="${voice}" language="${langCode}">${errorMsg}</Say>
  </Gather>
</Response>`;
    return new NextResponse(errorTwiml, { headers: { "Content-Type": "application/xml" } });
  }
}

