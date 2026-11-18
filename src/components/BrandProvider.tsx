"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { PlatformBranding, DEFAULT_BRANDING_CONFIG } from "@/lib/branding";

interface BrandContextType {
  branding: PlatformBranding;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const BrandContext = createContext<BrandContextType>({
  branding: DEFAULT_BRANDING_CONFIG,
  loading: true,
  refreshBranding: async () => {},
});

export function useBrand() {
  return useContext(BrandContext);
}

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<PlatformBranding>(DEFAULT_BRANDING_CONFIG);
  const [loading, setLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res = await fetch("/api/branding");
      const data = await res.json();
      if (data.success && data.branding) {
        setBranding(data.branding);
        applyThemeTokens(data.branding);
      }
    } catch (err) {
      console.warn("Failed to load branding, using defaults", err);
      applyThemeTokens(DEFAULT_BRANDING_CONFIG);
    } finally {
      setLoading(false);
    }
  };

  const applyThemeTokens = (config: PlatformBranding) => {
    if (typeof document === "undefined") return;

    const root = document.documentElement;
    root.style.setProperty("--brand-command-bg", config.commandBgHex);
    root.style.setProperty("--brand-primary", config.primaryColorHex);
    root.style.setProperty("--brand-accent", config.accentColorHex);
    root.style.setProperty("--brand-surface", config.surfaceBgHex);
    root.style.setProperty("--brand-cold", config.coldBadgeHex);
    root.style.setProperty("--brand-warm", config.warmBadgeHex);
    root.style.setProperty("--brand-hot", config.hotBadgeHex);
    root.style.setProperty("--font-heading", `"${config.headingFontFamily}", sans-serif`);
    root.style.setProperty("--font-mono", `"${config.monoFontFamily}", monospace`);

    // Dynamically update favicon if configured
    if (config.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = config.faviconUrl;
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandContext.Provider>
  );
}
