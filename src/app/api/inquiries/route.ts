// ============================================
// API Route: Inquiries (CRUD + AI Processing)
// GET /api/inquiries — List with filters
// POST /api/inquiries — Create + AI analyze + auto-route
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createInquirySchema } from "@/lib/validations";
import { analyzeInquiry } from "@/lib/ai-agent";
import { routeLead } from "@/lib/lead-router";
import { ApiResponse, Inquiry } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    let query = supabase
      .from("inquiries")
      .select("*, priority:lead_priority, assigned_distributor_id:assigned_distributor, distributor:distributors(*)")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("lead_priority", priority);
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,message.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    const response: ApiResponse<Inquiry[]> = {
      success: true,
      data: data as Inquiry[],
    };
    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/inquiries error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch inquiries",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = createInquirySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          data: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const input = validation.data;

    // 1. Create inquiry
    const { data: inquiry, error: createError } = await supabase
      .from("inquiries")
      .insert({
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
        state: input.state || null,
        city: input.city || null,
        message: input.message || null,
        product_interest: input.product_interest || null,
        source: input.source,
        status: "new",
        priority: "medium",
      })
      .select()
      .single();

    if (createError) throw createError;

    // 2. Log activity
    await supabase.from("activity_logs").insert({
      entity_type: "inquiry",
      entity_id: inquiry.id,
      action: "inquiry_created",
      details: { source: input.source, name: input.name },
    });

    // 3. AI Analysis (async — don't block response)
    processInquiryAsync(inquiry.id, input).catch(console.error);

    const response: ApiResponse<Inquiry> = {
      success: true,
      data: inquiry as Inquiry,
      message: "Inquiry created. AI analysis in progress.",
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/inquiries error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to create inquiry",
      },
      { status: 500 }
    );
  }
}

/**
 * Process inquiry with AI and auto-route (runs async).
 */
async function processInquiryAsync(
  inquiryId: string,
  input: {
    name: string;
    phone?: string;
    email?: string;
    state?: string;
    city?: string;
    message?: string;
    product_interest?: string;
  }
) {
  const supabase = createAdminClient();

  try {
    // AI Analysis
    const aiResult = await analyzeInquiry(input);

    // Update inquiry with AI results
    await supabase
      .from("inquiries")
      .update({
        status: "ai_processed",
        ai_summary: aiResult.inquiry_summary,
        ai_raw_response: aiResult as unknown as Record<string, unknown>,
        priority: aiResult.lead_priority,
        inquiry_type: aiResult.inquiry_type,
      })
      .eq("id", inquiryId);

    // Auto-route to distributor
    await routeLead(inquiryId, aiResult);

    // Log AI processing
    await supabase.from("activity_logs").insert({
      entity_type: "inquiry",
      entity_id: inquiryId,
      action: "ai_analysis_complete",
      details: {
        priority: aiResult.lead_priority,
        type: aiResult.inquiry_type,
        summary: aiResult.inquiry_summary,
      },
    });
  } catch (error) {
    console.error("Async inquiry processing failed:", error);

    // Mark as needing manual review
    await supabase
      .from("inquiries")
      .update({ status: "escalated" })
      .eq("id", inquiryId);
  }
}
