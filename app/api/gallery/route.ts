import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { galleryPhotoUrl } from "@/lib/gallery-server";

export async function GET() {
  const { data: photos, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, width, height, created_at, event_id, events(title, date)")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const event = photos && photos.length > 0 ? (photos[0].events as unknown as { title: string; date: string }) : null;

  return NextResponse.json({
    event,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      url: galleryPhotoUrl(p.storage_path),
      width: p.width,
      height: p.height,
    })),
  });
}
