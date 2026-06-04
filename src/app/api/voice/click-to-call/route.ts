// ============================================
// API Route: Initiate Outbound Click-to-Call
// POST /api/voice/click-to-call
// ============================================
import { NextRequest, NextResponse } from "next/server";

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

    // Resolve public URL dynamically from proxy headers
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    let publicUrl = `${proto}://${host}`;

    // If accessing via localhost, try to resolve the public Ngrok tunnel URL from local Ngrok API
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      try {
        const ngrokResponse = await fetch("http://127.0.0.1:4040/api/tunnels");
        if (ngrokResponse.ok) {
          const ngrokData = await ngrokResponse.json();
          const publicTunnel = ngrokData.tunnels?.[0]?.public_url;
          if (publicTunnel) {
            publicUrl = publicTunnel;
            console.log(`[Telephony] Detected localhost. Resolved public Ngrok tunnel: ${publicUrl}`);
          }
        }
      } catch (err) {
        console.warn("[Telephony] Localhost detected but could not query Ngrok agent API on port 4040:", err);
      }
    }

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
