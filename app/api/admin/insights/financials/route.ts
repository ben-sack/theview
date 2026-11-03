import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function isAuthed(req: NextRequest) {
  return req.cookies.get("admin_auth")?.value === "true";
}

function toAmount(v: unknown): number | null {
  if (v === "" || v == null) return null;
  const n = Number(String(v).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : NaN;
}

// Saves one event's money numbers (typed in after the night).
export async function POST(req: NextRequest) {
  if (!isAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  const { event_id, bar_revenue, other_revenue, expenses } = await req.json().catch(() => ({}));
  if (!event_id) return NextResponse.json({ error: "Event is required." }, { status: 400 });

  const update = {
    bar_revenue: toAmount(bar_revenue),
    other_revenue: toAmount(other_revenue),
    expenses: toAmount(expenses),
  };
  if (Object.values(update).some((v) => Number.isNaN(v))) {
    return NextResponse.json({ error: "Amounts must be numbers." }, { status: 400 });
  }

  const { error } = await supabase.from("events").update(update).eq("id", event_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
