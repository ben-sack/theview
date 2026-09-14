import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data: event, error } = await supabase
    .from("events")
    .select("title, date, end_time, city, partners, announcement_blurb")
    .gte("date", new Date().toISOString())
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ event: event ?? null });
}
