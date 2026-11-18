import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const consentTimestamp = new Date();

    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        gpsConsentAcceptedAt: consentTimestamp,
      },
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "User",
      entityId: auth.userId,
      action: "DPDP_ACT_2023_GPS_CONSENT_ACCEPTED",
      oldValueJson: { gpsConsentAcceptedAt: null },
      newValueJson: {
        gpsConsentAcceptedAt: consentTimestamp.toISOString(),
        legislativeStandard: "DPDP_ACT_2023_WORK_HOURS_ONLY",
      },
    });

    return NextResponse.json({
      success: true,
      message: "DPDP Act 2023 Work-Hours GPS & KYC Consent recorded successfully.",
      gpsConsentAcceptedAt: consentTimestamp.toISOString(),
    });
  } catch (error: unknown) {
    console.error("GPS Consent recording error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
