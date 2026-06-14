

// ============================================
// AI Agent — Ollama / Llama 3 Integration
// ============================================
import { AIAnalysisResponse, VoiceAgentResponse } from "@/lib/types";
import { sleep, withTimeout } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/server";
import { getSession, pushHistory, CallSession, updateSession, createDefaultSession } from "@/lib/redis";
import { retrieveContext, detectIntent, CallIntent } from "@/lib/rag-pipeline";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = "llama3";
const MAX_RETRIES = 3;
const DB_TIMEOUT_MS = 5000;
const COMPANY_NAME = "Elanpro";

// ============================================
// INTERRUPT HANDLING MANAGER
// ============================================
class SessionInterruptManager {
  private activeControllers: Map<string, AbortController> = new Map();
  private interruptedContexts: Map<string, { partialResponse: string; metadata: any }> = new Map();

  public startGeneration(callSid: string): AbortSignal {
    if (this.activeControllers.has(callSid)) {
      console.log(`[Interrupt Manager] Interrupting active generation for session: ${callSid}`);
      this.activeControllers.get(callSid)?.abort("INTERRUPTED_BY_NEW_QUERY");
      this.activeControllers.delete(callSid);
    }
    const controller = new AbortController();
    this.activeControllers.set(callSid, controller);
    return controller.signal;
  }

  public endGeneration(callSid: string) {
    this.activeControllers.delete(callSid);
  }

  public preserveInterruptedState(callSid: string, partialResponse: string, metadata: any) {
    this.interruptedContexts.set(callSid, { partialResponse, metadata });
  }

  public getAndClearInterruptedState(callSid: string) {
    const state = this.interruptedContexts.get(callSid);
    this.interruptedContexts.delete(callSid);
    return state;
  }
}

const interruptManager = new SessionInterruptManager();

// ============================================
// SYSTEM PROMPT BUILDER (Section 2 Stage 2 Step 9)
// ============================================
function buildSystemPrompt(
  session: CallSession,
  ragContext: string
) {
  const langText = session.lang === "hi" 
    ? "Hindi using Devanagari script" 
    : "clear spoken English";
  
  const historyText = session.history.slice(-6).map((h: any) => `${h.role === 'user' ? 'CUSTOMER' : 'AGENT'}: ${h.content}`).join("\n");

  const customerContext = session.customerName 
    ? `Returning customer: ${session.customerName}.` 
    : `New or unidentified caller.`;

  return `You are Elanpro's professional AI voice assistant for commercial refrigeration.
You represent India's No.1 commercial refrigeration brand trusted by Marriott, McDonald's, Amul, and 700+ partners across India.

CORE RULES:
- Respond ONLY in ${langText}.
- Keep responses under 40 words for voice - short, natural, conversational sentences only.
- Never use bullet points, markdown, asterisks, or formatting of any kind.
- Never make up product model numbers, prices, or specs not in knowledge base.
- If customer asks about pricing, say prices vary by config and offer to connect them to a regional distributor.
- If you can't resolve an issue, offer to escalate to human agent.
- Do NOT repeat customer question verbatim back to them.
- Current call intent detected: ${session.intent || "Unknown"}

CUSTOMER CONTEXT:
${customerContext}

PRODUCT & COMPANY KNOWLEDGE BASE (use this to answer customer):
${ragContext}

CALL HISTORY SO FAR (last 6 turns):
${historyText}`;
}

// ============================================
// LLM CALL LAYER
// ============================================
async function callLLM(messages: { role: string, content: string }[], isJson: boolean = false, signal?: AbortSignal): Promise<string> {
  console.log(`[AI Agent] Routing request to local Ollama (JSON mode: ${isJson})...`);
  
  try {
    if (signal?.aborted) throw new Error("INTERRUPTED_BY_NEW_QUERY");

    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        format: isJson ? "json" : undefined,
        options: {
          temperature: 0.4,
          top_p: 0.9,
          num_predict: 120,
        },
      }),
      signal: signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.message?.content || "";
  } catch (err: any) {
    if (err.name === 'AbortError' || err === "INTERRUPTED_BY_NEW_QUERY") {
      console.log(`[AI Agent] Generation aborted for session.`);
      throw err;
    }
    console.error(`[AI Agent] Ollama call failed:`, err);
    throw err;
  }
}

// ============================================
// ANALYSIS PROMPT BUILDER
// ============================================
function buildAnalysisPrompt(inquiry: {
  name: string;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  message?: string;
  product_interest?: string;
}): string {
  return `You are an expert AI assistant for Elanpro CRM. Analyze the following customer inquiry for our commercial refrigeration business and extract structured information.

CUSTOMER INQUIRY:
- Name: ${inquiry.name}
- Phone: ${inquiry.phone || "Not provided"}
- Email: ${inquiry.email || "Not provided"}
- State: ${inquiry.state || "Not provided"}
- City: ${inquiry.city || "Not provided"}
- Message: ${inquiry.message || "Not provided"}
- Product Interest: ${inquiry.product_interest || "Not provided"}

INSTRUCTIONS:
1. Analyze the inquiry carefully.
2. Determine the inquiry type (e.g., "product_inquiry", "complaint", "support", "pricing", "partnership", "general").
3. Assess lead priority based on urgency and buying intent ("low", "medium", "high", "urgent").
4. Write a brief summary of the inquiry focusing on refrigeration needs.
5. Recommend which state's distributor should handle this inquiry.

IMPORTANT: You MUST respond ONLY with valid JSON object. No extra text, no markdown, no explanation.

Respond EXACTLY in this JSON format:
{
  "customer_name": "${inquiry.name}",
  "state": "${inquiry.state || "Unknown"}",
  "city": "${inquiry.city || "Unknown"}",
  "product_interest": "${inquiry.product_interest || "General"}",
  "inquiry_type": "<one of: product_inquiry, complaint, support, pricing, partnership, general>",
  "lead_priority": "<one of: low, medium, high, urgent>",
  "inquiry_summary": "<brief 1-2 sentence summary>",
  "recommended_distributor": "<state name for distributor matching>"
}`;
}

// ============================================
// PARSE AI RESPONSE
// ============================================
function parseAIResponse(rawResponse: string): AIAnalysisResponse {
  let cleaned = rawResponse.trim();
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object found in AI response");

  const parsed = JSON.parse(jsonMatch[0]);
  const requiredFields = ["customer_name", "state", "city", "product_interest", "inquiry_type", "lead_priority", "inquiry_summary", "recommended_distributor"];
  for (const field of requiredFields) {
    if (!(field in parsed)) throw new Error(`Missing required field: ${field}`);
  }

  const validPriorities = ["low", "medium", "high", "urgent"];
  if (!validPriorities.includes(parsed.lead_priority?.toLowerCase())) {
    parsed.lead_priority = "medium";
  } else parsed.lead_priority = parsed.lead_priority.toLowerCase();

  const validTypes = ["product_inquiry", "complaint", "support", "pricing", "partnership", "general"];
  if (!validTypes.includes(parsed.inquiry_type?.toLowerCase())) {
    parsed.inquiry_type = "general";
  } else parsed.inquiry_type = parsed.inquiry_type.toLowerCase();

  return parsed as AIAnalysisResponse;
}

// ============================================
// FALLBACK RESPONSE BUILDER
// ============================================
function createFallbackResponse(inquiry: {
  name: string;
  state?: string;
  city?: string;
  product_interest?: string;
  message?: string;
}): AIAnalysisResponse {
  return {
    customer_name: inquiry.name,
    state: inquiry.state || "Unknown",
    city: inquiry.city || "Unknown",
    product_interest: inquiry.product_interest || "General",
    inquiry_type: "general",
    lead_priority: "medium",
    inquiry_summary: inquiry.message ? `Customer inquiry: ${inquiry.message.substring(0,100)}` : "Customer submitted an inquiry (AI analysis unavailable)",
    recommended_distributor: inquiry.state || "Unknown",
  };
}

// ============================================
// INQUIRY ANALYSIS
// ============================================
export async function analyzeInquiry(inquiry: {
  name: string;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  message?: string;
  product_interest?: string;
}): Promise<AIAnalysisResponse> {
  const prompt = buildAnalysisPrompt(inquiry);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawResponse = await callLLM([{ role: "user", content: prompt }], true);
      const parsed = parseAIResponse(rawResponse);
      return parsed;
    } catch (error) {
      console.error(`AI analysis attempt ${attempt}/${MAX_RETRIES} failed:`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt);
        continue;
      }
      return createFallbackResponse(inquiry);
    }
  }
  return createFallbackResponse(inquiry);
}

// ============================================
// SENTIMENT SCORING
// ============================================
function computeSentiment(userMessage: string): number {
  const msg = userMessage.toLowerCase();
  const angryWords = ["worst", "angry", "frustrated", "annoyed", "pathetic", "disgusting", "ridiculous", "unacceptable", "stupid"];
  for (const word of angryWords) if (msg.includes(word)) return 0.15;

  const mildNegative = ["disappointed", "unhappy", "not happy", "not satisfied", "confused", "worried", "concerned", "upset", "wrong", "broken", "damaged"];
  for (const word of mildNegative) if (msg.includes(word)) return 0.35;

  const positiveWords = ["thank you", "thanks", "great", "perfect", "excellent", "awesome", "wonderful", "amazing", "appreciate", "helpful", "good job", "well done", "satisfied", "happy"];
  for (const word of positiveWords) if (msg.includes(word)) return 0.85;

  const confirmations = ["ok", "okay", "fine", "sure", "alright", "got it", "understood"];
  for (const word of confirmations) if (msg === word || msg === word + ".") return 0.65;

  return 0.5;
}

// ============================================
// DATABASE HELPERS
// ============================================
async function writeTurn(
  callLogId: string,
  turnIndex: number,
  speaker: "CUSTOMER" | "AGENT" | "SYSTEM",
  text: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("call_turns").insert({ call_id: callLogId, turn_index: turnIndex, speaker, text });
  } catch (err) {
    console.error(`[AI Agent] Failed to write turn ${turnIndex}:`, err);
  }
}

async function appendToTranscript(
  callLogId: string,
  userMessage: string,
  agentReply: string,
  customerName: string | null
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: callLog } = await supabase.from("call_logs").select("transcript").eq("id", callLogId).single();
    const existingTranscript = callLog?.transcript || "";
    const newLines = `User: ${userMessage}\nAgent: ${agentReply}`;
    const updatedTranscript = existingTranscript ? `${existingTranscript}\n${newLines}` : newLines;
    const updateData: Record<string, unknown> = { transcript: updatedTranscript };
    if (customerName) updateData.caller_name = customerName;
    await supabase.from("call_logs").update(updateData).eq("id", callLogId);
  } catch (err) {
    console.error("[AI Agent] Failed to append transcript:", err);
  }
}

async function upsertCallAnalysis(
  callLogId: string,
  metadata: { issue_type?: string | null; customer_id?: string | null; order_id?: string | null; sentiment_score?: number; resolution_status?: string; db_timeout?: boolean; },
  incrementTurnCount: boolean = true
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: existing } = await supabase.from("call_analysis").select("id, turn_count").eq("call_id", callLogId).maybeSingle();
    if (existing) {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (metadata.issue_type !== undefined) updateData.issue_type = metadata.issue_type;
      if (metadata.customer_id !== undefined) updateData.customer_id = metadata.customer_id;
      if (metadata.order_id !== undefined) updateData.order_id = metadata.order_id;
      if (metadata.sentiment_score !== undefined) updateData.sentiment_score = metadata.sentiment_score;
      if (metadata.resolution_status !== undefined) updateData.resolution_status = metadata.resolution_status;
      if (incrementTurnCount) updateData.turn_count = existing.turn_count + 2;
      await supabase.from("call_analysis").update(updateData).eq("id", existing.id);
    } else {
      await supabase.from("call_analysis").insert({
        call_id: callLogId,
        issue_type: metadata.issue_type || null,
        customer_id: metadata.customer_id || null,
        order_id: metadata.order_id || null,
        sentiment_score: metadata.sentiment_score ?? 0.5,
        resolution_status: metadata.resolution_status || "ACTIVE",
        turn_count: 2,
        db_timeout: metadata.db_timeout || false,
      });
    }
  } catch (err) {
    console.error("[AI Agent] Failed to upsert call_analysis:", err);
  }
}

async function getCurrentTurnIndex(callLogId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("call_turns").select("turn_index").eq("call_id", callLogId).order("turn_index", { ascending: false }).limit(1).single();
    return data ? data.turn_index + 1 : 0;
  } catch { return 0; }
}

async function fetchProductsByQuery(userMessage: string) {
  const supabase = createAdminClient();
  const keywords = userMessage.split(/[\s,.;!?]+/).filter(w => w.length > 2).slice(0,3);
  let dbQuery = supabase.from("products").select("*").limit(5);
  if (keywords.length > 0) {
    const filterParts = keywords.map(k => `model.ilike.%${k}%,category_name.ilike.%${k}%,subcategory.ilike.%${k}%,description.ilike.%${k}%`);
    dbQuery = dbQuery.or(filterParts.join(","));
  } else dbQuery = dbQuery.select("*").limit(3);
  const { data, error } = await withTimeout<any>(dbQuery, DB_TIMEOUT_MS);
  if (error) console.error("[fetchProductsByQuery] DB Error:", error.message);
  return data || [];
}

// ============================================
// RESPONSE BUILDER
// ============================================
function buildResponse(
  reply: string,
  status: "ACTIVE" | "ENDED" | "ESCALATED",
  partial: { issue_type?: string | null; customer_id?: string | null; order_id?: string | null; sentiment_score?: number; customer_name?: string | null; ticket_id?: string | null; db_timeout?: boolean; } = {}
): VoiceAgentResponse {
  let cleanReply = reply.trim();
  let previous: string;
  do {
    previous = cleanReply;
    cleanReply = cleanReply.replace(/^["']+|["']+$/g, "").trim();
    cleanReply = cleanReply.replace(/^\[Telephony\]\s+AI\s+reply:\s+Agent:\s+/i, "");
    cleanReply = cleanReply.replace(/^\[Telephony\]\s+AI\s+reply:\s+/i, "");
    cleanReply = cleanReply.replace(/^Agent:\s+/i, "");
  } while (cleanReply !== previous);
  const formattedReply = `[Telephony] AI reply: "Agent: ${cleanReply}"`;
  return {
    reply: formattedReply,
    status,
    metadata: {
      issue_type: partial.issue_type ?? null,
      customer_id: partial.customer_id ?? null,
      order_id: partial.order_id ?? null,
      sentiment_score: partial.sentiment_score ?? 0.5,
      customer_name: partial.customer_name ?? null,
      ticket_id: partial.ticket_id ?? null,
      db_timeout: partial.db_timeout ?? false,
    },
  };
}

// ============================================
// MAIN ENTRY POINT: generateAgentResponse
// ============================================
export async function generateAgentResponse(
  callSid: string,
  userMessage: string
): Promise<string> {
  if (!callSid) {
    console.error("[AI Agent] Missing CallSid! Critical isolation failure.");
    return "I'm sorry, I encountered a session error. Please try again.";
  }
  const signal = interruptManager.startGeneration(callSid);
  let responseStatus: "ACTIVE" | "ENDED" | "ESCALATED" = "ACTIVE";
  let sentimentScore = computeSentiment(userMessage);

  try {
    // Get session from Redis
    let session = await getSession(callSid);
    if (!session) {
      throw new Error(`[AI Agent] Session not found for CallSid: ${callSid}`);
    }
    console.log(`[AI Agent] Session history length for CallSid ${callSid}:`, session.history.length);
    console.log(`[AI Agent] Session history:`, JSON.stringify(session.history, null, 2));
    
    // Detect call intent if not set
    if (!session.intent) {
      session.intent = detectIntent(userMessage);
      await updateSession(callSid, { intent: session.intent });
    }

    // Retrieve RAG context
    const ragContext = retrieveContext(userMessage);

    // Build system prompt
    let baseSystemPrompt = buildSystemPrompt(session, ragContext);

    // Handle interruption
    if (session.interruptionBuffer) {
      const interruptPrepend = `INTERRUPTION DETECTED: The customer just interrupted you mid-response. Your previous partial response was: '${session.interruptionBuffer}'. DO NOT continue or reference that previous response unless the customer asks. Address the customer's NEW question directly and immediately. Start your response with a natural spoken acknowledgment like 'Of course' or 'Sure' or 'Bilkul' (Hindi) — one word only, then answer.`;
      baseSystemPrompt = `${interruptPrepend}\n${baseSystemPrompt}`;
      // Clear interruption buffer
      await updateSession(callSid, { interruptionBuffer: null });
    }

    // Build messages array for LLM
    const messages = [
      { role: "system", content: baseSystemPrompt },
      ...session.history,
      { role: "user", content: userMessage }
    ];

    // Check for escalation and goodbye keywords (more strict)
    const escalationKeywords = ["supervisor", "manager", "human", "person", "speak to someone", "transfer", "supervisor chahiye", "manager se baat"];
    const goodbyeKeywords = ["thank you", "thanks", "bye", "goodbye", "ok thank you", "dhanyavaad", "shukriya", "alvida", "bas itna hi", "that's all", "that is all", "i'm done", "i am done"];
    const isEscalation = escalationKeywords.some(k => userMessage.toLowerCase().includes(k));
    const isGoodbye = goodbyeKeywords.some(k => {
      const msgLower = userMessage.toLowerCase();
      return msgLower === k || msgLower.startsWith(k) || msgLower.endsWith(k);
    });

    let reply = "";
    if (isGoodbye) {
      reply = session.lang === "hi" 
        ? "Elanpro ko call karne ke liye shukriya. Aapka din shubh ho!" 
        : "Thank you for calling Elanpro. Have a great day!";
      responseStatus = "ENDED";
    } else if (isEscalation) {
      reply = session.lang === "hi" 
        ? "Aapki baat manager se karwata hoon. Kripya thoda wait karein." 
        : "I'll connect you to a manager. Please hold.";
      responseStatus = "ESCALATED";
      // Mark session as escalated
      await updateSession(callSid, { escalated: true });
      if (session.callLogId) {
        const supabase = createAdminClient();
        await supabase.from("call_logs").update({ escalated: true }).eq("id", session.callLogId);
      }
    } else {
      reply = await callLLM(messages, false, signal);
      reply = reply.replace(/[\*\#\-]/g, "").trim();
    }

    // Write to history
    await pushHistory(callSid, "user", userMessage);
    await pushHistory(callSid, "assistant", reply);

    // Update session turn index
    await updateSession(callSid, { turnIndex: session.turnIndex + 2 });

    // Write to DB if callLogId exists
    if (session.callLogId) {
      let turnIndex = await getCurrentTurnIndex(session.callLogId);
      await writeTurn(session.callLogId, turnIndex++, "CUSTOMER", userMessage);
      await writeTurn(session.callLogId, turnIndex++, "AGENT", reply);
      await appendToTranscript(session.callLogId, userMessage, reply, session.customerName);
      await upsertCallAnalysis(session.callLogId, { sentiment_score: sentimentScore, resolution_status: responseStatus });
    }

    console.log(`[Telephony][TURN] CallSid: ${callSid}, TurnIndex: ${session.turnIndex}, Intent: ${session.intent}`);
    interruptManager.endGeneration(callSid);
    
    // Return only the clean reply (not wrapped in [Telephony] tag)
    let cleanReply = reply.trim();
    let previous: string;
    do {
      previous = cleanReply;
      cleanReply = cleanReply.replace(/^["']+|["']+$/g, "").trim();
      cleanReply = cleanReply.replace(/^\[Telephony\]\s+AI\s+reply:\s+Agent:\s+/i, "");
      cleanReply = cleanReply.replace(/^\[Telephony\]\s+AI\s+reply:\s+/i, "");
      cleanReply = cleanReply.replace(/^Agent:\s+/i, "");
    } while (cleanReply !== previous);
    return cleanReply;
  } catch (err: any) {
    if (err === "INTERRUPTED_BY_NEW_QUERY" || err.name === 'AbortError') {
      console.log(`[AI Agent] Interrupt detected.`);
      interruptManager.preserveInterruptedState(callSid, "Thinking...", { sentimentScore });
      throw err;
    }
    console.error("[generateAgentResponse] Error:", err);
    interruptManager.endGeneration(callSid);
    return "I'm sorry, I'm having trouble connecting right now. Please try again later.";
  }
}

// ============================================
// MAIN VOICE RESPONSE ENGINE (Backward compatibility)
// ============================================
export async function generateVoiceResponse(
  userMessage: string,
  callSid: string,
  callType: string = "ai",
  callerName: string = "Customer",
  callLogId: string = "",
  interruptionBuffer: string | null = null
): Promise<VoiceAgentResponse> {
  if (!callSid) {
    console.error("[AI Agent] Missing CallSid! Critical isolation failure.");
    return buildResponse("I'm sorry, I encountered a session error. Please try again.", "ENDED");
  }
  const signal = interruptManager.startGeneration(callSid);
  let responseStatus: "ACTIVE" | "ENDED" | "ESCALATED" = "ACTIVE";
  let sentimentScore = computeSentiment(userMessage);

  try {
    // Get session from redis
    let session = await getSession(callSid);
    if (!session) {
      session = createDefaultSession(callSid, "");
      if (callLogId) session.callLogId = callLogId;
      if (callerName) session.customerName = callerName;
      if (interruptionBuffer) session.interruptionBuffer = interruptionBuffer;
      session.turnIndex = 2;
    }
    interruptManager.getAndClearInterruptedState(callSid);

    // Detect call intent if not set
    if (!session.intent) {
      session.intent = detectIntent(userMessage);
      await updateSession(callSid, { intent: session.intent });
    }

    // Retrieve RAG context
    const knowledgeBaseContext = retrieveContext(userMessage);

    // Build system prompt, handle interruption
    let baseSystemPrompt = buildSystemPrompt(session, knowledgeBaseContext);
    
    if (interruptionBuffer || session.interruptionBuffer) {
      const buffer = interruptionBuffer || session.interruptionBuffer;
      const interruptPrepend = `INTERRUPTION DETECTED: The customer just interrupted you mid-response. Your previous partial response was: '${buffer}'. DO NOT continue or reference that previous response unless the customer asks. Address the customer's NEW question directly and immediately. Start your response with a natural spoken acknowledgment like 'Of course' or 'Sure' or 'Bilkul' (Hindi) — one word only, then answer.`;
      baseSystemPrompt = `${interruptPrepend}\n${baseSystemPrompt}`;
    }
    
    const messages = [
      { role: "system", content: baseSystemPrompt },
      ...session.history,
      { role: "user", content: userMessage }
    ];

    // Check escalation and goodbye (more strict)
    const escalationKeywords = ["supervisor", "manager", "human", "person", "speak to someone", "transfer", "supervisor chahiye", "manager se baat"];
    const goodbyeKeywords = ["thank you", "thanks", "bye", "goodbye", "ok thank you", "dhanyavaad", "shukriya", "alvida", "bas itna hi", "that's all", "that is all", "i'm done", "i am done"];
    const isEscalation = escalationKeywords.some(k => userMessage.toLowerCase().includes(k));
    const isGoodbye = goodbyeKeywords.some(k => {
      const msgLower = userMessage.toLowerCase();
      return msgLower === k || msgLower.startsWith(k) || msgLower.endsWith(k);
    });

    let reply = "";
    if (isGoodbye) {
      reply = session.lang === "hi" 
        ? "Elanpro ko call karne ke liye shukriya. Aapka din shubh ho!" 
        : "Thank you for calling Elanpro. Have a great day!";
      responseStatus = "ENDED";
    } else if (isEscalation) {
      reply = session.lang === "hi" 
        ? "Aapki baat manager se karwata hoon. Kripya thoda wait karein." 
        : "I'll connect you to a manager. Please hold.";
      responseStatus = "ESCALATED";
      await updateSession(callSid, { escalated: true });
      if (session.callLogId) {
        const supabase = createAdminClient();
        await supabase.from("call_logs").update({ escalated: true }).eq("id", session.callLogId);
      }
    } else {
      reply = await callLLM(messages, false, signal);
      reply = reply.replace(/[\*\#\-]/g, "").trim();
    }

    // Write user turn
    if (session.callLogId) await writeTurn(session.callLogId, session.turnIndex++, "CUSTOMER", userMessage);
    await pushHistory(callSid, "user", userMessage);

    // Write agent turn
    if (session.callLogId) await writeTurn(session.callLogId, session.turnIndex++, "AGENT", reply);
    await pushHistory(callSid, "assistant", reply);
    await updateSession(callSid, { turnIndex: session.turnIndex });

    console.log(`[Telephony][TURN] CallSid: ${callSid}, TurnIndex: ${session.turnIndex}, Intent: ${session.intent}`);

    if (session.callLogId) await upsertCallAnalysis(session.callLogId, { sentiment_score: sentimentScore, resolution_status: responseStatus });
    interruptManager.endGeneration(callSid);
    return buildResponse(reply, responseStatus, { sentiment_score: sentimentScore, customer_name: session.customerName });
  } catch (err: any) {
    if (err === "INTERRUPTED_BY_NEW_QUERY" || err.name === 'AbortError') {
      console.log(`[AI Agent] Interrupt detected.`);
      interruptManager.preserveInterruptedState(callSid, "Thinking...", { sentimentScore });
      throw err;
    }
    console.error("[generateVoiceResponse] Error:", err);
    interruptManager.endGeneration(callSid);
    return buildResponse("I'm sorry, I'm having trouble connecting right now. Please try again later.", "ENDED");
  }
}

// ============================================
// EXTRACT CALL METADATA
// ============================================
export function extractCallMetadata(history: string[]): any {
  let customerId: string | null = null;
  let issueType: string | null = null;
  let resolutionStatus = "RESOLVED";

  for (const line of history) {
    const cidMatch = line.match(/CID\d{3,}/i);
    if (cidMatch) customerId = cidMatch[0].toUpperCase();
    if (line.startsWith("Agent:") && line.includes("escalating")) resolutionStatus = "ESCALATED";
  }

  const fullText = history.join("\n").toLowerCase();
  if (fullText.includes("order")) issueType = "ORDER_ISSUE";
  else if (fullText.includes("payment")) issueType = "PAYMENT_ISSUE";
  else if (fullText.includes("account")) issueType = "ACCOUNT_ISSUE";
  else if (fullText.includes("product")) issueType = "PRODUCT_QUERY";
  else issueType = "OTHER";

  return { customerId, issueType, resolutionStatus };
}

export async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      return { available: false, model: MODEL };
    }

    const data = await response.json();
    const modelAvailable = data.models.some((m: any) => m.name === MODEL || m.name === `${MODEL}:latest`);
    return { available: true, model: MODEL, modelAvailable };
  } catch (error: any) {
    return { available: false, model: MODEL, error: error.message };
  }
}

