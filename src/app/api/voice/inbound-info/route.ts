// ============================================
// API Route: Return Inbound Call Info
// GET /api/voice/inbound-info
// Returns Twilio number + current public webhook URL
// ============================================
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!twilioNumber) {
      return NextResponse.json(
        { success: false, error: "TWILIO_PHONE_NUMBER not configured in .env" },
        { status: 500 }
      );
    }

    // Resolve public URL dynamically
    const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || "http";
    let publicUrl = `${proto}://${host}`;

    // If localhost, try to resolve ngrok tunnel
    if (host.includes("localhost") || host.includes("127.0.0.1")) {
      try {
        const ngrokResponse = await fetch("http://127.0.0.1:4040/api/tunnels");
        if (ngrokResponse.ok) {
          const ngrokData = await ngrokResponse.json();
          const publicTunnel = ngrokData.tunnels?.[0]?.public_url;
          if (publicTunnel) {
            publicUrl = publicTunnel;
          }
        }
      } catch {
        // ngrok not running — use localhost
      }
    }

    const webhookUrl = `${publicUrl}/api/voice/incoming`;

    return NextResponse.json({
      success: true,
      data: {
        twilioNumber,
        webhookUrl,
        publicUrl,
      },
    });
  } catch (error) {
    console.error("[Inbound Info] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch inbound info" },
      { status: 500 }
    );
  }
}
