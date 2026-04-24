import { NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD ?? "theview";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("theview_auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: "/",
  });
  return response;
}
