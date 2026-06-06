import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from("call_analysis")
      .select("*, call_logs(created_at, transcript, caller_name, caller_phone, duration_seconds)")
      .order("updated_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error("[Call Analysis API] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch call analysis" }, { status: 500 });
  }
}
