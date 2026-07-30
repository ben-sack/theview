import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const DEFAULT_TEMPLATE =
  "You should apply for The View — a members-only night out. {link}";

export async function GET() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "invite_sms_template")
    .single();

  return NextResponse.json({ template: data?.value || DEFAULT_TEMPLATE });
}
