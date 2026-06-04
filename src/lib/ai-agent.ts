// ============================================
// AI Agent — Ollama / Llama 3 Integration
// Analyzes inquiries and extracts structured data
// ============================================
import { AIAnalysisResponse, VoiceAgentResponse } from "@/lib/types";
import { sleep, withTimeout } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/server";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const MODEL = "llama3";
const MAX_RETRIES = 3;
const DB_TIMEOUT_MS = 5000;
const COMPANY_NAME = "ShopEasy";

// ============================================
// LLM CALL LAYER
// ============================================

/**
 * Build the prompt for inquiry analysis.
 */
function buildAnalysisPrompt(inquiry: {
  name: string;
  phone?: string;
  email?: string;
  state?: string;
  city?: string;
  message?: string;
  product_interest?: string;
}): string {
  return `You are an AI assistant for a CRM system. Analyze the following customer inquiry and extract structured information.

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
3. Assess the lead priority based on urgency and buying intent ("low", "medium", "high", "urgent").
4. Write a brief summary of the inquiry.
5. Recommend which state's distributor should handle this inquiry.

IMPORTANT: You MUST respond with ONLY a valid JSON object. No extra text, no markdown, no explanation.

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

/**
 * Call LLM API to generate a response (routes to Groq Cloud if key is present, falls back to Ollama).
 */
async function callLLM(prompt: string, isJson: boolean = false): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    console.log(`[AI Agent] Routing request to Groq Cloud API (JSON mode: ${isJson})...`);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_tokens: 500,
            response_format: isJson ? { type: "json_object" } : undefined,
          }),
        });

        if (response.status === 429) {
          const errText = await response.text();
          console.warn(`[AI Agent] Groq rate limit (429) on attempt ${attempt}/3. Retrying in 5s... Details: ${errText}`);
          await sleep(5000);
          continue;
        }

        if (response.ok) {
          const data = await response.json();
          return data.choices?.[0]?.message?.content || "";
        }
        const errText = await response.text();
        console.warn(`[AI Agent] Groq Cloud API returned error: ${errText}. Falling back to local Ollama.`);
        break; // break the retry loop and fall back
      } catch (err) {
        console.warn(`[AI Agent] Groq attempt ${attempt} exception:`, err);
        if (attempt < 3) {
          await sleep(2000);
          continue;
        }
      }
    }
  }

  // Local Ollama Fallback
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9,
        num_predict: 500,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.response || "";
}

// ============================================
// INQUIRY ANALYSIS (CRM Feature)
// ============================================

/**
 * Parse the AI response into structured JSON.
 * Handles common AI output issues like markdown code blocks.
 */
function parseAIResponse(rawResponse: string): AIAnalysisResponse {
  let cleaned = rawResponse.trim();

  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "");

  // Try to find JSON object in the response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No JSON object found in AI response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Validate required fields exist
  const requiredFields = [
    "customer_name",
    "state",
    "city",
    "product_interest",
    "inquiry_type",
    "lead_priority",
    "inquiry_summary",
    "recommended_distributor",
  ];

  for (const field of requiredFields) {
    if (!(field in parsed)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Normalize lead_priority
  const validPriorities = ["low", "medium", "high", "urgent"];
  if (!validPriorities.includes(parsed.lead_priority?.toLowerCase())) {
    parsed.lead_priority = "medium";
  } else {
    parsed.lead_priority = parsed.lead_priority.toLowerCase();
  }

  // Normalize inquiry_type
  const validTypes = [
    "product_inquiry",
    "complaint",
    "support",
    "pricing",
    "partnership",
    "general",
  ];
  if (!validTypes.includes(parsed.inquiry_type?.toLowerCase())) {
    parsed.inquiry_type = "general";
  } else {
    parsed.inquiry_type = parsed.inquiry_type.toLowerCase();
  }

  return parsed as AIAnalysisResponse;
}

/**
 * Analyze an inquiry using the AI agent.
 * Includes retry logic for parsing failures.
 */
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
      const rawResponse = await callLLM(prompt, true);
      const parsed = parseAIResponse(rawResponse);
      return parsed;
    } catch (error) {
      console.error(`AI analysis attempt ${attempt}/${MAX_RETRIES} failed:`, error);

      if (attempt < MAX_RETRIES) {
        await sleep(1000 * attempt); // Exponential backoff
        continue;
      }

      // Return fallback response after all retries exhausted
      return createFallbackResponse(inquiry);
    }
  }

  // TypeScript requires this (unreachable)
  return createFallbackResponse(inquiry);
}

/**
 * Create a fallback response when AI analysis fails.
 */
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
    inquiry_summary: inquiry.message
      ? `Customer inquiry: ${inquiry.message.substring(0, 100)}`
      : "Customer submitted an inquiry (AI analysis unavailable)",
    recommended_distributor: inquiry.state || "Unknown",
  };
}

// ============================================
// CONVERSATION HELPERS
// ============================================

/**
 * Helper to normalize and build the full conversation history.
 */
function buildFullConversation(userMessage: string, history: string[]): string[] {
  const normalized = history.map(h => h.trim()).filter(Boolean);
  const lastLine = normalized[normalized.length - 1];
  const expectedLine = `User: ${userMessage}`.trim();
  
  if (lastLine && (lastLine === expectedLine || lastLine.toLowerCase().endsWith(userMessage.toLowerCase().trim()))) {
    return normalized;
  }
  
  return [...normalized, `User: ${userMessage}`];
}

// ============================================
// EXTRACT CUSTOMER NAME (backward compat)
// ============================================

function extractCustomerNameFromHistory(history: string[]): string | null {
  for (const line of history) {
    if (line.startsWith("Agent:")) {
      const match = line.match(/(?:Thank you|help you with|understand|with that|welcome),\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i);
      if (match && match[1].toLowerCase() !== "dear customer" && match[1].toLowerCase() !== "customer" && match[1].toLowerCase() !== "user") {
        return match[1].trim();
      }
    }
  }
  return null;
}

export async function extractCustomerName(history: string[]): Promise<string | null> {
  return extractCustomerNameFromHistory(history);
}

async function extractNameFromMessage(message: string): Promise<string | null> {
  const prompt = `Does the following message contain a person's name being introduced?
Message: "${message}"
Respond with ONLY a JSON object: { "name": "the name" } or { "name": null }. No other text.`;
  try {
    const raw = await callLLM(prompt, true);
    const cleaned = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    const parsed = JSON.parse(cleaned);
    if (parsed.name && parsed.name.toLowerCase() !== "customer" && parsed.name.toLowerCase() !== "user" && parsed.name.toLowerCase() !== "no") {
      return parsed.name;
    }
  } catch (e) {
    console.error("Failed to extract name:", e);
  }
  return null;
}

// ============================================
// STATE EXTRACTION FROM HISTORY
// ============================================

interface ExtractedState {
  customerName: string | null;
  orderId: string | null;
  email: string | null;
  customerId: string | null;
  lastAgentMessage: string;
}

function extractConversationState(history: string[], userMessage: string): ExtractedState {
  const customerName = extractCustomerNameFromHistory(history);

  let orderId: string | null = null;
  for (const line of [...history, `User: ${userMessage}`]) {
    const match = line.match(/ORD\d{4,}/i);
    if (match) {
      orderId = match[0].toUpperCase();
    }
  }

  let email: string | null = null;
  for (const line of [...history, `User: ${userMessage}`]) {
    const match = line.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (match) {
      email = match[0].toLowerCase();
    }
  }

  let customerId: string | null = null;
  for (const line of [...history, `User: ${userMessage}`]) {
    const match = line.match(/CID\d{3,}/i);
    if (match) {
      customerId = match[0].toUpperCase();
    }
  }

  let lastAgentMessage = "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].startsWith("Agent:")) {
      lastAgentMessage = history[i].substring(6).trim();
      break;
    }
  }

  return {
    customerName,
    orderId,
    email,
    customerId,
    lastAgentMessage
  };
}

// ============================================
// DATABASE LOOKUP HELPERS (with timeout — FIX 7)
// ============================================

async function fetchOrderDetails(orderId: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("orders")
    .select(`
      order_id, order_date, delivery_status, issue_flag,
      customers ( customer_id, name, phone, email ),
      products ( product_id, name, category, price )
    `)
    .eq("order_id", orderId)
    .maybeSingle();

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchOrderDetails] Error:", error.message);
    return null;
  }
  return data;
}

async function fetchSupportTicketsForOrder(orderId: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("support_tickets")
    .select("*")
    .eq("order_id", orderId);

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchSupportTickets] Error:", error.message);
    return [];
  }
  return data || [];
}

async function fetchCustomerByEmail(email: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("customers")
    .select("*")
    .ilike("email", `%${email}%`)
    .maybeSingle();

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchCustomerByEmail] Error:", error.message);
    return null;
  }
  return data;
}

async function fetchCustomerById(customerId: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("customers")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchCustomerById] Error:", error.message);
    return null;
  }
  return data;
}

async function fetchCustomerOrders(customerId: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("orders")
    .select(`
      order_id, order_date, delivery_status, issue_flag,
      products ( product_id, name, category, price )
    `)
    .eq("customer_id", customerId)
    .order("order_date", { ascending: false });

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchCustomerOrders] Error:", error.message);
    return [];
  }
  return data || [];
}

async function fetchAllProducts() {
  const supabase = createAdminClient();
  const query = supabase
    .from("products")
    .select("*")
    .order("product_id");

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchAllProducts] Error:", error.message);
    return [];
  }
  return data || [];
}

// ============================================
// SMART ENDING MESSAGE CHECK (replaces greedy regex)
// ============================================

const ISSUE_KEYWORDS = [
  "order", "damaged", "torn", "refund", "wrong", "broken",
  "missing", "charge", "login", "password", "product", "price",
  "deliver", "return", "replace", "cancel", "item", "package",
  "shipping", "track", "received", "issue", "problem", "help",
  "complaint", "account", "email", "payment", "money"
];

/**
 * Check if a user message is an ending/goodbye message.
 * Returns false if the message contains active issue keywords or is longer than 6 words.
 * Returns true only for short confirmations/goodbyes without issue content.
 */
function checkIsEndingMessage(message: string): boolean {
  const normalized = message.trim().replace(/[.,!?]/g, "").toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);

  // Long messages are never ending messages
  if (words.length > 6) {
    return false;
  }

  // Check for active issue keywords — if present, this is NOT an ending
  for (const keyword of ISSUE_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return false;
    }
  }

  // Check for explicit goodbye phrases
  const explicitGoodbyes = [
    "thank you", "bye", "ok thanks", "that's all", "nothing else",
    "no that's it", "ok got it", "ok i'm good", "ok im good", "done",
    "thank you bye", "goodbye", "bye bye", "ok bye", "thanks bye",
    "no thanks", "no thank you", "i'm good", "im good", "that is all",
    "nothing more", "all good", "no more"
  ];
  if (explicitGoodbyes.includes(normalized)) {
    return true;
  }

  // Check for short positive/negative confirmations (only after "anything else?" question)
  const shortConfirmations = [
    "no", "nope", "nothing", "ok", "okay", "fine", "perfect",
    "got it", "sure", "alright", "understood", "great", "yes", "yep"
  ];
  if (shortConfirmations.includes(normalized)) {
    return true;
  }

  // Check for goodbye keywords in the message
  if (/\b(goodbye|bye bye|nothing else|thank you|thanks)\b/i.test(message)) {
    return true;
  }

  return false;
}

// ============================================
// TOPIC SWITCHING DETECTION (FIX 1)
// ============================================

/**
 * Detect if the user is switching to a new topic while the agent
 * is waiting for a specific piece of data (Order ID, email, etc.).
 */
function detectTopicSwitch(userMessage: string, lastAgentMessage: string): string | null {
  const msg = userMessage.toLowerCase();
  const isAwaitingOrderId = lastAgentMessage.includes("share your Order ID") || lastAgentMessage.includes("valid Order ID");
  const isAwaitingEmail = lastAgentMessage.includes("registered email address") || lastAgentMessage.includes("verify your registered email");

  if (!isAwaitingOrderId && !isAwaitingEmail) {
    return null; // Not in a data-collection state, no switch possible
  }

  // Check if the user is describing a new issue instead of providing the requested data
  if (isAwaitingEmail) {
    // Was collecting email/account info, but user mentions order-related keywords
    if (/\b(order|damaged|wrong item|broken|delivery|shipped|not received|package)\b/i.test(msg)) {
      return "ORDER_ISSUE";
    }
    if (/\b(product|price|stock|available|buy|purchase)\b/i.test(msg)) {
      return "PRODUCT_QUERY";
    }
  }

  if (isAwaitingOrderId) {
    // Was collecting order ID, but user mentions account/payment keywords
    if (/\b(login|password|account|profile|sign in|reset)\b/i.test(msg)) {
      return "ACCOUNT_ISSUE";
    }
    if (/\b(refund|charge|payment|double charge|money back)\b/i.test(msg)) {
      return "PAYMENT_ISSUE";
    }
    if (/\b(product|price|stock|available|buy|purchase)\b/i.test(msg)) {
      return "PRODUCT_QUERY";
    }
  }

  return null;
}

// ============================================
// SENTIMENT SCORING (FIX 2 — keyword heuristic)
// ============================================

/**
 * Compute sentiment score from user message using keyword heuristic.
 * Returns a value between 0.00 (very angry) and 1.00 (very positive).
 */
function computeSentiment(userMessage: string): number {
  const msg = userMessage.toLowerCase();

  // Angry/frustrated keywords → low sentiment
  const angryWords = ["useless", "terrible", "worst", "angry", "frustrated", "annoyed",
    "pathetic", "horrible", "disgusting", "ridiculous", "unacceptable", "stupid",
    "incompetent", "scam", "fraud", "waste", "hate", "rubbish", "trash"];
  for (const word of angryWords) {
    if (msg.includes(word)) return 0.15;
  }

  // Mildly negative
  const mildNegative = ["disappointed", "unhappy", "not happy", "not satisfied", "confused",
    "worried", "concerned", "upset", "wrong", "broken", "damaged"];
  for (const word of mildNegative) {
    if (msg.includes(word)) return 0.35;
  }

  // Positive keywords → high sentiment
  const positiveWords = ["thank you", "thanks", "great", "perfect", "excellent",
    "awesome", "wonderful", "amazing", "appreciate", "helpful", "good job",
    "well done", "satisfied", "happy"];
  for (const word of positiveWords) {
    if (msg.includes(word)) return 0.85;
  }

  // Short confirmations → mildly positive
  const confirmations = ["ok", "okay", "fine", "sure", "alright", "got it", "understood"];
  for (const word of confirmations) {
    if (msg === word || msg === word + ".") return 0.65;
  }

  // Default neutral
  return 0.50;
}

// ============================================
// DATABASE WRITE HELPERS (FIX 2, 3, 8)
// ============================================

/**
 * Write a conversation turn to the call_turns table (FIX 8).
 */
async function writeTurn(
  callLogId: string,
  turnIndex: number,
  speaker: "CUSTOMER" | "AGENT",
  text: string
): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("call_turns").insert({
      call_id: callLogId,
      turn_index: turnIndex,
      speaker,
      text,
    });
  } catch (err) {
    console.error(`[AI Agent] Failed to write turn ${turnIndex}:`, err);
  }
}

/**
 * Append turns to the call_logs transcript and update caller_name (FIX 8).
 */
async function appendToTranscript(
  callLogId: string,
  userMessage: string,
  agentReply: string,
  customerName: string | null
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { data: callLog } = await supabase
      .from("call_logs")
      .select("transcript")
      .eq("id", callLogId)
      .single();

    const existingTranscript = callLog?.transcript || "";
    const newLines = `User: ${userMessage}\nAgent: ${agentReply}`;
    const updatedTranscript = existingTranscript
      ? `${existingTranscript}\n${newLines}`
      : newLines;

    const updateData: Record<string, unknown> = { transcript: updatedTranscript };
    if (customerName) {
      updateData.caller_name = customerName;
    }

    await supabase
      .from("call_logs")
      .update(updateData)
      .eq("id", callLogId);
  } catch (err) {
    console.error("[AI Agent] Failed to append transcript:", err);
  }
}

/**
 * Upsert call_analysis with latest metadata (FIX 2).
 */
async function upsertCallAnalysis(
  callLogId: string,
  metadata: {
    issue_type?: string | null;
    customer_id?: string | null;
    order_id?: string | null;
    sentiment_score?: number;
    resolution_status?: string;
    db_timeout?: boolean;
  },
  incrementTurnCount: boolean = true
): Promise<void> {
  try {
    const supabase = createAdminClient();

    // Check if analysis row exists
    const { data: existing } = await supabase
      .from("call_analysis")
      .select("id, turn_count")
      .eq("call_id", callLogId)
      .maybeSingle();

    if (existing) {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (metadata.issue_type !== undefined) updateData.issue_type = metadata.issue_type;
      if (metadata.customer_id !== undefined) updateData.customer_id = metadata.customer_id;
      if (metadata.order_id !== undefined) updateData.order_id = metadata.order_id;
      if (metadata.sentiment_score !== undefined) updateData.sentiment_score = metadata.sentiment_score;
      if (metadata.resolution_status !== undefined) updateData.resolution_status = metadata.resolution_status;
      if (metadata.db_timeout !== undefined) updateData.db_timeout = metadata.db_timeout;
      if (incrementTurnCount) updateData.turn_count = existing.turn_count + 2; // user + agent

      await supabase.from("call_analysis").update(updateData).eq("id", existing.id);
    } else {
      // Insert new row
      await supabase.from("call_analysis").insert({
        call_id: callLogId,
        issue_type: metadata.issue_type || null,
        customer_id: metadata.customer_id || null,
        order_id: metadata.order_id || null,
        sentiment_score: metadata.sentiment_score ?? 0.50,
        resolution_status: metadata.resolution_status || "ACTIVE",
        turn_count: 2,
        db_timeout: metadata.db_timeout || false,
      });
    }
  } catch (err) {
    console.error("[AI Agent] Failed to upsert call_analysis:", err);
  }
}

/**
 * Generate a real ticket ID from the database sequence and insert into support_tickets (FIX 3).
 */
async function generateTicketFromDB(
  orderId: string | null,
  customerId: string | null,
  issueType: string,
  description: string
): Promise<string> {
  try {
    const supabase = createAdminClient();

    // Get next sequence value
    const { data: seqData, error: seqError } = await supabase
      .rpc("nextval_support_ticket_seq");

    let ticketNum: number;
    if (seqError || !seqData) {
      // Fallback: query existing tickets and use max + 1
      console.warn("[AI Agent] Sequence RPC failed, using fallback:", seqError);
      const { data: maxTicket } = await supabase
        .from("support_tickets")
        .select("ticket_id")
        .order("ticket_id", { ascending: false })
        .limit(1)
        .single();
      const match = maxTicket?.ticket_id?.match(/\d+/);
      ticketNum = match ? parseInt(match[0]) + 1 : 3000;
    } else {
      ticketNum = typeof seqData === "number" ? seqData : 3000;
    }

    const ticketId = `TKT${ticketNum}`;

    // Insert into support_tickets
    await supabase.from("support_tickets").insert({
      ticket_id: ticketId,
      order_id: orderId,
      customer_id: customerId,
      issue_type: issueType,
      description: description,
      status: "Open",
    });

    console.log(`[AI Agent] Created support ticket: ${ticketId}`);
    return ticketId;
  } catch (err) {
    console.error("[AI Agent] Failed to generate ticket from DB:", err);
    // Absolute fallback: random ID
    return `TKT${Math.floor(3000 + Math.random() * 7000)}`;
  }
}

// ============================================
// LOOKUP FAILURE COUNTER
// ============================================

function countLookupFailures(history: string[]): number {
  let failures = 0;
  for (const line of history) {
    if (line.startsWith("Agent:")) {
      const msg = line.substring(6).toLowerCase();
      if (
        msg.includes("wasn't able to find order") ||
        msg.includes("couldn't find a valid order") ||
        msg.includes("could not find a valid order") ||
        msg.includes("couldn't find an account") ||
        msg.includes("verify your registered email") ||
        msg.includes("share it again") ||
        msg.includes("having trouble fetching")
      ) {
        failures++;
      }
    }
  }
  return failures;
}

// ============================================
// GET CURRENT TURN INDEX
// ============================================

async function getCurrentTurnIndex(callLogId: string): Promise<number> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("call_turns")
      .select("turn_index")
      .eq("call_id", callLogId)
      .order("turn_index", { ascending: false })
      .limit(1)
      .single();
    return data ? data.turn_index + 1 : 0;
  } catch {
    return 0;
  }
}

// ============================================
// MAIN VOICE RESPONSE ENGINE
// ============================================

export async function generateVoiceResponse(
  userMessage: string,
  conversationHistory: string[] = [],
  callType: string = "ai",
  callerName: string = "Customer",
  callLogId: string = ""
): Promise<VoiceAgentResponse> {
  // Metadata tracked across the function
  let responseStatus: "ACTIVE" | "ENDED" | "ESCALATED" = "ACTIVE";
  let detectedIssueType: string | null = null;
  let detectedCustomerId: string | null = null;
  let detectedOrderId: string | null = null;
  let detectedCustomerName: string | null = null;
  let detectedTicketId: string | null = null;
  let dbTimeout = false;
  let sentimentScore = computeSentiment(userMessage);

  try {
    const fullConversation = buildFullConversation(userMessage, conversationHistory);
    
    // 1. Extract existing entities from history
    const state = extractConversationState(conversationHistory, userMessage);
    let customerName = state.customerName;
    const lastAgentMessage = state.lastAgentMessage;

    // Extract IDs from current message + history
    let orderId = state.orderId;
    let email = state.email;
    let customerId = state.customerId;

    console.log(`[AI Agent] Extracted State: Name=${customerName}, OrderID=${orderId}, Email=${email}, CustomerID=${customerId}`);
    console.log(`[AI Agent] Last Agent Message: "${lastAgentMessage}"`);

    // 2. Handle Name Collection Phase
    if (!customerName) {
      // Check if user just gave their name in this message
      const extractedName = await extractNameFromMessage(userMessage);
      if (extractedName) {
        customerName = extractedName;
      }
    }

    // 3. STEP 1 & 2: Greeting & Name collection
    if (!customerName) {
      // If we haven't greeted yet (first user turn)
      if (conversationHistory.length === 0) {
        const reply = `Hello! Welcome to ${COMPANY_NAME} support. How are you doing today?`;
        await writeAgentTurn(callLogId, userMessage, reply, null, {
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
      }
      // If we greeted, but haven't asked for name yet (last agent message was the greeting)
      if (lastAgentMessage.includes("How are you doing today?") || lastAgentMessage.includes("How can I assist you") || lastAgentMessage.includes("How can I help you today")) {
        const reply = `Great! May I know your name please?`;
        await writeAgentTurn(callLogId, userMessage, reply, null, {
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
      }
      // Otherwise, we must ask for name
      const reply = `Great! May I know your name please?`;
      await writeAgentTurn(callLogId, userMessage, reply, null, {
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
    }

    detectedCustomerName = customerName;

    // 4. SIGNAL checks for CALL TERMINATION
    
    // Signal 5: Customer Frustration
    if (
      /\b(useless|human|real agent|manager|abusive|angry|annoyed|terrible|worst)\b/i.test(userMessage) || 
      /connect me to/i.test(userMessage) || 
      /want to talk to a person/i.test(userMessage)
    ) {
      responseStatus = "ESCALATED";
      sentimentScore = 0.10;
      const reply = `I completely understand your frustration, ${customerName}. Let me connect you to a human agent right away.`;
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ESCALATED",
      });
      return buildResponse(reply, "ESCALATED", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // Response to Escalation Question (Signal 4 response)
    if (lastAgentMessage.includes("escalating this to our support team") && lastAgentMessage.includes("Is there anything else before I go?")) {
      responseStatus = "ENDED";
      const reply = `Thank you for calling ${COMPANY_NAME} support, ${customerName}. I hope your issue has been resolved. Have a great day! Goodbye!`;
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ENDED",
      });
      return buildResponse(reply, "ENDED", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // Signal 1, 2, 3: Goodbye Check (using smart check — FIX ending bug)
    const wasClosingQuestion = lastAgentMessage.includes("Is there anything else I can help you with");
    const isEnding = checkIsEndingMessage(userMessage);

    if (isEnding || (wasClosingQuestion && !userMessage.trim())) {
      responseStatus = "ENDED";
      const reply = `Thank you for calling ${COMPANY_NAME} support, ${customerName}. I hope your issue has been resolved. Have a great day! Goodbye!`;
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ENDED",
      });
      return buildResponse(reply, "ENDED", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // ============================================
    // TOPIC SWITCHING DETECTION (FIX 1)
    // ============================================
    const topicSwitch = detectTopicSwitch(userMessage, lastAgentMessage);
    if (topicSwitch) {
      console.log(`[AI Agent] Topic switch detected! New topic: ${topicSwitch}. Resetting collected data.`);
      // Discard previously collected partial data
      orderId = null;
      email = null;
      customerId = null;
      // The topic switch returns the new classification — handle it directly
      detectedIssueType = topicSwitch;

      if (topicSwitch === "ORDER_ISSUE") {
        const reply = `I understand, ${customerName}. Let me help you with your order issue. Could you please share your Order ID so I can look into this for you? It usually starts with 'ORD' followed by numbers.`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      if (topicSwitch === "ACCOUNT_ISSUE" || topicSwitch === "PAYMENT_ISSUE") {
        const reply = `I'd be happy to help you with that, ${customerName}. Could you please share your registered email address or Customer ID so I can pull up your account?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      if (topicSwitch === "PRODUCT_QUERY") {
        // Fetch products and answer
        let products;
        try {
          products = await fetchAllProducts();
        } catch (err) {
          if (String(err).includes("DB_TIMEOUT")) {
            dbTimeout = true;
          }
          products = [];
        }
        const productContext = products.length > 0 ? JSON.stringify(products, null, 2) : "No products in database.";
        const prompt = `You are a helpful e-commerce support agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

PRODUCT DATABASE:
${productContext}

Customer query: "${userMessage}"

INSTRUCTIONS:
- Answer the customer's query using ONLY the product database.
- Provide specific details (price, stock status, category).
- Keep response under 3 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

        const response = await callLLM(prompt, false);
        const reply = response.trim();
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
          db_timeout: dbTimeout,
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: topicSwitch,
          sentiment_score: sentimentScore,
          customer_name: customerName,
          db_timeout: dbTimeout,
        });
      }
    }

    // ============================================
    // CASE: Agent just asked for name — transition to issue collection
    // ============================================
    if (lastAgentMessage.includes("May I know your name please?")) {
      // Just got the name, now ask for the issue
      const reply = `Thank you, ${customerName}! How can I help you today? Please describe your issue.`;
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // ============================================
    // CASE A: Awaiting Order ID
    // ============================================
    if (lastAgentMessage.includes("share your Order ID") || lastAgentMessage.includes("valid Order ID")) {
      if (!orderId) {
        const failures = countLookupFailures(conversationHistory);
        if (failures >= 1) {
          const ticketId = await generateTicketFromDB(null, customerId, "order_issue_unresolvable", `Customer ${customerName} could not provide valid Order ID after multiple attempts.`);
          detectedTicketId = ticketId;
          responseStatus = "ESCALATED";
          const reply = `I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}. Is there anything else before I go?`;
          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: "ORDER_ISSUE",
            sentiment_score: sentimentScore,
            resolution_status: "ESCALATED",
          });
          return buildResponse(reply, "ESCALATED", {
            issue_type: "ORDER_ISSUE",
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const reply = `I couldn't find a valid Order ID in your message, ${customerName}. Could you please check and share it again? It starts with 'ORD' followed by numbers, like 'ORD1001'.`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: "ORDER_ISSUE",
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: "ORDER_ISSUE",
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }
      
      // Look up order in database with timeout handling (FIX 7)
      let order;
      try {
        order = await fetchOrderDetails(orderId);
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          console.warn(`[AI Agent] DB timeout on fetchOrderDetails(${orderId}). Retrying...`);
          // Retry once
          try {
            order = await fetchOrderDetails(orderId);
          } catch (retryErr) {
            // Still failing — escalate
            const ticketId = await generateTicketFromDB(orderId, customerId, "order_issue_db_timeout", `DB timeout looking up order ${orderId} for customer ${customerName}.`);
            detectedTicketId = ticketId;
            const reply = `I'm sorry, I'm having persistent trouble accessing our systems. I'm escalating this to our support team. Your ticket ID is ${ticketId}. They will contact you within 24 hours. Is there anything else before I go?`;
            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: "ORDER_ISSUE",
              order_id: orderId,
              sentiment_score: sentimentScore,
              resolution_status: "ESCALATED",
              db_timeout: true,
            });
            return buildResponse(reply, "ESCALATED", {
              issue_type: "ORDER_ISSUE",
              order_id: orderId,
              sentiment_score: sentimentScore,
              customer_name: customerName,
              ticket_id: ticketId,
              db_timeout: true,
            });
          }
        } else {
          order = null;
        }
      }

      detectedOrderId = orderId;

      if (!order) {
        const failures = countLookupFailures(conversationHistory);
        if (failures >= 1) {
          const ticketId = await generateTicketFromDB(orderId, customerId, "order_not_found", `Order ${orderId} not found for customer ${customerName} after multiple attempts.`);
          detectedTicketId = ticketId;
          responseStatus = "ESCALATED";
          const reply = `I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}. Is there anything else before I go?`;
          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: "ORDER_ISSUE",
            order_id: orderId,
            sentiment_score: sentimentScore,
            resolution_status: "ESCALATED",
          });
          return buildResponse(reply, "ESCALATED", {
            issue_type: "ORDER_ISSUE",
            order_id: orderId,
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const reply = `I wasn't able to find order ${orderId} in our system, ${customerName}. Could you please double-check the Order ID and try again?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: "ORDER_ISSUE",
          order_id: orderId,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: "ORDER_ISSUE",
          order_id: orderId,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      const tickets = await fetchSupportTicketsForOrder(orderId);
      const orderContext = JSON.stringify(order, null, 2);
      const ticketContext = tickets.length > 0 ? JSON.stringify(tickets, null, 2) : "No existing support tickets for this order.";

      const prompt = `You are a polite customer support AI agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

ORDER DETAILS:
${orderContext}

EXISTING SUPPORT TICKETS:
${ticketContext}

INSTRUCTIONS:
- Formulate a helpful resolution matching the status:
  - If delivery_status is "Pending": Inform them the order is processing and mention the order date.
  - If delivery_status is "Delivered" and issue_flag is "damaged" or "wrong_item": Apologize, refer to existing ticket if open, or offer a solution (replacement/refund).
  - Mention specific details from the data (like product name, price, dates).
- Keep it under 4 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

      const response = await callLLM(prompt, false);
      const reply = response.trim();
      detectedIssueType = "ORDER_ISSUE";
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        issue_type: "ORDER_ISSUE",
        order_id: orderId,
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", {
        issue_type: "ORDER_ISSUE",
        order_id: orderId,
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // ============================================
    // CASE B: Awaiting Email / Customer ID
    // ============================================
    if (lastAgentMessage.includes("registered email address") || lastAgentMessage.includes("verify your registered email")) {
      let customer: any = null;

      try {
        if (email) {
          customer = await fetchCustomerByEmail(email);
        } else if (customerId) {
          customer = await fetchCustomerById(customerId);
        }
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          console.warn("[AI Agent] DB timeout on customer lookup. Retrying...");
          try {
            if (email) {
              customer = await fetchCustomerByEmail(email);
            } else if (customerId) {
              customer = await fetchCustomerById(customerId);
            }
          } catch {
            const ticketId = await generateTicketFromDB(null, customerId, "account_issue_db_timeout", `DB timeout looking up customer for ${customerName}.`);
            detectedTicketId = ticketId;
            const reply = `I'm sorry, I'm having persistent trouble accessing our systems. I'm escalating this to our support team. Your ticket ID is ${ticketId}. They will contact you within 24 hours. Is there anything else before I go?`;
            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: "ACCOUNT_ISSUE",
              customer_id: customerId,
              sentiment_score: sentimentScore,
              resolution_status: "ESCALATED",
              db_timeout: true,
            });
            return buildResponse(reply, "ESCALATED", {
              issue_type: "ACCOUNT_ISSUE",
              customer_id: customerId,
              sentiment_score: sentimentScore,
              customer_name: customerName,
              ticket_id: ticketId,
              db_timeout: true,
            });
          }
        }
      }

      if (!customer) {
        const failures = countLookupFailures(conversationHistory);
        if (failures >= 1) {
          const ticketId = await generateTicketFromDB(null, customerId, "account_not_found", `Account not found for customer ${customerName} after multiple attempts.`);
          detectedTicketId = ticketId;
          responseStatus = "ESCALATED";
          const reply = `I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}. Is there anything else before I go?`;
          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: "ACCOUNT_ISSUE",
            sentiment_score: sentimentScore,
            resolution_status: "ESCALATED",
          });
          return buildResponse(reply, "ESCALATED", {
            issue_type: "ACCOUNT_ISSUE",
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const reply = `I couldn't find an account with that information, ${customerName}. Could you please verify your registered email address or Customer ID?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: "ACCOUNT_ISSUE",
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: "ACCOUNT_ISSUE",
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      detectedCustomerId = customer.customer_id;

      // Fetch their orders
      const orders = await fetchCustomerOrders(customer.customer_id);
      const customerContext = JSON.stringify(customer, null, 2);
      const ordersContext = orders.length > 0 ? JSON.stringify(orders, null, 2) : "No orders found.";

      const prompt = `You are a polite customer support AI agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

CUSTOMER RECORD:
${customerContext}

ORDER HISTORY:
${ordersContext}

INSTRUCTIONS:
- Formulate a helpful resolution.
- Mention specific details from the customer record or order history (like email, last order ID, product name, status).
- For refunds (PAYMENT issues), mention it takes 3-5 business days to process.
- Keep it under 4 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

      const response = await callLLM(prompt, false);
      const reply = response.trim();
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        issue_type: "ACCOUNT_ISSUE",
        customer_id: customer.customer_id,
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", {
        issue_type: "ACCOUNT_ISSUE",
        customer_id: customer.customer_id,
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // ============================================
    // CLASSIFY THE ISSUE
    // ============================================
    const classifyPrompt = `Classify this customer message into one of these categories:
- PRODUCT_QUERY (questions about product specifications, price, or availability)
- ORDER_ISSUE (wrong item, damaged product, late delivery, not received, order status)
- ACCOUNT_ISSUE (login, password, profile)
- PAYMENT_ISSUE (refund, double charge, payment failure)
- OTHER (general conversation, greetings, etc.)

Message: "${userMessage}"

Respond with ONLY the classification string.`;

    const classification = (await callLLM(classifyPrompt)).trim().toUpperCase();
    console.log(`[AI Agent] Classified issue as: ${classification}`);
    detectedIssueType = classification;

    if (classification === "PRODUCT_QUERY") {
      let products;
      try {
        products = await fetchAllProducts();
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          // Retry once
          try {
            products = await fetchAllProducts();
          } catch {
            const reply = `Sorry, I'm having trouble fetching our product details right now, ${customerName}. Give me just a moment.`;
            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: classification,
              sentiment_score: sentimentScore,
              resolution_status: "ACTIVE",
              db_timeout: true,
            });
            return buildResponse(reply, "ACTIVE", {
              issue_type: classification,
              sentiment_score: sentimentScore,
              customer_name: customerName,
              db_timeout: true,
            });
          }
        } else {
          products = [];
        }
      }
      const productContext = products.length > 0 ? JSON.stringify(products, null, 2) : "No products in database.";

      const prompt = `You are a helpful e-commerce support agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

PRODUCT DATABASE:
${productContext}

Customer query: "${userMessage}"

INSTRUCTIONS:
- Answer the customer's query using ONLY the product database.
- Provide specific details (price, stock status, category).
- Keep response under 3 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

      const response = await callLLM(prompt, false);
      const reply = response.trim();
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        issue_type: classification,
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
        db_timeout: dbTimeout,
      });
      return buildResponse(reply, "ACTIVE", {
        issue_type: classification,
        sentiment_score: sentimentScore,
        customer_name: customerName,
        db_timeout: dbTimeout,
      });
    }

    if (classification === "ORDER_ISSUE") {
      if (!orderId) {
        const reply = `I understand, ${customerName}. Could you please share your Order ID so I can look into this for you? It usually starts with 'ORD' followed by numbers.`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: classification,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: classification,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      let order;
      try {
        order = await fetchOrderDetails(orderId);
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          try {
            order = await fetchOrderDetails(orderId);
          } catch {
            const ticketId = await generateTicketFromDB(orderId, customerId, "order_issue_db_timeout", `DB timeout for order ${orderId}, customer ${customerName}.`);
            detectedTicketId = ticketId;
            const reply = `I'm sorry, I'm having persistent trouble accessing our systems. I'm escalating this to our support team. Your ticket ID is ${ticketId}. They will contact you within 24 hours. Is there anything else before I go?`;
            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: classification,
              order_id: orderId,
              sentiment_score: sentimentScore,
              resolution_status: "ESCALATED",
              db_timeout: true,
            });
            return buildResponse(reply, "ESCALATED", {
              issue_type: classification,
              order_id: orderId,
              sentiment_score: sentimentScore,
              customer_name: customerName,
              ticket_id: ticketId,
              db_timeout: true,
            });
          }
        } else {
          order = null;
        }
      }

      detectedOrderId = orderId;

      if (!order) {
        const failures = countLookupFailures(conversationHistory);
        if (failures >= 1) {
          const ticketId = await generateTicketFromDB(orderId, customerId, "order_not_found", `Order ${orderId} not found for ${customerName}.`);
          detectedTicketId = ticketId;
          const reply = `I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}. Is there anything else before I go?`;
          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: classification,
            order_id: orderId,
            sentiment_score: sentimentScore,
            resolution_status: "ESCALATED",
          });
          return buildResponse(reply, "ESCALATED", {
            issue_type: classification,
            order_id: orderId,
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const reply = `I wasn't able to find order ${orderId} in our system, ${customerName}. Could you please double-check the Order ID and try again?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: classification,
          order_id: orderId,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: classification,
          order_id: orderId,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      const tickets = await fetchSupportTicketsForOrder(orderId);
      const orderContext = JSON.stringify(order, null, 2);
      const ticketContext = tickets.length > 0 ? JSON.stringify(tickets, null, 2) : "No existing support tickets.";

      const prompt = `You are a polite customer support AI agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

ORDER DETAILS:
${orderContext}

EXISTING SUPPORT TICKETS:
${ticketContext}

Customer issue: "${userMessage}"

INSTRUCTIONS:
- Formulate a helpful resolution matching the status:
  - If delivery_status is "Pending": Inform them the order is processing and mention the order date.
  - If delivery_status is "Delivered" and issue_flag is "damaged" or "wrong_item": Apologize, refer to existing ticket if open, or offer a solution (replacement/refund).
  - Mention specific details from the data (like product name, price, dates).
- Keep it under 4 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

      const response = await callLLM(prompt, false);
      const reply = response.trim();
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        issue_type: classification,
        order_id: orderId,
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", {
        issue_type: classification,
        order_id: orderId,
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    if (classification === "ACCOUNT_ISSUE" || classification === "PAYMENT_ISSUE") {
      if (!email && !customerId) {
        const reply = `I'd be happy to help you with that, ${customerName}. Could you please share your registered email address or Customer ID so I can pull up your account?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: classification,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: classification,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      let customer: any = null;
      try {
        if (email) {
          customer = await fetchCustomerByEmail(email);
        } else if (customerId) {
          customer = await fetchCustomerById(customerId);
        }
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          try {
            if (email) customer = await fetchCustomerByEmail(email);
            else if (customerId) customer = await fetchCustomerById(customerId);
          } catch {
            const ticketId = await generateTicketFromDB(null, customerId, `${classification.toLowerCase()}_db_timeout`, `DB timeout for customer ${customerName}.`);
            detectedTicketId = ticketId;
            const reply = `I'm sorry, I'm having persistent trouble accessing our systems. I'm escalating this to our support team. Your ticket ID is ${ticketId}. They will contact you within 24 hours. Is there anything else before I go?`;
            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: classification,
              sentiment_score: sentimentScore,
              resolution_status: "ESCALATED",
              db_timeout: true,
            });
            return buildResponse(reply, "ESCALATED", {
              issue_type: classification,
              sentiment_score: sentimentScore,
              customer_name: customerName,
              ticket_id: ticketId,
              db_timeout: true,
            });
          }
        }
      }

      if (!customer) {
        const failures = countLookupFailures(conversationHistory);
        if (failures >= 1) {
          const ticketId = await generateTicketFromDB(null, customerId, "account_not_found", `Account not found for ${customerName}.`);
          detectedTicketId = ticketId;
          const reply = `I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}. Is there anything else before I go?`;
          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: classification,
            sentiment_score: sentimentScore,
            resolution_status: "ESCALATED",
          });
          return buildResponse(reply, "ESCALATED", {
            issue_type: classification,
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const reply = `I couldn't find an account with that information, ${customerName}. Could you please verify your registered email address or Customer ID?`;
        await writeAgentTurn(callLogId, userMessage, reply, customerName, {
          issue_type: classification,
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", {
          issue_type: classification,
          sentiment_score: sentimentScore,
          customer_name: customerName,
        });
      }

      detectedCustomerId = customer.customer_id;

      const orders = await fetchCustomerOrders(customer.customer_id);
      const customerContext = JSON.stringify(customer, null, 2);
      const ordersContext = orders.length > 0 ? JSON.stringify(orders, null, 2) : "No orders found.";

      const prompt = `You are a polite customer support AI agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

CUSTOMER RECORD:
${customerContext}

ORDER HISTORY:
${ordersContext}

Customer issue: "${userMessage}"

INSTRUCTIONS:
- Formulate a helpful resolution.
- Mention specific details from the customer record or order history (like email, last order ID, product name, status).
- For refunds (PAYMENT issues), mention it takes 3-5 business days to process.
- Keep it under 4 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

      const response = await callLLM(prompt, false);
      const reply = response.trim();
      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        issue_type: classification,
        customer_id: customer.customer_id,
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", {
        issue_type: classification,
        customer_id: customer.customer_id,
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // Classification OTHER
    const prompt = `You are a helpful customer support AI agent named "AI Agent" for ${COMPANY_NAME}.
The customer's name is "${customerName}". Always address them by name.

Customer message: "${userMessage}"

INSTRUCTIONS:
- Respond politely and conversationally.
- Keep response under 3 sentences.
- End by asking: "Is there anything else I can help you with, ${customerName}?"`;

    const response = await callLLM(prompt, false);
    const reply = response.trim();
    await writeAgentTurn(callLogId, userMessage, reply, customerName, {
      issue_type: "OTHER",
      sentiment_score: sentimentScore,
      resolution_status: "ACTIVE",
    });
    return buildResponse(reply, "ACTIVE", {
      issue_type: "OTHER",
      sentiment_score: sentimentScore,
      customer_name: customerName,
    });

  } catch (error) {
    console.error("Voice AI response error:", error);
    const reply = "I apologize, but I'm having trouble processing your request right now. Let me transfer you to our team.";
    return buildResponse(reply, "ESCALATED", {
      sentiment_score: sentimentScore,
    });
  }
}

// ============================================
// RESPONSE BUILDER HELPER
// ============================================

function buildResponse(
  reply: string,
  status: "ACTIVE" | "ENDED" | "ESCALATED",
  partial: {
    issue_type?: string | null;
    customer_id?: string | null;
    order_id?: string | null;
    sentiment_score?: number;
    customer_name?: string | null;
    ticket_id?: string | null;
    db_timeout?: boolean;
  } = {}
): VoiceAgentResponse {
  return {
    reply,
    status,
    metadata: {
      issue_type: partial.issue_type ?? null,
      customer_id: partial.customer_id ?? null,
      order_id: partial.order_id ?? null,
      sentiment_score: partial.sentiment_score ?? 0.50,
      customer_name: partial.customer_name ?? null,
      ticket_id: partial.ticket_id ?? null,
      db_timeout: partial.db_timeout ?? false,
    },
  };
}

// ============================================
// WRITE AGENT TURN HELPER (FIX 8)
// Writes user+agent turns to call_turns, appends to transcript, upserts call_analysis
// ============================================

async function writeAgentTurn(
  callLogId: string,
  userMessage: string,
  agentReply: string,
  customerName: string | null,
  analysisMetadata: {
    issue_type?: string | null;
    customer_id?: string | null;
    order_id?: string | null;
    sentiment_score?: number;
    resolution_status?: string;
    db_timeout?: boolean;
  }
): Promise<void> {
  if (!callLogId) return; // Skip if no call log ID (shouldn't happen after FIX A)

  try {
    const turnIndex = await getCurrentTurnIndex(callLogId);

    // Write user turn and agent turn to call_turns
    await writeTurn(callLogId, turnIndex, "CUSTOMER", userMessage);
    await writeTurn(callLogId, turnIndex + 1, "AGENT", agentReply);

    // Append to call_logs transcript
    await appendToTranscript(callLogId, userMessage, agentReply, customerName);

    // Upsert call_analysis
    await upsertCallAnalysis(callLogId, analysisMetadata);
  } catch (err) {
    console.error("[AI Agent] writeAgentTurn error:", err);
  }
}

// ============================================
// CALL TERMINATION & METADATA HELPERS (backward compat)
// ============================================

export function extractCallMetadata(history: string[]): {
  customerId: string | null;
  issueType: string | null;
  resolutionStatus: string;
} {
  let customerId: string | null = null;
  let issueType: string | null = null;
  let resolutionStatus = "RESOLVED";

  for (const line of history) {
    const cidMatch = line.match(/CID\d{3,}/i);
    if (cidMatch) {
      customerId = cidMatch[0].toUpperCase();
    }
    if (line.startsWith("Agent:")) {
      if (line.includes("escalating this to our support team")) {
        resolutionStatus = "ESCALATED";
      }
    }
  }

  const fullText = history.join("\n").toLowerCase();
  if (fullText.includes("order") || fullText.includes("delivered") || fullText.includes("damaged")) {
    issueType = "ORDER_ISSUE";
  } else if (fullText.includes("refund") || fullText.includes("charge") || fullText.includes("payment")) {
    issueType = "PAYMENT_ISSUE";
  } else if (fullText.includes("login") || fullText.includes("password") || fullText.includes("account")) {
    issueType = "ACCOUNT_ISSUE";
  } else if (fullText.includes("available") || fullText.includes("price") || fullText.includes("stock")) {
    issueType = "PRODUCT_QUERY";
  } else {
    issueType = "OTHER";
  }

  return {
    customerId,
    issueType,
    resolutionStatus
  };
}

/**
 * Check if Ollama is running and the model is available.
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  models: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!response.ok) {
      return { available: false, models: [], error: "Ollama not responding" };
    }
    const data = await response.json();
    const models = (data.models || []).map(
      (m: { name: string }) => m.name
    );
    return { available: true, models };
  } catch {
    return {
      available: false,
      models: [],
      error: "Cannot connect to Ollama. Ensure it is running on port 11434.",
    };
  }
}
