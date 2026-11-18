import { prisma } from "@/lib/prisma";

export interface PlatformBranding {
  id: string;
  platformName: string;
  badgeText: string;
  tagline: string;
  supportEmail: string;
  footerCopyright: string;
  useDynamicOrbitalSvg: boolean;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  commandBgHex: string;
  primaryColorHex: string;
  accentColorHex: string;
  surfaceBgHex: string;
  coldBadgeHex: string;
  warmBadgeHex: string;
  hotBadgeHex: string;
  headingFontFamily: string;
  monoFontFamily: string;
  allowTenantPdfLogo: boolean;
  showPoweredByFooter: boolean;
  updatedAt?: string | Date;
}

export const DEFAULT_BRANDING_CONFIG: PlatformBranding = {
  id: "default_platform_brand",
  platformName: "KORBIT",
  badgeText: "ABOS",
  tagline: "The Autonomous Business Operating System",
  supportEmail: "support@korbit.in",
  footerCopyright: "© 2026 KORBIT ABOS Technologies. All rights reserved.",
  useDynamicOrbitalSvg: true,
  logoLightUrl: null,
  logoDarkUrl: null,
  faviconUrl: null,
  commandBgHex: "#0B1120",
  primaryColorHex: "#2563EB",
  accentColorHex: "#10B981",
  surfaceBgHex: "#F8FAFC",
  coldBadgeHex: "#3B82F6",
  warmBadgeHex: "#F59E0B",
  hotBadgeHex: "#EF4444",
  headingFontFamily: "Plus Jakarta Sans",
  monoFontFamily: "JetBrains Mono",
  allowTenantPdfLogo: true,
  showPoweredByFooter: true,
};

export async function getPlatformBrandingConfig(): Promise<PlatformBranding> {
  try {
    const config = await prisma.platformBrandingConfig.findUnique({
      where: { id: "default_platform_brand" },
    });

    if (config) {
      return config as PlatformBranding;
    }

    // Auto-create default if not exists
    const created = await prisma.platformBrandingConfig.create({
      data: DEFAULT_BRANDING_CONFIG,
    });
    return created as PlatformBranding;
  } catch (err) {
    console.warn("Could not query PlatformBrandingConfig, using fallback:", err);
    return DEFAULT_BRANDING_CONFIG;
  }
}

export async function updatePlatformBrandingConfig(
  data: Partial<Omit<PlatformBranding, "id">>
): Promise<PlatformBranding> {
  const updated = await prisma.platformBrandingConfig.upsert({
    where: { id: "default_platform_brand" },
    update: data,
    create: {
      ...DEFAULT_BRANDING_CONFIG,
      ...data,
      id: "default_platform_brand",
    },
  });

  return updated as PlatformBranding;
}
