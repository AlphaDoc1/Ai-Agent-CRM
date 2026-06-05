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
const COMPANY_NAME = "Elanpro";

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

async function extractConversationState(history: string[], userMessage: string, languageName: string = "English"): Promise<ExtractedState> {
  const customerName = extractCustomerNameFromHistory(history);

  // We'll use LLM to extract entities more reliably from noisy multilingual speech
  const extractionPrompt = `Extract entities from the following conversation.
CONVERSATION:
${history.join("\n")}
User: ${userMessage}

INSTRUCTIONS:
1. Extract Order ID: Look for patterns like ORD followed by numbers (e.g., ORD001, ORD007). Handle misspellings or phonetic variations like "ऑडी", "आर्ड", "voter ID", "ऑर्डनेंस". If the user just says a number like "007" in an order context, extract it as "ORD007".
2. Extract Email.
3. Extract Customer ID: Look for CID followed by numbers (e.g., CID001).

Respond with ONLY a JSON object:
{
  "orderId": "ORDxxx or null",
  "email": "email or null",
  "customerId": "CIDxxx or null"
}`;

  let extracted = { orderId: null, email: null, customerId: null };
  try {
    const raw = await callLLM(extractionPrompt, true);
    const cleaned = raw.trim().replace(/```json\s*/gi, "").replace(/```\s*/g, "");
    extracted = JSON.parse(cleaned);
  } catch (e) {
    console.error("[AI Agent] Entity extraction failed, falling back to regex:", e);
    // Fallback to regex
    let orderId: string | null = null;
    for (const line of [...history, `User: ${userMessage}`]) {
      const match = line.match(/ORD\d{1,}/i) || line.match(/\b\d{3,}\b/);
      if (match) {
        orderId = match[0].toUpperCase();
        if (!orderId.startsWith("ORD")) orderId = "ORD" + orderId.padStart(3, '0');
      }
    }
    extracted.orderId = orderId as any;
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
    orderId: extracted.orderId,
    email: extracted.email,
    customerId: extracted.customerId,
    lastAgentMessage
  };
}

// ============================================
// DATABASE LOOKUP HELPERS (with timeout — FIX 7)
// ============================================

async function fetchOrderDetails(order_id: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("orders")
    .select(`
      order_id, order_date, delivery_status, installation_status, warranty_expiry,
      customers ( customer_id, name, contact_person, phone, email, business_type, city, state ),
      products ( product_id, model_number, name, capacity, temperature_range )
    `)
    .eq("order_id", order_id)
    .maybeSingle();

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchOrderDetails] Error:", error.message);
    return null;
  }
  return data;
}

async function fetchSupportTicketsForOrder(order_id: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("service_tickets")
    .select("*")
    .eq("order_id", order_id);

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

async function fetchCustomerById(customer_id: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("customers")
    .select("*")
    .eq("customer_id", customer_id)
    .maybeSingle();

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchCustomerById] Error:", error.message);
    return null;
  }
  return data;
}

async function fetchCustomerOrders(customer_id: string) {
  const supabase = createAdminClient();
  const query = supabase
    .from("orders")
    .select(`
      order_id, order_date, delivery_status, installation_status, warranty_expiry,
      products ( product_id, model_number, name, capacity )
    `)
    .eq("customer_id", customer_id)
    .order("order_date", { ascending: false });

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchCustomerOrders] Error:", error.message);
    return [];
  }
  return data || [];
}

async function fetchProductsByQuery(userMessage: string) {
  const supabase = createAdminClient();
  
  // Improvement: Map common phonetic/translated terms to technical keywords
  const queryTerms = userMessage.toLowerCase();
  let searchTerms = [queryTerms];
  
  if (queryTerms.includes("की मेकर") || queryTerms.includes("बर्फ") || queryTerms.includes("ice maker")) {
    searchTerms.push("Ice Maker", "Ice Machine");
  }
  if (queryTerms.includes("चिलर") || queryTerms.includes("chiller")) {
    searchTerms.push("Chiller", "Cooler");
  }
  if (queryTerms.includes("फ्रीजर") || queryTerms.includes("freezer")) {
    searchTerms.push("Freezer");
  }

  const query = supabase
    .from("products")
    .select(`
      product_id, model_number, name, capacity, temperature_range, 
      dimensions_mm, power_watts, refrigerant, material, key_features, stock_status,
      product_categories ( name, applications )
    `)
    .limit(10);

  // Build the OR filter for keywords
  const keywords = searchTerms.join(" ").split(/\s+/).filter(w => w.length > 2);
  if (keywords.length > 0) {
    const filter = keywords.map(k => `name.ilike.%${k}%,model_number.ilike.%${k}%,key_features.ilike.%${k}%`).join(",");
    query.or(filter);
  }

  const { data, error } = await withTimeout<any>(query, DB_TIMEOUT_MS);

  if (error) {
    console.error("[fetchProductsByQuery] Error:", error.message);
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
 * Check if a user message is an ending/goodbye message (SIGNAL 1 & 2).
 * Returns true only for short confirmations/goodbyes without issue content.
 */
function checkIsEndingMessage(message: string): boolean {
  const normalized = message.trim().replace(/[.,!?]/g, "").toLowerCase();
  const words = normalized.split(/\s+/).filter(Boolean);

  // SIGNAL 1: EXPLICIT GOODBYE
  const explicitGoodbyes = [
    "thank you", "bye", "ok thanks", "that's all", "nothing else", 
    "no that's it", "ok got it", "ok i'm good", "done", "goodbye",
    "dhanyawad", "shukriya", "bas", "kuch nahi", "theek hai", "ok bye", // Hindi
    "dhanyavadagalu", "saaku", "innenu illa", // Kannada
    "nandri", "podhum", // Tamil
    "dhanyavadalu", "chalu", "inkem ledu" // Telugu
  ];
  
  for (const goodbye of explicitGoodbyes) {
    if (normalized === goodbye || normalized.includes(goodbye)) return true;
  }

  // SIGNAL 2/3: Short confirmations after resolution
  const shortConfirmations = [
    "no", "nope", "nothing", "ok", "okay", "fine", "perfect", "got it", 
    "sure", "alright", "understood", "great", "yes", "yep",
    "nahi", "ha", "theek", "bas", // Hindi
    "illa", "houdhu", "sari", // Kannada
    "illai", "aamaam", "sari", // Tamil
    "ledu", "avunu", "sari" // Telugu
  ];
  
  if (words.length <= 2 && shortConfirmations.includes(normalized)) {
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
  
  // Detection for multilingual keywords
  const orderKeywords = /\b(order|damaged|wrong item|broken|delivery|shipped|not received|package|ticket|service|repair|complaint|ऑर्डर|डिलीवरी|मैसेज|टिकट|सर्विस|शिकायत|खराब)\b/i;
  const productKeywords = /\b(product|price|stock|available|buy|purchase|details|specs|उत्पाद|कीमत|चिलर|फ्रीजर|मशीन)\b/i;
  const accountKeywords = /\b(login|password|account|profile|sign in|reset|details|खाता|पासवर्ड|प्रोफाइल)\b/i;
  const paymentKeywords = /\b(refund|charge|payment|double charge|money back|भुगतान|रिफंड|पैसे)\b/i;

  const isAwaitingOrderId = /order id|ord|ऑर्डर आईडी|आईडी/i.test(lastAgentMessage);
  const isAwaitingEmail = /email|address|customer id|ईमेल|पता|आईडी/i.test(lastAgentMessage);

  if (!isAwaitingOrderId && !isAwaitingEmail) {
    return null;
  }

  if (isAwaitingEmail) {
    if (orderKeywords.test(msg)) return "ORDER_ISSUE";
    if (productKeywords.test(msg)) return "PRODUCT_QUERY";
  }

  if (isAwaitingOrderId) {
    if (accountKeywords.test(msg)) return "ACCOUNT_ISSUE";
    if (paymentKeywords.test(msg)) return "PAYMENT_ISSUE";
    if (productKeywords.test(msg)) return "PRODUCT_QUERY";
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
  order_id: string | null,
  customer_id: string | null,
  issue_type: string,
  description: string
): Promise<string> {
  try {
    const supabase = createAdminClient();

    // Get next ticket ID via RPC
    const { data: ticketId, error: seqError } = await supabase
      .rpc("next_service_ticket_id");

    let finalTicketId: string;
    if (seqError || !ticketId) {
      console.warn("[AI Agent] next_service_ticket_id RPC failed, using fallback:", seqError);
      finalTicketId = `TKT${Math.floor(5000 + Math.random() * 5000)}`;
    } else {
      finalTicketId = ticketId;
    }

    // Insert into service_tickets
    await supabase.from("service_tickets").insert({
      ticket_id: finalTicketId,
      order_id: order_id,
      customer_id: customer_id,
      issue_type: "Complaint", // Default to Complaint for auto-generated
      description: description,
      status: "Open",
      priority: "Medium"
    });

    console.log(`[AI Agent] Created service ticket: ${finalTicketId}`);
    return finalTicketId;
  } catch (err) {
    console.error("[AI Agent] Failed to generate ticket from DB:", err);
    return `TKT${Math.floor(5000 + Math.random() * 5000)}`;
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
    const supabase = createAdminClient();
    const { data: callLog } = await supabase
      .from("call_logs")
      .select("preferred_language")
      .eq("id", callLogId)
      .maybeSingle();
    
    const preferredLang = callLog?.preferred_language || "en-US";
    const languageMap: Record<string, string> = {
      "en-US": "English",
      "hi-IN": "Hindi",
      "kn-IN": "Kannada",
      "ta-IN": "Tamil",
      "te-IN": "Telugu"
    };
    const languageName = languageMap[preferredLang] || "English";

    const fullConversation = buildFullConversation(userMessage, conversationHistory);
    
    // 1. Extract existing entities from history
    const state = await extractConversationState(conversationHistory, userMessage, languageName);
    let customerName = state.customerName;
    if (!customerName && callerName && 
        !callerName.includes("Phone Call") && 
        !callerName.includes("Phone Caller") && 
        !callerName.includes("Web Client") && 
        !callerName.includes("Web Chat") && 
        callerName.toLowerCase() !== "customer" && 
        callerName.toLowerCase() !== "unknown") {
      customerName = callerName;
    }
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
        const greetingPrompt = `You are a polite AI assistant for ${COMPANY_NAME} support. 
Greet the customer and ask how they are doing today.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(greetingPrompt, false);
        
        await writeAgentTurn(callLogId, userMessage, reply, null, {
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
      }
      // If we greeted, but haven't asked for name yet
      if (lastAgentMessage.includes("How are you doing today?") || lastAgentMessage.includes("How can I assist you") || lastAgentMessage.includes("How can I help you today")) {
        const namePrompt = `Ask the customer for their name politely.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 1 sentence. Example: "May I know your name please?" in ${languageName}.`;
        const reply = await callLLM(namePrompt, false);

        await writeAgentTurn(callLogId, userMessage, reply, null, {
          sentiment_score: sentimentScore,
          resolution_status: "ACTIVE",
        });
        return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
      }
      // Otherwise, we must ask for name
      const namePrompt = `Ask the customer for their name politely.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 1 sentence.`;
      const reply = await callLLM(namePrompt, false);

      await writeAgentTurn(callLogId, userMessage, reply, null, {
        sentiment_score: sentimentScore,
        resolution_status: "ACTIVE",
      });
      return buildResponse(reply, "ACTIVE", { sentiment_score: sentimentScore, customer_name: null });
    }

    detectedCustomerName = customerName;

    // 4. SIGNAL checks for CALL TERMINATION
    
    // SIGNAL 1, 2, 3 Detection: Goodbye or Resolution Confirmation
    const wasClosingQuestion = lastAgentMessage.includes("Is there anything else I can help you with") || 
                               lastAgentMessage.includes("Is there anything else before I go") ||
                               lastAgentMessage.includes("क्या आपके पास और कोई समस्या है") ||
                               lastAgentMessage.includes("innenu illa");
    
    const isEndingSignal = checkIsEndingMessage(userMessage);

    if (isEndingSignal || (wasClosingQuestion && !userMessage.trim())) {
      responseStatus = "ENDED";
      const goodbyePrompt = `The customer "${customerName}" indicated they want to end the call (SIGNAL 1 or 2).
Write EXACTLY the following message in ${languageName} (use native script):
"Thank you for calling Elanpro support, ${customerName}. I hope your issue has been resolved. Have a great day! Goodbye!"
Keep it under 3 sentences.`;
      
      const reply = await callLLM(goodbyePrompt, false);

      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ENDED",
      });
      return buildResponse(reply, "ENDED", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // Signal 5: Customer Frustration
    if (
      /\b(useless|human|real agent|manager|abusive|angry|annoyed|terrible|worst|बेकार|इंसान|मैनेजर|गुस्सा)\b/i.test(userMessage) || 
      /connect me to/i.test(userMessage) || 
      /want to talk to a person/i.test(userMessage)
    ) {
      responseStatus = "ESCALATED";
      sentimentScore = 0.10;
      const escalatePrompt = `The customer "${customerName}" is frustrated and wants a human (SIGNAL 5).
1. Respond in ${languageName} (native script): "I completely understand your frustration, ${customerName}. Let me connect you to a human agent right away."
2. Then follow with the EXACT goodbye in ${languageName}: "Thank you for calling Elanpro support, ${customerName}. I hope your issue has been resolved. Have a great day! Goodbye!"
Combine into one response under 4 sentences.`;
      const reply = await callLLM(escalatePrompt, false);

      await writeAgentTurn(callLogId, userMessage, reply, customerName, {
        sentiment_score: sentimentScore,
        resolution_status: "ESCALATED",
      });
      return buildResponse(reply, "ESCALATED", {
        sentiment_score: sentimentScore,
        customer_name: customerName,
      });
    }

    // SIGNAL 4: Response to Escalation Question (Unresolvable Issue)
    if (lastAgentMessage.includes("escalating this to our support team") && wasClosingQuestion) {
      responseStatus = "ENDED";
      const goodbyePrompt = `The customer "${customerName}" responded to an escalation notice (SIGNAL 4).
Write EXACTLY the following message in ${languageName} (use native script):
"Thank you for calling Elanpro support, ${customerName}. I hope your issue has been resolved. Have a great day! Goodbye!"`;
      const reply = await callLLM(goodbyePrompt, false);

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
        const orderPrompt = `The customer "${customerName}" wants to discuss an order issue. 
Politely ask them to share their Order ID (starts with 'ORD').
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(orderPrompt, false);

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
        const accountPrompt = `The customer "${customerName}" has an account or payment issue. 
Politely ask them for their registered email address or Customer ID.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(accountPrompt, false);

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
          products = await fetchProductsByQuery(userMessage);
        } catch (err) {
          if (String(err).includes("DB_TIMEOUT")) {
            dbTimeout = true;
          }
          products = [];
        }
        const productContext = products.length > 0 ? JSON.stringify(products, null, 2) : "No products found matching your query.";
        const prompt = `You are a professional expert sales agent for Elanpro (Commercial Refrigeration). 
STRICT INSTRUCTIONS:
1. Use ONLY the product data provided below. Do not use external knowledge.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi). Do NOT use Romanized script.
4. Mention technical specs (Model, Capacity, Temp Range).
5. DO NOT mention prices.
6. Keep it under 4 sentences.
7. CRITICAL: Always end your response by asking if they need help with anything else in ${languageName}. Example: "क्या मैं आपकी किसी और चीज़ में मदद कर सकता हूँ?"

PRODUCT DATABASE:
${productContext}

Customer query: "${userMessage}"`;

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
      const issuePrompt = `The customer just gave their name: "${customerName}". 
Politely thank them and ask how you can help them today.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
      const reply = await callLLM(issuePrompt, false);

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
          responseStatus = "ACTIVE"; // Keep active to hear the response to "anything else"
          const escalatePrompt = `Inform "${customerName}" that you are escalating their issue because a valid Order ID was not provided (SIGNAL 4).
1. Respond in ${languageName} (native script): "I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}."
2. Then ask in ${languageName}: "Is there anything else before I go?"
Combine into one response under 3 sentences.`;
          const reply = await callLLM(escalatePrompt, false);

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
        const retryPrompt = `Inform "${customerName}" that you couldn't find a valid Order ID in their message. 
Politely ask them to check and share it again (starts with 'ORD').
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(retryPrompt, false);

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
            const timeoutPrompt = `Apologize to "${customerName}" that you're having trouble accessing systems (SIGNAL 4).
1. Respond in ${languageName} (native script): "I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}."
2. Then ask in ${languageName}: "Is there anything else before I go?"
Combine into one response under 3 sentences.`;
            const reply = await callLLM(timeoutPrompt, false);

            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: "ORDER_ISSUE",
              order_id: orderId,
              sentiment_score: sentimentScore,
              resolution_status: "ACTIVE", // Keep active to hear response
              db_timeout: true,
            });
            return buildResponse(reply, "ACTIVE", {
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
          responseStatus = "ACTIVE"; // Hear response
          const escalatePrompt = `Inform "${customerName}" that order ${orderId} was not found (SIGNAL 4). 
1. Respond in ${languageName} (native script): "I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}."
2. Then ask in ${languageName}: "Is there anything else before I go?"
Combine into one response under 3 sentences.`;
          const reply = await callLLM(escalatePrompt, false);

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
            ticket_id: ticketId,
          });
        }
        const notFoundRetryPrompt = `Inform "${customerName}" that order ${orderId} was not found. 
Ask them to double-check the Order ID and share it again.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(notFoundRetryPrompt, false);

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
      const ticketContext = tickets.length > 0 ? JSON.stringify(tickets, null, 2) : "No existing service tickets for this order.";

      const prompt = `You are a professional customer support agent for Elanpro (Commercial Refrigeration).
STRICT INSTRUCTIONS:
1. Use ONLY the order and ticket data provided below. Do not use external data.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi). Do NOT use Romanized script.
4. Provide status for delivery, installation, and warranty.
5. If there is an existing service ticket, mention its status.
6. Keep it under 4 sentences.

ORDER DATA:
${orderContext}

SERVICE TICKETS:
${ticketContext}

End by asking if there is anything else you can help with in ${languageName}.`;

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
            const timeoutPrompt = `Apologize to "${customerName}" that you're having trouble accessing systems (SIGNAL 4). 
1. Respond in ${languageName} (native script): "I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}."
2. Then ask in ${languageName}: "Is there anything else before I go?"
Combine into one response under 3 sentences.`;
            const reply = await callLLM(timeoutPrompt, false);

            await writeAgentTurn(callLogId, userMessage, reply, customerName, {
              issue_type: "ACCOUNT_ISSUE",
              customer_id: customerId,
              sentiment_score: sentimentScore,
              resolution_status: "ACTIVE", // Hear response
              db_timeout: true,
            });
            return buildResponse(reply, "ACTIVE", {
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
          responseStatus = "ACTIVE"; // Hear response
          const escalatePrompt = `Inform "${customerName}" that their account was not found (SIGNAL 4). 
1. Respond in ${languageName} (native script): "I'm escalating this to our support team. They will contact you within 24 hours on your registered number. Your ticket ID is ${ticketId}."
2. Then ask in ${languageName}: "Is there anything else before I go?"
Combine into one response under 3 sentences.`;
          const reply = await callLLM(escalatePrompt, false);

          await writeAgentTurn(callLogId, userMessage, reply, customerName, {
            issue_type: "ACCOUNT_ISSUE",
            sentiment_score: sentimentScore,
            resolution_status: "ACTIVE",
          });
          return buildResponse(reply, "ACTIVE", {
            issue_type: "ACCOUNT_ISSUE",
            sentiment_score: sentimentScore,
            customer_name: customerName,
            ticket_id: ticketId,
          });
        }
        const notFoundRetryPrompt = `Inform "${customerName}" that their account information was not found. 
Politely ask them to verify and share their registered email or Customer ID again.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(notFoundRetryPrompt, false);

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

      const prompt = `You are a professional customer support agent for Elanpro (Commercial Refrigeration).
STRICT INSTRUCTIONS:
1. Use ONLY the customer and order data provided below. Do not use external data.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi). Do NOT use Romanized script.
4. Mention their business type and city.
5. Keep it under 4 sentences.

CUSTOMER DATA:
${customerContext}

ORDER DATA:
${ordersContext}

End by asking if there is anything else you can help with in ${languageName}.`;

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
- PRODUCT_QUERY (questions about product specifications, capacity, technical details, or model information)
- SERVICE_REQUEST (wants to raise a ticket, repair, service, complaint, installation, or report a problem with a machine they already have)
- ORDER_ISSUE (order status, late delivery, tracking numbers)
- ACCOUNT_ISSUE (profile, login, customer details)
- OTHER (general conversation, greetings, thank you, goodbye)

Message: "${userMessage}"

Respond with ONLY the classification string.`;

    const classification = (await callLLM(classifyPrompt)).trim().toUpperCase();
    console.log(`[AI Agent] Classified issue as: ${classification}`);
    detectedIssueType = classification;

    if (classification === "PRODUCT_QUERY") {
      let products;
      try {
        products = await fetchProductsByQuery(userMessage);
      } catch (err) {
        if (String(err).includes("DB_TIMEOUT")) {
          dbTimeout = true;
          // Retry once
          try {
            products = await fetchProductsByQuery(userMessage);
          } catch {
            const timeoutPrompt = `Apologize to "${customerName}" that you're having trouble fetching product details.
The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi).
Keep it under 2 sentences.`;
            const reply = await callLLM(timeoutPrompt, false);

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
      const productContext = products.length > 0 ? JSON.stringify(products, null, 2) : "No products found matching your query.";

      const prompt = `You are a professional expert sales agent for Elanpro (Commercial Refrigeration). 
STRICT INSTRUCTIONS:
1. Use ONLY the product data provided below. Do not use external knowledge.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi). Do NOT use Romanized script.
4. Mention technical specs (Model, Capacity, Temp Range).
5. DO NOT mention prices.
6. Keep it under 4 sentences.
7. CRITICAL: Always end your response by asking if they need help with anything else in ${languageName}. Example: "क्या मैं आपकी किसी और चीज़ में मदद कर सकता हूँ?"

PRODUCT DATABASE:
${productContext}

Customer query: "${userMessage}"`;

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

    if (classification === "ORDER_ISSUE" || classification === "SERVICE_REQUEST") {
      if (!orderId) {
        const orderIdPrompt = `The customer "${customerName}" has an order or service issue but hasn't provided an Order ID.
Politely ask them to share their Order ID (starts with 'ORD').
The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi).
Keep it under 2 sentences.`;
        const reply = await callLLM(orderIdPrompt, false);

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
            const timeoutPrompt = `Apologize to "${customerName}" that you're having trouble accessing systems.
Inform them you've escalated the issue with ticket ID ${ticketId}.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
            const reply = await callLLM(timeoutPrompt, false);

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
          const escalatePrompt = `Inform "${customerName}" that order ${orderId} was not found. 
Tell them you are escalating this to the support team with ticket ID ${ticketId}.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
          const reply = await callLLM(escalatePrompt, false);

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
        const retryPrompt = `Inform "${customerName}" that order ${orderId} was not found. 
Ask them to double-check the Order ID and share it again.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(retryPrompt, false);

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
      const ticketContext = tickets.length > 0 ? JSON.stringify(tickets, null, 2) : "No existing service tickets.";

      const prompt = `You are a professional customer support agent for Elanpro (Commercial Refrigeration).
STRICT INSTRUCTIONS:
1. Use ONLY the order and ticket data provided below. Do not use external data.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName}.
4. Provide status for delivery, installation, and warranty.
5. Keep it under 4 sentences.

ORDER DATA:
${orderContext}

SERVICE TICKETS:
${ticketContext}

End by asking if there is anything else you can help with in ${languageName}.`;

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
        const accountPrompt = `The customer "${customerName}" has an account or payment issue but hasn't provided an email or Customer ID.
Politely ask them to share their registered email address or Customer ID.
The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi).
Keep it under 2 sentences.`;
        const reply = await callLLM(accountPrompt, false);

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
            const timeoutPrompt = `Apologize to "${customerName}" that you're having trouble accessing systems.
Inform them you've escalated the issue with ticket ID ${ticketId}.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
            const reply = await callLLM(timeoutPrompt, false);

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
          const escalatePrompt = `Inform "${customerName}" that their account was not found. 
Tell them you are escalating this to the support team with ticket ID ${ticketId}.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
          const reply = await callLLM(escalatePrompt, false);

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
        const retryPrompt = `Inform "${customerName}" that their account was not found. 
Ask them to double-check their registered email address or Customer ID and share it again.
The conversation is in ${languageName}. Respond ONLY in ${languageName}.
Keep it under 2 sentences.`;
        const reply = await callLLM(retryPrompt, false);

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

      const prompt = `You are a professional customer support agent for Elanpro (Commercial Refrigeration).
STRICT INSTRUCTIONS:
1. Use ONLY the customer and order data provided below. Do not use external data.
2. The customer's name is "${customerName}". Address them by name.
3. The conversation is in ${languageName}. Respond ONLY in ${languageName}.
4. Mention their business type and city.
5. Keep it under 4 sentences.

CUSTOMER DATA:
${customerContext}

ORDER DATA:
${ordersContext}

End by asking if there is anything else you can help with in ${languageName}.`;

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
    const prompt = `You are a helpful customer support AI agent named "AI Agent" for Elanpro (Commercial Refrigeration).
The customer's name is "${customerName}". Always address them by name.
The conversation is in ${languageName}. Respond ONLY in ${languageName} using native script (e.g. Devnagari for Hindi). Do NOT use Romanized script.

Customer message: "${userMessage}"

INSTRUCTIONS:
- Respond politely and conversationally.
- Keep response under 3 sentences.
- CRITICAL: Always end your response by asking if they need help with anything else in ${languageName}. Example: "क्या मैं आपकी किसी और चीज़ में मदद कर सकता हूँ?"`;

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
    // Even in error, try to be multilingual if we have the language name
    let reply = "I apologize, but I'm having trouble processing your request right now. Let me transfer you to our team.";
    try {
      const errorPrompt = `Apologize to the customer politely and say you're having technical trouble and will connect them to a human agent.
The conversation is in ${languageName || "English"}. Respond ONLY in ${languageName || "English"}.
Keep it under 2 sentences.`;
      reply = await callLLM(errorPrompt, false);
    } catch (llmErr) {
      console.error("[AI Agent] Fallback error reply failed:", llmErr);
    }
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
