import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

// Marks every text from one phone number as read (when its conversation is opened).
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { phone } = await req.json().catch(() => ({}));
  if (!phone) return NextResponse.json({ error: "Phone is required." }, { status: 400 });

  const { error } = await supabase
    .from("inbound_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("from_phone", phone)
    .is("read_at", null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
