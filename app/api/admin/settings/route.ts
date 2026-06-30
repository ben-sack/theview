import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { data } = await supabase.from("settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of data ?? []) settings[row.key] = row.value;

  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  if (!isAuthed(req)) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "Key required." }, { status: 400 });

  await supabase
    .from("settings")
    .upsert({ key, value }, { onConflict: "key" });

  return NextResponse.json({ success: true });
}
