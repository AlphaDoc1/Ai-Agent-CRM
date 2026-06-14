// ============================================
// API Route: Incoming Telephony Voice Hook
// POST /api/voice/incoming
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { initSession, pushHistory } from "@/lib/redis";
import { resolvePublicUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = (formData.get("From") as string) || "Unknown";
    const to = (formData.get("To") as string) || "Unknown";
    const { searchParams } = new URL(request.url);
    const callerName = searchParams.get("name") || "Valued Customer";
    const callType = searchParams.get("type") || "ai";

    console.log(`[Telephony][INCOMING] CallSid: ${callSid}, From: ${from}`);

    // Resolve public URL dynamically
    const publicUrl = await resolvePublicUrl(request);

    // Initialize session
    const session = await initSession(callSid, from);
    const callLogId = session.callLogId;

    const supabase = createAdminClient();

    // Insert call_turns (system turn)
    if (callLogId) {
      const { error: turnError } = await supabase.from("call_turns").insert({
        call_id: callLogId,
        turn_index: 0,
        speaker: "SYSTEM",
        text: "Call initiated"
      });
      if (turnError) console.warn("[Telephony][INCOMING] Failed to insert system turn:", turnError.message);
    }

    // Fire and forget: start recording
    startTwilioCallRecording(callSid, publicUrl).catch((err: unknown) =>
      console.error("[Telephony] Failed to initiate recording task:", err)
    );

    // TwiML response
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="${publicUrl}/api/voice/language" method="POST" numDigits="1" timeout="10">
    <Say voice="Polly.Raveena" language="en-IN">
      Welcome to Elanpro, India's number one commercial refrigeration brand. Press 1 for English.
    </Say>
    <Say voice="Polly.Aditi" language="hi-IN">
      Elanpro mein aapka swagat hai. India ka number one commercial refrigeration brand. Hindi ke liye 2 dabaye.
    </Say>
  </Gather>
  <Redirect>${publicUrl}/api/voice/language?DefaultLang=en</Redirect>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Telephony][INCOMING] Incoming call error:", error);
    return new NextResponse("Error", { status: 500 });
  }
}

async function startTwilioCallRecording(callSid: string, publicUrl: string) {
  if (callSid.startsWith("SIM_")) {
    console.log(`[Telephony] Skipping recording trigger for simulator call: ${callSid}`);
    return;
  }
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn("[Telephony] Twilio credentials missing in env. Call recording won't be started programmatically.");
    return;
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    
    // Use a short timeout for the Twilio API call to avoid hanging the process
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          RecordingStatusCallback: `${publicUrl}/api/voice/recording`,
          RecordingStatusCallbackEvent: "completed",
          RecordingChannels: "mono",
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error("[Telephony] Failed to start Twilio call recording:", text);
    } else {
      console.log(`[Telephony] Call recording started successfully for CallSid: ${callSid} callback: ${publicUrl}/api/voice/recording`);
    }
  } catch (err) {
    console.error("[Telephony] Error starting Call Recording:", err);
  }
}
