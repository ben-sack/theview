import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET } from "@/lib/gallery";
import { watermarkPhoto } from "@/lib/watermark-server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: photo, error } = await supabase
    .from("gallery_photos")
    .select("storage_path")
    .eq("id", id)
    .single();

  if (error || !photo) {
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .download(photo.storage_path);

  if (downloadError || !file) {
    return NextResponse.json({ error: "Could not load photo." }, { status: 500 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const watermarked = await watermarkPhoto(buffer);

  return new NextResponse(new Uint8Array(watermarked), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="the-view-photo.jpg"`,
    },
  });
}
