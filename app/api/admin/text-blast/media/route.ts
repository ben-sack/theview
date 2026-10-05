import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { GALLERY_BUCKET } from "@/lib/gallery";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Twilio's MMS cap is 5 MB for the whole message; the admin UI resizes photos
// to a compressed JPEG well under this before uploading.
const MAX_BYTES = 5 * 1024 * 1024;

// Stores a text-blast photo where Twilio can fetch it. Reuses the public
// gallery bucket under an "mms/" prefix — gallery listing and "clear" only
// touch paths recorded in gallery_photos, so these files never show up there.
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is over Twilio's 5 MB limit." }, { status: 400 });
  }

  const path = `mms/${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage
    .from(GALLERY_BUCKET)
    .upload(path, file, { contentType: "image/jpeg" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const url = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}
