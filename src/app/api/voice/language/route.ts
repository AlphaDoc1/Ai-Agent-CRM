import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  console.log(`[Telephony] Received POST request to /api/voice/language`);
  try {
    const { searchParams } = new URL(request.url);
    const callerName = searchParams.get("name") || "Customer";
    const callType = searchParams.get("type") || "ai";

    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const digits = formData.get("Digits") as string;

    console.log(`[Telephony] Language Selection Debug: CallSid=${callSid}, Digits=${digits}, Name=${callerName}, Type=${callType}`);

    const languageMap: Record<string, { code: string; label: string; voice: string; greeting: string }> = {
      "1": { 
        code: "en-US", 
        label: "English", 
        voice: "Polly.Joanna-Neural",
        greeting: callType === "service" 
          ? `Hello ${callerName}! Thank you for contacting Elanpro customer service. How can I assist you today?`
          : `Hello ${callerName}! Welcome to Elanpro. How can I help you today?`
      },
      "2": { 
        code: "hi-IN", 
        label: "Hindi", 
        voice: "Polly.Aditi",
        greeting: callType === "service"
          ? `Namaste ${callerName}! Elanpro customer service mein aapka swagat hai. Aaj hum aapki kya sahayata kar sakte hain?`
          : `Namaste ${callerName}! Elanpro mein aapka swagat hai. Hum aapki kaise madad kar sakte hain?`
      },
      "3": { 
        code: "kn-IN", 
        label: "Kannada", 
        voice: "Polly.Kajal",
        greeting: `Namaskara ${callerName}! Elanpro ge swagatha. Naavu nimage hege sahayaka madabahudu?`
      },
      "4": { 
        code: "ta-IN", 
        label: "Tamil", 
        voice: "Polly.Arthi",
        greeting: `Vanakkam ${callerName}! Elanpro-vukku ungalai varaverkirom. Naangal ungalukku eppadi udhavalam?`
      },
      "5": { 
        code: "te-IN", 
        label: "Telugu", 
        voice: "Polly.Kavita",
        greeting: `Namaskaram ${callerName}! Elanpro ki swagatham. Memu meeku ela sahaya padagalam?`
      }
    };

    const selected = languageMap[digits] || languageMap["1"];
    const supabase = createAdminClient();

    // Resolve public URL
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${proto}://${host}`;

    try {
      // 1. Update call log with language and set status to in_progress
      // We use a broader update and fetch to avoid .single() errors if columns are missing
      const { data: updateData, error: updateError } = await supabase
        .from("call_logs")
        .update({
          preferred_language: selected.code,
          status: "in_progress",
          transcript: `Agent: ${selected.greeting}`
        })
        .eq("call_sid", callSid)
        .select();

      const callLog = updateData?.[0];

      if (updateError || !callLog) {
        console.error("[Telephony] Failed to update call log for language. This usually means call_sid or preferred_language columns are missing in DB.", updateError?.message);
      } else {
        // 2. Write initial turn
        await supabase.from("call_turns").insert({
          call_id: callLog.id,
          turn_index: 0,
          speaker: "AGENT",
          text: selected.greeting,
        });

        // 3. Initialize analysis
        await supabase.from("call_analysis").insert({
          call_id: callLog.id,
          resolution_status: "ACTIVE",
          turn_count: 1,
        });
      }
    } catch (dbErr) {
      console.error("[Telephony] Database error in language route, but continuing call:", dbErr);
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="${selected.code}">
    ${selected.greeting}
  </Say>
  <Gather input="speech" action="${publicUrl}/api/voice/respond?type=${encodeURIComponent(callType)}" speechTimeout="auto" enhanced="true" language="${selected.code}" />
  <Say language="${selected.code}">
    I'm sorry, I didn't hear anything. Goodbye.
  </Say>
  <Hangup/>
</Response>`;

    console.log(`[Telephony] Generated TwiML for Language selection: ${twiml}`);

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Telephony] Error in language selection route:", error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred.</Say><Hangup/></Response>`, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}
