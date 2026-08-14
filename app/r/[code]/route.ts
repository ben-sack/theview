import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data } = await supabase
    .from("short_links")
    .select("event_id, contact_id")
    .eq("code", code)
    .single();

  if (!data) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.redirect(new URL(`/rsvp/${data.event_id}?c=${data.contact_id}`, req.url));
}
