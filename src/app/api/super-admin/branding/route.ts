import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { updatePlatformBrandingConfig, DEFAULT_BRANDING_CONFIG } from "@/lib/branding";

const BrandingSchema = z.object({
  platformName: z.string().min(1).max(50).optional(),
  badgeText: z.string().min(1).max(20).optional(),
  tagline: z.string().max(150).optional(),
  supportEmail: z.string().email().optional(),
  footerCopyright: z.string().max(200).optional(),
  useDynamicOrbitalSvg: z.boolean().optional(),
  logoLightUrl: z.string().nullable().optional(),
  logoDarkUrl: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  commandBgHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  primaryColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  surfaceBgHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  coldBadgeHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  warmBadgeHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  hotBadgeHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  headingFontFamily: z.string().optional(),
  monoFontFamily: z.string().optional(),
  allowTenantPdfLogo: z.boolean().optional(),
  showPoweredByFooter: z.boolean().optional(),
  isReset: z.boolean().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const session = await getSuperAdminFromCookie(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized Super Admin session." }, { status: 401 });
    }

    const body = await req.json();
    const validated = BrandingSchema.parse(body);

    if (validated.isReset) {
      const reset = await updatePlatformBrandingConfig(DEFAULT_BRANDING_CONFIG);
      return NextResponse.json({
        success: true,
        message: "Platform branding reset to default Orbital Enterprise theme.",
        branding: reset,
      });
    }

    const { isReset, ...updateData } = validated;
    const updated = await updatePlatformBrandingConfig(updateData);

    return NextResponse.json({
      success: true,
      message: "Branding and theme configuration updated globally.",
      branding: updated,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
