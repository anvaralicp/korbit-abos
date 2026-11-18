import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { reviewClientCorrectionRequest } from "@/lib/security-guards";
import { RoleLevel, CorrectionStatus } from "@prisma/client";

const ReviewCorrectionSchema = z.object({
  requestId: z.string().min(1, "Request ID is required"),
  approved: z.boolean(),
  adminNotes: z.string().optional(),
});

/**
 * GET /api/clients/corrections
 * View pending or completed ClientCorrectionRequest entries.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") as CorrectionStatus | null;

    const where: any = {
      tenantId: auth.tenantId,
    };

    if (status) {
      where.status = status;
    }

    // If caller is not Admin, only show their own submitted correction requests
    if (auth.roleLevel !== RoleLevel.LAYER_01_ADMIN) {
      where.requestedById = auth.userId;
    }

    const requests = await prisma.clientCorrectionRequest.findMany({
      where,
      include: {
        client: {
          select: { id: true, clientCode: true, companyName: true, isLocked: true },
        },
        requestedBy: {
          select: { id: true, fullName: true, employeeCode: true, designation: true },
        },
        reviewedByAdmin: {
          select: { id: true, fullName: true, employeeCode: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, requests });
  } catch (err: any) {
    console.error("GET /api/clients/corrections error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch correction requests" }, { status: 500 });
  }
}

/**
 * POST /api/clients/corrections
 * Strictly LAYER_01_ADMIN endpoint to approve or reject a correction request.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    if (auth.roleLevel !== RoleLevel.LAYER_01_ADMIN) {
      return NextResponse.json(
        { error: "Forbidden: Only LAYER_01_ADMIN can review and apply client correction requests." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = ReviewCorrectionSchema.parse(body);

    const result = await reviewClientCorrectionRequest(
      {
        id: auth.userId,
        tenantId: auth.tenantId,
        roleLevel: auth.roleLevel,
      },
      validated.requestId,
      validated.approved,
      validated.adminNotes
    );

    return NextResponse.json({
      success: true,
      message: validated.approved
        ? "Correction approved and applied to locked Client record."
        : "Correction request rejected.",
      result,
    });
  } catch (err: any) {
    console.error("POST /api/clients/corrections error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to review correction request" }, { status: 500 });
  }
}
