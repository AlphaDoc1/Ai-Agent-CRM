
// ============================================
// API Route: Twilio Status Callback
// POST /api/voice/status-callback
// Triggers post-call pipeline when a call ends
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/redis";
import { runPostCallPipeline } from "@/lib/post-call-pipeline";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const callStatus = formData.get("CallStatus") as string;
    const callDuration = formData.get("CallDuration") as string;

    console.log('[Pipeline][STATUS_CALLBACK] ' + callSid + ' ' + callStatus + ' ' + callDuration + 's');

    // Ignore intermediate status updates
    const validFinalStatuses = ['completed', 'busy', 'failed', 'no-answer'];
    if (validFinalStatuses.indexOf(callStatus) === -1) {
      return new NextResponse('&lt;Response/&gt;', { 
        status: 200, 
        headers: { 'Content-Type': 'application/xml' } 
      });
    }

    // Get session from Redis
    const session = await getSession(callSid);
    if (!session) {
      console.warn('[Pipeline] No session found for CallSid: ' + callSid);
      return new NextResponse('&lt;Response/&gt;', { 
        status: 200, 
        headers: { 'Content-Type': 'application/xml' } 
      });
    }

    // Calculate duration
    const durationSeconds = callDuration 
      ? parseInt(callDuration) 
      : Math.round((Date.now() - session.startTime) / 1000);

    // Update call_logs
    const supabase = createAdminClient();
    if (session.callLogId) {
      const transcriptParts = session.history.map(function(h) {
        return h.role.toUpperCase() + ': ' + h.content;
      });
      const transcript = transcriptParts.join('\n');
      
      var finalStatus = 'failed';
      if (callStatus === 'completed') {
        if (session.escalated) {
          finalStatus = 'escalated';
        } else {
          finalStatus = 'completed';
        }
      }

      await supabase
        .from('call_logs')
        .update({
          status: finalStatus,
          duration_seconds: durationSeconds,
          transcript: transcript
        })
        .eq('id', session.callLogId);
    }

    // Trigger post-call pipeline ASYNCHRONOUSLY
    runPostCallPipeline(callSid, session, durationSeconds)
      .catch(function(err) {
        console.error('[Pipeline][ERROR]', callSid, err);
      });

    // Respond to Twilio immediately
    return new NextResponse('&lt;Response/&gt;', { 
      status: 200, 
      headers: { 'Content-Type': 'application/xml' } 
    });

  } catch (error) {
    console.error("[Telephony] Status Callback Error:", error);
    return new NextResponse('&lt;Response/&gt;', { 
      status: 200, 
      headers: { 'Content-Type': 'application/xml' } 
    });
  }
}
