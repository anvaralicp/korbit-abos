import { NextResponse } from "next/server";
import { SA_COOKIE_NAME } from "@/lib/super-admin-auth";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out" });
  res.cookies.set({
    name: SA_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return res;
}
