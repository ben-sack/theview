import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { resolveGender, tallyResolvedGender } from "@/lib/estimateGender";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

export async function GET(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: rows, error } = await supabase
    .from("contacts")
    .select("id, name, gender_override")
    .eq("status", "approved")
    .range(0, 9999);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const members = (rows ?? [])
    .map((c) => ({
      id: c.id,
      name: c.name,
      gender: resolveGender(c.name, c.gender_override),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const counts = tallyResolvedGender(rows ?? []);

  return NextResponse.json({ counts, members });
}
