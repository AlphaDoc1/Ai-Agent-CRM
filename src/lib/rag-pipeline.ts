
// ============================================
// RAG Pipeline for Elanpro AI Voice Agent
// ============================================
import { createAdminClient } from "./supabase/server";

// --- Types ---
export type CallIntent =
  | "sales_inquiry"
  | "order_status"
  | "service_request"
  | "product_info"
  | "complaint"
  | "escalation_request"
  | "general";

export interface KnowledgeChunk {
  id: string;
  category: string;
  keywords: string[];
  content: string;
}

// --- Stop Words ---
const STOPWORDS = new Set([
  "the", "a", "an", "is", "for", "what", "how", "does", "can", 
  "i", "you", "me", "my", "please", "tell", "about", "are", "your", 
  "to", "from", "of", "in", "on", "at", "by", "and", "or", "but",
  "ki", "ke", "se", "ka", "koi", "kuch", "aur", "nahi", "ha", "ji"
]);

// --- Cached Knowledge Base ---
let knowledgeBase: KnowledgeChunk[] = [];

// --- 1. Build Static & Category Chunks ---
function buildStaticChunks(): KnowledgeChunk[] {
  const chunks: KnowledgeChunk[] = [];

  // Company Overview
  chunks.push({
    id: "static-company-overview",
    category: "company",
    keywords: ["elanpro", "company", "overview", "founded", "2009", "gurugram", "haryana", "india", "appliances", "professional"],
    content: `Company: Elan Professional Appliances Pvt. Ltd. (Elanpro). Founded: 2009. Headquarters: Gurugram, Haryana, India. Our tagline: "The Commercial Refrigeration Experts".`
  });

  // Company Presence
  chunks.push({
    id: "static-company-presence",
    category: "company",
    keywords: ["presence", "states", "31", "channel", "partners", "700", "service", "250", "products", "200", "warehouses", "mumbai", "bengaluru", "kolkata", "chennai", "gujarat", "international", "nepal", "bhutan"],
    content: `Elanpro's presence: 31+ states in India, 700+ channel partners, 250+ service partners, 200+ products. Warehouses located in: Mumbai, Bengaluru, Kolkata, Chennai, Gujarat. International presence: Nepal, Bhutan.`
  });

  // Contact Info
  chunks.push({
    id: "static-contact-info",
    category: "company",
    keywords: ["contact", "customer", "care", "phone", "+918882302532", "+919625852532", "email", "enquiry@elanpro.net", "enquiry"],
    content: `Customer Care Numbers: +91-88823 02532, +91-96258 52532. Email: enquiry@elanpro.net.`
  });

  // Trusted Customers
  chunks.push({
    id: "static-trusted-customers",
    category: "company",
    keywords: ["trusted", "customers", "marriott", "hilton", "taj", "itc", "hotels", "mcdonalds", "kfc", "dominos", "amul", "coca-cola", "baskin robbins", "blinkit", "zepto", "reliance", "retail"],
    content: `Trusted customers include: Marriott, Hilton, Taj, ITC Hotels, McDonald's, KFC, Domino's, Amul, Coca-Cola, Baskin Robbins, Blinkit, Zepto, Reliance Retail.`
  });

  // Industries & Segments
  chunks.push({
    id: "static-industries-segments",
    category: "company",
    keywords: ["industries", "hospitality", "retail", "pharmaceutical", "segments", "hotels", "restaurants", "cafes", "qsr", "chains", "bars", "resorts", "food retail", "healthcare"],
    content: `Industries served: Hospitality, Retail, Pharmaceutical. Key segments: Hotels, Restaurants, Cafés, QSR Chains, Bars, Resorts, Food Retail, Healthcare.`
  });

  // Technology & Compliance
  chunks.push({
    id: "static-technologies",
    category: "technology",
    keywords: ["technology", "energy", "efficient", "eco-friendly", "refrigerants", "r290", "r600a", "r404a", "r134a", "r407c", "foaming", "ss 201", "ss 304", "ss 430", "haccp", "compliance", "bms", "controllers", "cold room"],
    content: `Technologies used: Cutting edge, energy efficient, eco-friendly refrigerants (R290, R600A, R404A, R134A, R407c), advanced foaming. SS grades: SS201, SS304, SS430 (SS304 is premium). All professional kitchen models are HACCP compliant. Cold rooms have BMS compatible controllers. Standard electrical: 220V, 50Hz, single phase.`
  });

  // All Product Categories (CAT001 to CAT014)
  const productCategories = [
    { id: "CAT001", name: "Professional Kitchen", tagline: "Trusted by Chefs", subcategories: ["Reach-In Premium", "Undercounter Premium", "Free Standing Cooler/Freezer", "Saladette Counter", "Blast Chiller & Freezer", "Reach-In & Undercounter Frost Free Classic", "Reach-In & Undercounter Static"] },
    { id: "CAT002", name: "Bar Refrigeration", tagline: "Trusted by Bartenders", subcategories: ["Wine Chillers", "Back Bars", "Undercounter Bars", "Beer & Beverages"] },
    { id: "CAT003", name: "Confectionery Showcase", tagline: "Trusted by Bakers", subcategories: ["Platinum", "Classic", "Counter Top"] },
    { id: "CAT004", name: "Ice Machine", tagline: "Trusted by Bars & Clinics", subcategories: [] },
    { id: "CAT005", name: "Beverage Solution", tagline: "Trusted by Indian Customers", subcategories: ["Juice Dispenser", "Slush Dispenser", "Softy Machine"] },
    { id: "CAT006", name: "Mini Bar & Mini Fridge", tagline: "Trusted by Hoteliers", subcategories: ["Mini Bar", "Mini Fridge"] },
    { id: "CAT007", name: "Retail Solution", tagline: "Trusted by Retailers", subcategories: ["Special Products & Milk Cooler", "Premium Series Flat & Curve Glass Top", "Premium Series Hard Top", "Upright Showcase Chiller", "Upright Showcase Freezer"] },
    { id: "CAT008", name: "Scooping Parlour", tagline: "Scoop Happiness Serve Freshness", subcategories: [] },
    { id: "CAT009", name: "Supermarket", tagline: "", subcategories: [] },
    { id: "CAT010", name: "Water Dispenser", tagline: "Har Boond Mein Bharosa", subcategories: [] },
    { id: "CAT011", name: "Water Cooler", tagline: "Sip Smart Hydrate Smart", subcategories: [] },
    { id: "CAT012", name: "Pharma", tagline: "", subcategories: ["Blood Bank", "Vaccine", "Ultra Low Freezer", "-86°C", "-40°C"] },
    { id: "CAT013", name: "Cold Room", tagline: "For All Your Cold Solutions", subcategories: ["iCold", "Chiller", "Freezer", "Walk-in"] },
    { id: "CAT014", name: "Vending Machine", tagline: "India's First UPI Based Vending Machine", subcategories: ["Wendor", "Galaxy", "Nova", "Frozone", "Apollo", "Orion"] }
  ];

  productCategories.forEach((cat) => {
    chunks.push({
      id: `category-${cat.id}`,
      category: "product-category",
      keywords: [cat.id, cat.name.toLowerCase(), ...cat.subcategories.map((s: string) => s.toLowerCase()), ...cat.tagline.toLowerCase().split(" ").filter((w: string) => w.length > 2)],
      content: `Product category: ${cat.name}. ${cat.tagline ? `Tagline: ${cat.tagline}` : ""} ${cat.subcategories.length > 0 ? `Subcategories: ${cat.subcategories.join(", ")}` : ""}`
    });
  });

  return chunks;
}

// --- 2. Build Live Product Chunks from Supabase ---
async function buildProductChunks(): Promise<KnowledgeChunk[]> {
  const chunks: KnowledgeChunk[] = [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("products").select("*");

    if (error) {
      console.error("[RAG] Failed to fetch products from DB:", error.message);
      return [];
    }

    data?.forEach((product: any) => {
      const model = product.model || "";
      const description = product.description || "";
      const categoryName = product.category_name || "";
      const subcategory = product.subcategory || "";
      const tempRange = product.temperature_range_c || "";
      const capacity = product.capacity_ltr || "";
      const refrigerant = product.refrigerant || "";
      const keyFeatures = Array.isArray(product.key_features) ? product.key_features.join(", ") : "";

      const content = `The ${model} is a ${description} in the ${categoryName} category. Temperature range: ${tempRange}. Capacity: ${capacity}L. Key features include: ${keyFeatures}. Refrigerant: ${refrigerant}.`;
      
      const keywords = [
        model.toLowerCase(),
        categoryName.toLowerCase(),
        subcategory.toLowerCase(),
        refrigerant.toLowerCase(),
        ...description.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2)
      ].filter(Boolean);

      chunks.push({
        id: `product-${product.product_id}`,
        category: "product",
        keywords,
        content
      });
    });
  } catch (err) {
    console.error("[RAG] Exception fetching product chunks:", err);
  }
  return chunks;
}

// --- 3. Build All Knowledge Chunks ---
export async function buildKnowledgeChunks(): Promise<KnowledgeChunk[]> {
  const staticChunks = buildStaticChunks();
  const productChunks = await buildProductChunks();
  return [...staticChunks, ...productChunks];
}

// --- 4. Retrieve Context ---
export function retrieveContext(query: string, topK: number = 4): string {
  // Tokenize query
  const queryTokens = query.toLowerCase().split(/[\s,.;!?]+/).filter(t => t.length > 1 && !STOPWORDS.has(t));

  if (knowledgeBase.length === 0) {
    console.warn("[RAG] Knowledge base is empty! Returning static company info.");
    const staticChunks = buildStaticChunks();
    return staticChunks.slice(0, 2).map(c => c.content).join("\n\n");
  }

  // Score chunks
  const scored = knowledgeBase.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();

    // Keyword matches
    queryTokens.forEach(token => {
      if (chunk.keywords.includes(token)) score += 1;
      if (contentLower.includes(token)) score += 0.5;
    });

    return { chunk, score };
  }).sort((a, b) => b.score - a.score);

  const topChunks = scored.slice(0, topK).map(s => s.chunk);
  
  // If no good matches, return static company overview & contact
  if (topChunks.length === 0 || scored[0]?.score === 0) {
    const staticChunks = buildStaticChunks();
    return staticChunks.filter(c => c.id === "static-company-overview" || c.id === "static-contact-info")
      .map(c => c.content).join("\n\n");
  }

  return topChunks.map(c => `--- ${c.category.toUpperCase()} ---\n${c.content}`).join("\n\n");
}

// --- 5. Intent Detection ---
export function detectIntent(transcript: string): CallIntent {
  const text = transcript.toLowerCase();

  // Keyword maps
  const intentKeywords: Record<string, string[]> = {
    sales_inquiry: ["buy", "purchase", "price", "cost", "quote", "order", "interested", "need", "want", "kitne", "kaise", "le sakta", "khareedna"],
    order_status: ["order", "delivery", "status", "track", "when", "dispatch", "shipment", "arrived", "kab", "status kya hai", "order kab aayega"],
    service_request: ["repair", "broken", "not working", "service", "technician", "amc", "warranty", "install", "installation", "kharaab", "nahi chal raha", "service engineer"],
    product_info: ["what", "which", "specs", "features", "capacity", "temperature", "refrigerant", "tell me about", "kya hai", "kaunsa", "specification"],
    complaint: ["bad", "worst", "issue", "problem", "complaint", "unhappy", "disappointed", "wrong", "galat", "kharaab", "masla", "problem hai"],
    escalation_request: ["supervisor", "manager", "human", "person", "speak to someone", "transfer", "manager se baat", "insaan se baat"]
  };

  for (const [intent, keywords] of Object.entries(intentKeywords)) {
    if (keywords.some(k => text.includes(k))) {
      return intent as CallIntent;
    }
  }

  return "general";
}

// --- 6. Language Detection ---
export function detectLanguage(text: string): "hindi" | "english" {
  // Check for Devanagari characters (Hindi/Marathi etc.)
  const devanagariRegex = /[\u0900-\u097F]/;
  return devanagariRegex.test(text) ? "hindi" : "english";
}

// --- 7. Refresh Knowledge Base ---
export async function refreshKnowledgeBase() {
  console.log("[RAG] Refreshing knowledge base...");
  knowledgeBase = await buildKnowledgeChunks();
  console.log(`[RAG] Knowledge base refreshed. Total chunks: ${knowledgeBase.length}`);
}

// --- Initialize on Module Load ---
(async () => {
  console.log("[RAG] Initializing knowledge base on module load...");
  knowledgeBase = await buildKnowledgeChunks();
  console.log(`[RAG] Knowledge base initialized. Total chunks: ${knowledgeBase.length}`);
})();
