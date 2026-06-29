import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  await supabase.from("contacts").select("id").limit(1);
  return NextResponse.json({ ok: true });
}
