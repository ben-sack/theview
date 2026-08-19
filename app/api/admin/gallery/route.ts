import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET, GALLERY_MAX_PHOTOS } from "@/lib/gallery";
import { galleryPhotoUrl } from "@/lib/gallery-server";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: photos, error } = await supabase
    .from("gallery_photos")
    .select("id, storage_path, width, height, created_at, event_id")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      url: galleryPhotoUrl(p.storage_path),
      width: p.width,
      height: p.height,
      event_id: p.event_id,
    })),
  });
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const eventId = form.get("event_id");
  const width = Number(form.get("width"));
  const height = Number(form.get("height"));

  if (!(file instanceof Blob) || !eventId || !width || !height) {
    return NextResponse.json({ error: "Missing file, event_id, width, or height." }, { status: 400 });
  }

  const { count } = await supabase
    .from("gallery_photos")
    .select("id", { count: "exact", head: true });

  if ((count ?? 0) >= GALLERY_MAX_PHOTOS) {
    return NextResponse.json({ error: `Gallery is at its ${GALLERY_MAX_PHOTOS}-photo cap. Clear it before adding more.` }, { status: 400 });
  }

  const path = `${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, { contentType: "image/jpeg" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("gallery_photos")
    .insert([{ event_id: eventId, storage_path: path, width, height }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ photo: { id: data.id, url: galleryPhotoUrl(path), width, height } });
}
