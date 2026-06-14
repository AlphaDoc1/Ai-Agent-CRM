
/*
 * ARCHITECTURE NOTE — SINGLE SOURCE OF TRUTH
 *
 * This simulator calls the exact same Next.js API routes as real Twilio webhooks:
 *   /api/voice/incoming      ← same route, same FormData fields
 *   /api/voice/language      ← same route, same FormData fields
 *   /api/voice/respond       ← same route, same FormData fields
 *   /api/voice/status-callback ← same route, same FormData fields
 *
 * There is NO separate logic path for testing vs production.
 * The simulator only fakes what Twilio SENDS (the HTTP requests).
 * All business logic — RAG, LLM, Redis session, interruption detection,
 * post-call pipeline, multilingual support — runs identically in both cases.
 *
 * When you change any call flow logic in Sections 1–7, the simulator
 * automatically reflects those changes. There is nothing to sync.
 *
 * To verify: search the codebase for any logic that checks for
 * 'SIM_' in CallSid — there must be ZERO such checks outside this file.
 */

export interface TwiMLParseResult {
  sayText: string | null;
  action: string | null;
  redirect: string | null;
  hangup: boolean;
  gather: {
    language: string;
    speechTimeout: string;
  } | null;
}

export function parseTwiML(twiml: string): TwiMLParseResult {
  const result: TwiMLParseResult = {
    sayText: null,
    action: null,
    redirect: null,
    hangup: false,
    gather: null
  };

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(twiml, "text/xml");

    const sayEl = doc.querySelector("Say");
    if (sayEl?.textContent) {
      result.sayText = sayEl.textContent.trim();
    }

    const gatherEl = doc.querySelector("Gather");
    if (gatherEl) {
      const actionAttr = gatherEl.getAttribute("action");
      if (actionAttr) {
        result.action = actionAttr;
      }
      result.gather = {
        language: gatherEl.getAttribute("language") || "en-IN",
        speechTimeout: gatherEl.getAttribute("speechTimeout") || "2"
      };
    }

    const redirectEl = doc.querySelector("Redirect");
    if (redirectEl?.textContent) {
      result.redirect = redirectEl.textContent.trim();
    }

    const hangupEl = doc.querySelector("Hangup");
    if (hangupEl) {
      result.hangup = true;
    }
  } catch (e) {
    console.error("[TwilioSim] Failed to parse TwiML", e);
  }

  return result;
}

export async function simulateIncomingCall(
  callSid: string,
  callerPhone: string,
  elanproPhone: string = "+918882302532"
): Promise<{ twiml: string; parsed: TwiMLParseResult }> {
  const formData = new FormData();
  formData.append("CallSid", callSid);
  formData.append("From", callerPhone);
  formData.append("To", elanproPhone);
  formData.append("CallStatus", "ringing");
  formData.append("Direction", "inbound");

  const response = await fetch("/api/voice/incoming", {
    method: "POST",
    body: formData
  });

  const twiml = await response.text();
  const parsed = parseTwiML(twiml);

  return { twiml, parsed };
}

export async function simulateLanguageSelect(
  callSid: string,
  digit: string,
  callerPhone: string
): Promise<{ twiml: string; parsed: TwiMLParseResult }> {
  const formData = new FormData();
  formData.append("CallSid", callSid);
  formData.append("Digits", digit);
  formData.append("CallStatus", "in-progress");
  formData.append("From", callerPhone);

  const response = await fetch("/api/voice/language", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TwilioSim] /api/voice/language failed with ${response.status}: ${errorText}`);
    throw new Error(`Server Error (${response.status}): ${errorText.substring(0, 100)}`);
  }

  const twiml = await response.text();
  const parsed = parseTwiML(twiml);

  return { twiml, parsed };
}

export async function simulateSpeak(
  callSid: string,
  speechText: string,
  lang: string,
  callerPhone: string
): Promise<{ twiml: string; parsed: TwiMLParseResult }> {
  const formData = new FormData();
  formData.append("CallSid", callSid);
  formData.append("SpeechResult", speechText);
  formData.append("Confidence", "0.92");
  formData.append("CallStatus", "in-progress");
  formData.append("From", callerPhone);
  formData.append("Language", lang);

  const response = await fetch("/api/voice/respond", {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[TwilioSim] /api/voice/respond failed with ${response.status}: ${errorText}`);
    throw new Error(`Server Error (${response.status}): ${errorText.substring(0, 100)}`);
  }

  const twiml = await response.text();
  const parsed = parseTwiML(twiml);

  return { twiml, parsed };
}

export async function simulateHangup(
  callSid: string,
  duration: number,
  callerPhone: string
): Promise<void> {
  const formData = new FormData();
  formData.append("CallSid", callSid);
  formData.append("CallStatus", "completed");
  formData.append("CallDuration", String(Math.floor(duration)));
  formData.append("From", callerPhone);

  await fetch("/api/voice/status-callback", {
    method: "POST",
    body: formData
  });
}

