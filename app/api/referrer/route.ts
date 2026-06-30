import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ name: null });

  const { data } = await supabase
    .from("contacts")
    .select("name")
    .eq("id", id)
    .single();

  const firstName = data?.name?.split(" ")[0] ?? null;
  return NextResponse.json({ name: firstName });
}
