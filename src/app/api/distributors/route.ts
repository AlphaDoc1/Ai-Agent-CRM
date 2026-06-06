// ============================================
// API Route: Distributors (CRUD)
// GET /api/distributors — List all
// POST /api/distributors — Create
// ============================================
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createDistributorSchema } from "@/lib/validations";
import { ApiResponse, Distributor } from "@/lib/types";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("distributors")
      .select("*")
      .order("name", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data,
    } as ApiResponse<Distributor[]>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch distributors",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = createDistributorSchema.safeParse(body);
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

    // Generate a distributor_id (e.g., DST_12345)
    const distributorId = `DST_${Math.floor(10000 + Math.random() * 90000)}`;

    const { data, error } = await supabase
      .from("distributors")
      .insert({
        distributor_id: distributorId,
        name: input.name,
        state: input.state,
        region: input.region || null,
        city: input.city || null,
        phone: input.phone,
        email: input.email,
        address: input.address || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await supabase.from("activity_logs").insert({
      entity_type: "distributor",
      entity_id: data.distributor_id,
      action: "distributor_created",
      details: { name: input.name, state: input.state },
    });

    return NextResponse.json(
      { success: true, data } as ApiResponse<Distributor>,
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to create distributor",
      },
      { status: 500 }
    );
  }
}
