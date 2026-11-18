"use client";

import React from "react";
import { useBrand } from "./BrandProvider";

export interface BrandLogoProps {
  variant?: "dark" | "light"; // dark = for dark backgrounds (white text), light = for light backgrounds (dark text)
  size?: "sm" | "md" | "lg" | "xl";
  showBadge?: boolean;
  showTagline?: boolean;
  className?: string;
}

export function BrandLogo({
  variant = "dark",
  size = "md",
  showBadge = true,
  showTagline = false,
  className = "",
}: BrandLogoProps) {
  const { branding, loading } = useBrand();

  const isDark = variant === "dark";
  const textColor = isDark ? "text-white" : "text-slate-900";
  const taglineColor = isDark ? "text-slate-400" : "text-slate-500";

  // Size mappings
  const dimensions = {
    sm: { icon: 24, font: "text-sm", badge: "text-[9px] px-1.5 py-0.2", tag: "text-[10px]" },
    md: { icon: 32, font: "text-base", badge: "text-[10px] px-1.5 py-0.5", tag: "text-xs" },
    lg: { icon: 40, font: "text-xl", badge: "text-xs px-2 py-0.5", tag: "text-xs" },
    xl: { icon: 48, font: "text-2xl", badge: "text-xs px-2.5 py-0.5", tag: "text-sm" },
  }[size];

  const primary = branding.primaryColorHex || "#2563EB";
  const accent = branding.accentColorHex || "#10B981";
  const initial = branding.platformName ? branding.platformName.charAt(0).toUpperCase() : "K";

  const customLogoUrl = isDark ? branding.logoDarkUrl : branding.logoLightUrl;

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      {/* Logo Mark */}
      {!branding.useDynamicOrbitalSvg && customLogoUrl ? (
        <img
          src={customLogoUrl}
          alt={branding.platformName}
          style={{ width: dimensions.icon, height: dimensions.icon }}
          className="object-contain"
        />
      ) : (
        <div
          className="relative flex items-center justify-center shrink-0"
          style={{ width: dimensions.icon, height: dimensions.icon }}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full drop-shadow-sm select-none"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer Orbital Ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              stroke={primary}
              strokeWidth="2.5"
              strokeDasharray="6 4"
              opacity="0.6"
            />
            {/* Inner Orbital Ring */}
            <circle
              cx="50"
              cy="50"
              r="34"
              stroke={accent}
              strokeWidth="2"
              opacity="0.85"
            />
            {/* Core Glow Center */}
            <circle
              cx="50"
              cy="50"
              r="24"
              fill={primary}
              fillOpacity={isDark ? "0.2" : "0.1"}
            />
            {/* Hierarchy Orbital Nodes */}
            <circle cx="50" cy="6" r="4.5" fill={accent} />
            <circle cx="86" cy="50" r="3.5" fill={primary} />
            <circle cx="26" cy="74" r="3" fill={accent} />
            {/* Core Glyph */}
            <text
              x="50"
              y="58"
              textAnchor="middle"
              fill={isDark ? "#FFFFFF" : primary}
              fontSize="28"
              fontWeight="900"
              fontFamily="system-ui, -apple-system, sans-serif"
            >
              {initial}
            </text>
          </svg>
        </div>
      )}

      {/* Brand Name & Badges */}
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2">
          <span
            className={`font-black tracking-tight ${dimensions.font} ${textColor}`}
            style={{ fontFamily: branding.headingFontFamily ? `"${branding.headingFontFamily}", sans-serif` : undefined }}
          >
            {branding.platformName}
          </span>
          {showBadge && branding.badgeText && (
            <span
              className={`rounded-md font-mono font-bold tracking-wider uppercase border border-current/20 ${dimensions.badge}`}
              style={{
                backgroundColor: `${primary}18`,
                color: primary,
              }}
            >
              {branding.badgeText}
            </span>
          )}
        </div>
        {showTagline && branding.tagline && (
          <span className={`${dimensions.tag} ${taglineColor} tracking-normal font-medium mt-0.5`}>
            {branding.tagline}
          </span>
        )}
      </div>
    </div>
  );
}
