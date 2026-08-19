import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET } from "@/lib/gallery";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data: photo, error: fetchError } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (fetchError || !photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  await supabase.storage.from(GALLERY_BUCKET).remove([photo.storage_path]);

  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
