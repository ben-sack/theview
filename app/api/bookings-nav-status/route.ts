import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "bookings_nav_enabled")
    .single();

  return NextResponse.json({ enabled: data?.value === "true" });
}
