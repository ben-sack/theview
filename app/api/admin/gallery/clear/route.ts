import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET } from "@/lib/gallery";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: photos, error: fetchError } = await supabase
    .from("gallery_photos")
    .select("storage_path");

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (photos && photos.length > 0) {
    await supabase.storage.from(GALLERY_BUCKET).remove(photos.map((p) => p.storage_path));
  }

  const { error } = await supabase.from("gallery_photos").delete().not("id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
