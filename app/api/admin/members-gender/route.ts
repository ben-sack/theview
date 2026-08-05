import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { tallyGender } from "@/lib/estimateGender";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: members, error } = await supabase
    .from("contacts")
    .select("name")
    .eq("status", "approved");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const breakdown = tallyGender((members ?? []).map((m) => m.name));

  return NextResponse.json(breakdown);
}
