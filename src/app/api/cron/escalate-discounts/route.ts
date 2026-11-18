import { NextRequest, NextResponse } from "next/server";
import { escalateExpiredDiscountRequests } from "@/lib/discount-escalation";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { getTenantSessionFromCookie } from "@/lib/tenant-auth";

/**
 * GET or POST /api/cron/escalate-discounts
 * Autonomous background SLA monitor.
 * Scans all PENDING discount requests whose SLA has expired and auto-escalates them up the DLD chain.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tenantId = searchParams.get("tenantId") || undefined;
    const authHeader = req.headers.get("authorization");
    const querySecret = searchParams.get("secret");

    // Optional Production CRON_SECRET Guard: allow bearer token, query param, Vercel cron header, or authenticated Admin / Super Admin
    if (process.env.CRON_SECRET) {
      const isValidBearer = authHeader === `Bearer ${process.env.CRON_SECRET}`;
      const isValidQuery = querySecret === process.env.CRON_SECRET;
      const isVercelCron = Boolean(req.headers.get("x-vercel-cron"));
      const superAdmin = await getSuperAdminFromCookie(req);
      const tenantSession = await getTenantSessionFromCookie(req);
      const isAuthorizedSession = Boolean(superAdmin || (tenantSession && tenantSession.layerDepth <= 2));

      if (!isValidBearer && !isValidQuery && !isVercelCron && !isAuthorizedSession) {
        return NextResponse.json({ error: "Unauthorized cron execution" }, { status: 401 });
      }
    }

    const escalated = await escalateExpiredDiscountRequests(tenantId);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      escalatedCount: escalated.length,
      escalatedRequests: escalated.map((r) => ({
        id: r.id,
        dealId: r.dealId,
        newLevel: r.currentApprovalLevel,
        newApproverId: r.currentApproverId,
        newSlaExpiresAt: r.slaExpiresAt,
      })),
    });
  } catch (err: any) {
    console.error("Cron escalate-discounts error:", err);
    return NextResponse.json({ error: err.message || "Failed to execute auto-escalation cron" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
