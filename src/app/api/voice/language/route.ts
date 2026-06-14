import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession, updateSession, pushHistory, enrichSessionWithCustomer, initSession } from "@/lib/redis";
import { getLanguageByDigit } from "@/lib/language-config";
import { resolvePublicUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  console.log(`[Telephony][LANGUAGE] Received POST request to /api/voice/language`);
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const digits = formData.get("Digits") as string;
    const from = (formData.get("From") as string) || "Unknown";
    const { searchParams } = new URL(request.url);
    const defaultLang = searchParams.get("DefaultLang") || "en";

    // Determine selected lang
    const langConfig = getLanguageByDigit(digits);
    const lang = (langConfig?.key as 'hi' | 'en' | 'ta' | 'te' | 'kn' | 'mr' | 'bn' | 'gu') || "en";
    const langCode = langConfig?.bcp47 || "en-IN";
    const voice = langConfig?.key === "hi" ? "Polly.Aditi" : "Polly.Raveena";

    console.log(`[Telephony][LANGUAGE] CallSid: ${callSid}, Lang: ${lang}`);

    // Fetch session
    let session = await getSession(callSid);
    
    // Recovery for Simulator calls in dev mode (handles hot-reloading session loss)
    if (!session && callSid.startsWith("SIM_")) {
      console.log(`[Telephony][LANGUAGE] Session lost for simulator call ${callSid}. Re-initializing.`);
      session = await initSession(callSid, from);
    }

    if (!session) {
      throw new Error("Session not found");
    }
    const callerPhone = session.callerPhone;
    const callLogId = session.callLogId;

    // Update session with language
    await updateSession(callSid, { lang, turnIndex: 1 });

    // Update call log
    const supabase = createAdminClient();
    if (callLogId) {
      const { error: updateError } = await supabase.from("call_logs").update({
        preferred_language: langCode
      }).eq("id", callLogId);
      if (updateError) console.warn("[Telephony][LANGUAGE] Failed to update call log language:", updateError.message);
    }

    // Fire and forget: preload customer data using our new function
    (async () => {
      if (callerPhone) {
        await enrichSessionWithCustomer(callSid, createAdminClient());
      }
    })();

    // Resolve public URL
    const publicUrl = await resolvePublicUrl(request);

    // Generate greeting
    const greeting = lang === "hi" 
      ? "Elanpro mein phone karne ke liye shukriya. Main aapka AI assistant hoon. Aap products ke baare mein pooch sakte hain, order status check kar sakte hain, ya service request kar sakte hain. Batayein, kaise madad kar sakta hoon?"
      : "Thank you for calling Elanpro, India's number one commercial refrigeration brand. I'm your AI assistant. How can I help you today? You can ask about our products, check your order status, or request a service.";
    
    // Log AGENT greeting clearly
    console.log(`\n========== CALL ${callSid} ==========
[AGENT] ${greeting}
====================================`);

    // Insert agent greeting in call_turns and push to history (regardless of callLogId)
    if (callLogId) {
      const { error: turnError } = await supabase.from("call_turns").insert({
        call_id: callLogId,
        turn_index: 1,
        speaker: "AGENT",
        text: greeting
      });
      if (turnError) console.warn("[Telephony][LANGUAGE] Failed to insert agent turn:", turnError.message);
    }
    await pushHistory(callSid, "assistant", greeting);
    await updateSession(callSid, { turnIndex: 2 });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" action="${publicUrl}/api/voice/respond" method="POST" speechTimeout="2" language="${langCode}" timeout="10">
    <Say voice="${voice}" language="${langCode}">
      ${greeting}
    </Say>
  </Gather>
  <Redirect>${publicUrl}/api/voice/respond?timeout=true</Redirect>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Telephony][LANGUAGE] Route Error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}
