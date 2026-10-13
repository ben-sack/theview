import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { isValidMediaUrl } from "@/lib/blastMedia";
import { slugify } from "@/lib/eventSignup";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Saves an event's public signup page settings (on/off, link, flyer, copy).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { signup_enabled, signup_slug, signup_flyer_url, signup_headline, signup_copy } = await req.json().catch(() => ({}));

  const slug = slugify(String(signup_slug ?? ""));
  if (!slug) {
    return NextResponse.json({ error: "Link name can't be empty." }, { status: 400 });
  }
  if (!isValidMediaUrl(signup_flyer_url)) {
    return NextResponse.json({ error: "Invalid flyer image." }, { status: 400 });
  }

  const { error } = await supabase
    .from("events")
    .update({
      signup_enabled: !!signup_enabled,
      signup_slug: slug,
      signup_flyer_url: signup_flyer_url || null,
      signup_headline: signup_headline?.trim() || null,
      signup_copy: signup_copy?.trim() || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Another event already uses that link name." }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, signup_slug: slug });
}
