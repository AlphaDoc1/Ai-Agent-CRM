// ============================================
// API Route: Incoming Telephony Voice Hook
// POST /api/voice/incoming
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = (formData.get("From") as string) || "Unknown";

    console.log(`[Telephony] Incoming call received. CallSid: ${callSid}, From: ${from}`);

    const { searchParams } = new URL(request.url);
    const callerName = searchParams.get("name") || "Phone Caller";
    const callType = searchParams.get("type") || "ai";

    // Create a new call log entry in Supabase to track this call's conversation
    const supabase = createAdminClient();
    const formattedPhone = `${from}_${callSid}`;

    const { error: insertError } = await supabase.from("call_logs").insert({
      call_sid: callSid,
      caller_phone: formattedPhone,
      caller_name: callerName === "Phone Caller" ? `Phone Call (${from})` : callerName,
      status: "initiated",
      transcript: "",
      source: 'voice',
      preferred_language: 'en-IN'
    });

    if (insertError) {
      console.error("[Telephony] Failed to create call log in database. Verify call_sid and preferred_language columns exist and 'initiated' status is allowed.", insertError.message);
      // We continue even if DB insert fails to ensure the call isn't dropped
    }

    // Resolve the dynamic public URL (e.g., your ngrok URL) from proxy headers
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${proto}://${host}`;

    // Trigger call recording programmatically
    await startTwilioCallRecording(callSid, publicUrl);

    // Webhook URL to call when the user answers, including the custom caller name and type query parameters
    // NOTE: For XML attributes like 'action', we MUST escape '&' as '&amp;'
    const actionUrl = `${publicUrl}/api/voice/language?type=${encodeURIComponent(callType)}&amp;name=${encodeURIComponent(callerName)}`;

    console.log(`[Telephony] Generated TwiML menu for CallSid: ${callSid}. Action URL: ${actionUrl.replace(/&amp;/g, '&')}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${actionUrl}" timeout="10" method="POST">
    <Say language="en-US">
      For English, press 1. 
    </Say>
    <Say language="hi-IN">
      Hindi ke liye, do dabaye. 
    </Say>
    <Say language="kn-IN">
      Kannada-gagi, mooru otti. 
    </Say>
    <Say language="ta-IN">
      Tamil-ukku, naangu amuthavum. 
    </Say>
    <Say language="te-IN">
      Telugu kosam, aidu nokkandi.
    </Say>
  </Gather>
  <Say language="en-US">
    We did not receive any input. Goodbye.
  </Say>
  <Hangup/>
</Response>`;

    return new NextResponse(twiml, {
      headers: { "Content-Type": "application/xml" },
    });
  } catch (error) {
    console.error("[Telephony] Incoming call error:", error);
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural">An error occurred on our server. Please call back later.</Say>
</Response>`;
    return new NextResponse(errorTwiml, {
      headers: { "Content-Type": "application/xml" },
    });
  }
}

async function startTwilioCallRecording(callSid: string, publicUrl: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    console.warn("[Telephony] Twilio credentials missing in env. Call recording won't be started programmatically.");
    return;
  }

  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
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
      }
    );

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
