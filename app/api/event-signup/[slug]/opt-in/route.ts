import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { verifyOptInToken } from "@/lib/optInToken";

// Lets someone who just submitted a signup with "No thanks" on texts change
// their mind from the confirmation screen.
export async function POST(req: NextRequest) {
  const { contact_id, token } = await req.json().catch(() => ({}));

  if (typeof contact_id !== "string" || !verifyOptInToken(contact_id, token)) {
    return NextResponse.json({ error: "This link has expired. Please submit the form again." }, { status: 403 });
  }

  // Only undoes a form decline — never a STOP reply or carrier block.
  const { data, error } = await supabase
    .from("contacts")
    .update({ sms_opted_out: false, sms_opt_out_source: null })
    .eq("id", contact_id)
    .eq("sms_opt_out_source", "signup")
    .select("id");

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "We couldn't update your text preference." }, { status: 409 });
  }

  return NextResponse.json({ success: true });
}
