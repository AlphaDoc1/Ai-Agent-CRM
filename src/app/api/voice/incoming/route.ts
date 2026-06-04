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
      caller_phone: formattedPhone,
      caller_name: callerName === "Phone Caller" ? `Phone Call (${from})` : callerName,
      status: "in_progress",
      transcript: "",
    });

    if (insertError) {
      console.error("[Telephony] Failed to create call log in database:", insertError);
    }

    // Save greeting to transcript and create initial call_turns/call_analysis entries
    const { data: newCallLog } = await supabase
      .from("call_logs")
      .select("id")
      .eq("caller_phone", formattedPhone)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Resolve the dynamic public URL (e.g., your ngrok URL) from proxy headers
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    const publicUrl = `${proto}://${host}`;

    // Trigger call recording programmatically
    await startTwilioCallRecording(callSid, publicUrl);

    // Return TwiML response to answer call and speak greeting (greet by name if provided)
    let greetingText = "";
    if (callType === "service") {
      greetingText = callerName === "Phone Caller"
        ? "Hello! Thank you for contacting our customer service department. How can I assist you with your support inquiry today?"
        : `Hello ${callerName}! Thank you for contacting our customer service department. How can I assist you with your support inquiry today?`;
    } else {
      greetingText = callerName === "Phone Caller"
        ? "Hello! Thank you for calling our team. How can I help you today?"
        : `Hello ${callerName}! Thank you for calling our team. How can I help you today?`;
    }

    // Save greeting to transcript, call_turns, and init call_analysis
    if (newCallLog?.id) {
      await supabase
        .from("call_logs")
        .update({ transcript: `Agent: ${greetingText}`, source: 'voice' })
        .eq("id", newCallLog.id);

      await supabase.from("call_turns").insert({
        call_id: newCallLog.id,
        turn_index: 0,
        speaker: "AGENT",
        text: greetingText,
      });

      await supabase.from("call_analysis").insert({
        call_id: newCallLog.id,
        resolution_status: "ACTIVE",
        turn_count: 1,
      });
    }

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    ${greetingText}
  </Say>
  <Gather input="speech" action="/api/voice/respond?type=${encodeURIComponent(callType)}" speechTimeout="auto" enhanced="true" language="en-US">
    <!-- Listen for user input. If silence, wait up to 5 seconds -->
  </Gather>
  <Say voice="Polly.Joanna-Neural" language="en-US">
    We did not hear anything. Thank you for calling. Goodbye.
  </Say>
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
