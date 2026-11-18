import { NextResponse } from "next/server";
import { getPlatformBrandingConfig } from "@/lib/branding";

export async function GET() {
  try {
    const branding = await getPlatformBrandingConfig();
    return NextResponse.json({ success: true, branding });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
