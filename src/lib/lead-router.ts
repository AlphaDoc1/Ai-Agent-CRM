// ============================================
// Lead Router — Auto-assign distributors by state
// ============================================
import { createAdminClient } from "@/lib/supabase/server";
import { AIAnalysisResponse, Distributor } from "@/lib/types";

/**
 * Find the best distributor for a given state.
 * Matches by state name (case-insensitive).
 * If no exact match, returns the first available distributor.
 */
export async function findDistributorByState(
  state: string
): Promise<Distributor | null> {
  const supabase = createAdminClient();

  // Try exact state match first
  const { data: exactMatch } = await supabase
    .from("distributors")
    .select("*")
    .ilike("state", state)
    .limit(1)
    .single();

  if (exactMatch) return exactMatch as Distributor;

  // Fallback: first distributor
  const { data: fallback } = await supabase
    .from("distributors")
    .select("*")
    .limit(1)
    .single();

  return (fallback as Distributor) || null;
}

/**
 * Full lead routing pipeline:
 * 1. Find matching distributor
 * 2. Create assignment record
 * 3. Update inquiry status
 * 4. Log activity
 */
export async function routeLead(
  inquiryId: string,
  aiAnalysis: AIAnalysisResponse
): Promise<{ success: boolean; distributorId?: string; error?: string }> {
  const supabase = createAdminClient();

  try {
    // 1. Find distributor
    const distributor = await findDistributorByState(
      aiAnalysis.recommended_distributor || aiAnalysis.state
    );

    if (!distributor) {
      // Update inquiry to escalated if no distributor found
      await supabase
        .from("inquiries")
        .update({ status: "escalated" })
        .eq("id", inquiryId);

      return { success: false, error: "No active distributor found" };
    }

    // 2. Create assignment
    const { error: assignError } = await supabase
      .from("lead_assignments")
      .insert({
        inquiry_id: inquiryId,
        distributor_id: distributor.distributor_id,
        assigned_by: "ai_auto",
        status: "pending",
      });

    if (assignError) throw assignError;

    // 3. Update inquiry
    const { error: updateError } = await supabase
      .from("inquiries")
      .update({
        status: "assigned",
        assigned_distributor: distributor.distributor_id,
        lead_priority: aiAnalysis.lead_priority as
          | "low"
          | "medium"
          | "high"
          | "urgent",
        inquiry_type: aiAnalysis.inquiry_type,
        ai_summary: aiAnalysis.inquiry_summary,
        ai_raw_response: aiAnalysis as unknown as Record<string, unknown>,
      })
      .eq("id", inquiryId);

    if (updateError) throw updateError;

    // 5. Log activity
    await supabase.from("activity_logs").insert({
      entity_type: "assignment",
      entity_id: inquiryId,
      action: "lead_auto_assigned",
      details: {
        distributor_id: distributor.distributor_id,
        distributor_name: distributor.name,
        state: aiAnalysis.state,
        priority: aiAnalysis.lead_priority,
      },
    });

    return { success: true, distributorId: distributor.distributor_id };
  } catch (error) {
    console.error("Lead routing error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown routing error",
    };
  }
}
