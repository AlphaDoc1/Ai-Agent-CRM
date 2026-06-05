// ============================================
// API Route: Handle Twilio Recording, Run Whisper STT & Route Lead
// POST /api/voice/recording
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { extractCallMetadata } from "@/lib/ai-agent";
import { processPostCall } from "@/lib/post-call-pipeline";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form data for webhooks
    const formData = await request.formData();
    const callSid = formData.get("CallSid") as string;
    const from = (formData.get("From") as string) || "Unknown";
    const recordingUrl = formData.get("RecordingUrl") as string;
    const recordingDurationStr = formData.get("RecordingDuration") as string;
    const transcriptionText = formData.get("TranscriptionText") as string;

    const durationSeconds = recordingDurationStr ? parseInt(recordingDurationStr, 10) : 0;

    console.log(`[Telephony] Call recording received. CallSid: ${callSid}, From: ${from}, URL: ${recordingUrl}`);

    if (!recordingUrl) {
      return NextResponse.json({ success: false, error: "RecordingUrl is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // 1. Locate the active call log using CallSid
    const { data: callLog, error: fetchError } = await supabase
      .from("call_logs")
      .select("*")
      .eq("call_sid", callSid)
      .eq("status", "in_progress")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !callLog) {
      console.warn(`[Telephony] Active call log not found for CallSid ${callSid} during recording webhook.`);
    }

    const callLogId = callLog ? callLog.id : callSid;

    // Extract actual caller phone from the database row (fallback to 'from' parameter)
    let callerPhoneActual = from;
    if (callLog && callLog.caller_phone) {
      callerPhoneActual = callLog.caller_phone.split("_")[0];
      if (callerPhoneActual === "Unknown") {
        callerPhoneActual = "Phone Lead";
      }
    }

    // 2. Download the WAV file from Twilio (requires Basic Auth since Twilio recordings are secure)
    console.log("[Telephony] Downloading WAV file from Twilio...");
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(recordingUrl, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to download audio recording: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure recordings directory exists
    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const audioFilePath = path.join(recordingsDir, `${callLogId}.wav`);
    fs.writeFileSync(audioFilePath, buffer);
    console.log(`[Telephony] Saved audio recording locally to: ${audioFilePath}`);

    // 3. Attempt Speech-to-Text transcription (prefer Cloud Whisper API if key is present, fallback to local script)
    let transcriptText = "";
    const groqKey = process.env.GROQ_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (groqKey || openAiKey) {
      try {
        console.log("[Telephony] Cloud Whisper API detected. Preparing audio file upload...");
        const audioBuffer = fs.readFileSync(audioFilePath);
        const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
        const form = new FormData();
        form.append("file", audioBlob, "recording.wav");

        let response;
        if (groqKey) {
          form.append("model", "whisper-large-v3");
          response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
            },
            body: form,
          });
        } else {
          form.append("model", "whisper-1");
          response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openAiKey}`,
            },
            body: form,
          });
        }

        if (response.ok) {
          const transData = await response.json();
          transcriptText = transData.text || "";
          console.log(`[Telephony] Cloud Whisper transcription succeeded: "${transcriptText}"`);
        } else {
          const errText = await response.text();
          console.warn(`[Telephony] Cloud Whisper API returned error status: ${response.status}. Details: ${errText}`);
        }
      } catch (cloudSttErr) {
        console.error("[Telephony] Failed to transcribe via Cloud Whisper API:", cloudSttErr);
      }
    }

    // Fallback to local python Whisper script
    if (!transcriptText) {
      try {
        console.log("[Telephony] Running local Whisper Speech-to-Text script...");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        
        const { stdout } = await execAsync(`${pythonCmd} scripts/transcribe.py "${audioFilePath}"`);
        if (stdout && stdout.trim()) {
          transcriptText = stdout.trim();
          console.log(`[Telephony] Local Whisper transcription succeeded: "${transcriptText}"`);
        }
      } catch (whisperError) {
        console.warn("[Telephony] Local Whisper STT failed or is not configured. Falling back. Error:", whisperError);
      }
    }

    // 4. Clean Fallbacks: Twilio Cloud Transcription -> Live Session Log
    if (!transcriptText) {
      if (transcriptionText) {
        transcriptText = transcriptionText;
        console.log("[Telephony] Fell back to Twilio cloud transcription:", transcriptText);
      } else if (callLog && callLog.transcript) {
        // Strip out the "User:" and "Agent:" format to get clean transcript
        transcriptText = callLog.transcript
          .split("\n")
          .filter((line: string) => line.startsWith("User:"))
          .map((line: string) => line.replace(/^User:\s*/i, ""))
          .join(" ");
        console.log("[Telephony] Fell back to clean live session transcript:", transcriptText);
      } else {
        transcriptText = "No voice message transcribed.";
        console.log("[Telephony] No transcription fallback available.");
      }
    }

    // 5. Extract metadata from the call log transcript
    const historyLines = callLog?.transcript ? callLog.transcript.split("\n") : [transcriptText];
    const metadata = extractCallMetadata(historyLines);

    // 6. Update Call Log status, duration, and metadata log
    if (callLog) {
      const updateData: any = {
        duration_seconds: durationSeconds,
        transcript: callLog.transcript || transcriptText,
        ai_summary: `customer_id: ${metadata.customerId || "Unknown"}, issue_type: ${metadata.issueType || "Unknown"}, resolution_status: ${metadata.resolutionStatus}, call_duration: ${durationSeconds}s`
      };
      
      // If call is not already finalized, set status
      if (callLog.status === "in_progress") {
        updateData.status = metadata.resolutionStatus === "ESCALATED" ? "escalated" : "completed";
      }

      const { error: updateError } = await supabase
        .from("call_logs")
        .update(updateData)
        .eq("id", callLog.id);

      if (updateError) {
        console.error("[Telephony] Failed to finalize call log record:", updateError);
      } else {
        // Trigger post-call pipeline (non-blocking)
        processPostCall(callLog.id).catch(err => {
          console.error(`[Telephony] Post-call pipeline failed for call ${callLog.id}:`, err);
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        customerId: metadata.customerId,
        issueType: metadata.issueType,
        resolutionStatus: metadata.resolutionStatus,
        transcript: callLog?.transcript || transcriptText,
      },
    });
  } catch (error) {
    console.error("[Telephony] Webhook recording error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Internal recording handler error" },
      { status: 500 }
    );
  }
}
