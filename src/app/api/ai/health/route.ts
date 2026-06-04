// ============================================
// API Route: AI Health Check
// GET /api/ai/health
// ============================================
import { NextResponse } from "next/server";
import { checkOllamaHealth } from "@/lib/ai-agent";

export async function GET() {
  const hasGroq = !!process.env.GROQ_API_KEY;
  const health = await checkOllamaHealth();
  
  // Healthy if Groq Cloud is configured OR local Ollama is running
  const available = hasGroq || health.available;

  return NextResponse.json({
    success: available,
    data: {
      available,
      isCloud: hasGroq,
      localOllama: health,
    },
  });
}
