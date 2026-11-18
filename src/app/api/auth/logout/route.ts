import { NextResponse } from "next/server";
import { TENANT_COOKIE_NAME } from "@/lib/tenant-auth";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully." });
  res.cookies.set({
    name: TENANT_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
