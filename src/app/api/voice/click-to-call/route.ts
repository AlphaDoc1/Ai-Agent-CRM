// ============================================
// API Route: Initiate Outbound Click-to-Call
// POST /api/voice/click-to-call
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { resolvePublicUrl } from "@/lib/utils";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, type } = body;

    if (!name || !phone) {
      return NextResponse.json(
        { success: false, error: "Name and Phone Number are required" },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioNumber) {
      return NextResponse.json(
        { success: false, error: "Twilio credentials are not configured on the server." },
        { status: 500 }
      );
    }

    // Resolve public URL dynamically
    const publicUrl = await resolvePublicUrl(request);

    // Format target phone number (remove spaces)
    const formattedPhone = phone.replace(/\s+/g, "");

    // Webhook URL to call when the user answers, including the custom caller name and type query parameters
    const webhookUrl = `${publicUrl}/api/voice/incoming?name=${encodeURIComponent(name.trim())}&type=${encodeURIComponent(type || "ai")}`;

    console.log(`[Telephony] Triggering Click-to-Call to: ${formattedPhone}, caller name: "${name}"`);

    // Call Twilio REST API
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: formattedPhone,
          From: twilioNumber,
          Url: webhookUrl,
          StatusCallback: `${publicUrl}/api/voice/status-callback`,
          StatusCallbackEvent: "completed",
          StatusCallbackMethod: "POST",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Telephony] Twilio call trigger failed:", errorText);
      try {
        const errJson = JSON.parse(errorText);
        // Clean error messages for trial account limits
        if (errJson.code === 21608) {
          return NextResponse.json(
            { 
              success: false, 
              error: `The number ${formattedPhone} is not verified. In Twilio Trial mode, you can only call Verified Caller IDs.` 
            },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, error: errJson.message || "Failed to trigger call." },
          { status: 400 }
        );
      } catch {
        return NextResponse.json(
          { success: false, error: `Twilio Error: ${response.statusText}` },
          { status: 400 }
        );
      }
    }

    const data = await response.json();
    console.log(`[Telephony] Click-to-Call triggered successfully. CallSid: ${data.sid}`);

    return NextResponse.json({
      success: true,
      data: {
        callSid: data.sid,
        status: data.status,
      },
    });
  } catch (error) {
    console.error("[Telephony] Click-to-call error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
