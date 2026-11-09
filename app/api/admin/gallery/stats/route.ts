import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [{ count: views }, { count: downloads }, { data: tracked }] = await Promise.all([
    supabase.from("gallery_views").select("id", { count: "exact", head: true }),
    supabase.from("gallery_downloads").select("id", { count: "exact", head: true }),
    supabase.from("gallery_downloads").select("visitor_id").not("visitor_id", "is", null).range(0, 99999),
  ]);

  const total = downloads ?? 0;
  const trackedRows = tracked ?? [];
  return NextResponse.json({
    views: views ?? 0,
    downloads: total,
    downloaders: new Set(trackedRows.map((d) => d.visitor_id)).size,
    untrackedDownloads: Math.max(0, total - trackedRows.length),
  });
}
