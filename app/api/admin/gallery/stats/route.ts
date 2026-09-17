import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ count: views }, { count: downloads }] = await Promise.all([
    supabase.from("gallery_views").select("id", { count: "exact", head: true }),
    supabase.from("gallery_downloads").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({ views: views ?? 0, downloads: downloads ?? 0 });
}
