import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";
import { PipelineStage, ApprovalStatus } from "@prisma/client";

const ConfirmSaleSchema = z.object({
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),
  cancelledChequeUrl: z.string().optional(),
  additionalKycDocs: z.array(z.string()).optional(),
  commercialNotes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dealId } = await params;
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: true,
        discountRequests: true,
      },
    });

    if (!deal || deal.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Verify there are no pending discount requests blocking closure
    const pendingDiscounts = deal.discountRequests.filter(
      (r) => r.status === ApprovalStatus.PENDING
    );
    if (pendingDiscounts.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot confirm sale while discount approval requests are still pending resolution.",
          pendingCount: pendingDiscounts.length,
        },
        { status: 400 }
      );
    }

    // Verify no denied discount requests
    const deniedDiscounts = deal.discountRequests.filter(
      (r) => r.status === ApprovalStatus.DENIED
    );
    if (deniedDiscounts.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot confirm sale with a denied discount request. Please renegotiate line items above floor price.",
        },
        { status: 400 }
      );
    }

    let bodyData: any = {};
    try {
      bodyData = await req.json();
    } catch {
      // JSON body optional
    }

    const validated = ConfirmSaleSchema.parse(bodyData);
    const now = new Date();

    const mandatoryKycDocs = ["GST", "PAN", "Cancelled Cheque"];
    if (validated.additionalKycDocs) {
      mandatoryKycDocs.push(...validated.additionalKycDocs);
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Advance Deal to STAGE_6_CLOSED_WON and flag commercial handoff
      const updatedDeal = await tx.deal.update({
        where: { id: deal.id },
        data: {
          stage: PipelineStage.STAGE_6_CLOSED_WON,
          isSaleConfirmed: true,
          confirmedAt: now,
          requiredKycDocsList: mandatoryKycDocs,
          handedOffToCommercial: true,
        },
      });

      // 2. Update Client with Stage 6 closure & tax KYC details
      const updatedClient = await tx.client.update({
        where: { id: deal.clientId },
        data: {
          currentStage: PipelineStage.STAGE_6_CLOSED_WON,
          statusLabel: "Sale Confirmed - Commercial KYC Handoff",
          gstNumber: validated.gstNumber ?? deal.client.gstNumber,
          panNumber: validated.panNumber ?? deal.client.panNumber,
          cancelledChequeUrl: validated.cancelledChequeUrl ?? deal.client.cancelledChequeUrl,
        },
      });

      // 3. Increment owner's active SalesTarget achievedAmountInr
      const activeTarget = await tx.salesTarget.findFirst({
        where: {
          tenantId: auth.tenantId,
          assignedToId: deal.ownerId,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });

      let updatedTarget = null;
      if (activeTarget) {
        const dealAmount = Number(deal.totalAmountInr);
        updatedTarget = await tx.salesTarget.update({
          where: { id: activeTarget.id },
          data: {
            achievedAmountInr: {
              increment: dealAmount,
            },
          },
        });
      }

      return { deal: updatedDeal, client: updatedClient, target: updatedTarget };
    });

    // 4. Append-only Immutable Audit Log
    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Deal",
      entityId: deal.id,
      action: "CONFIRM_SALE_CLOSED_WON",
      oldValueJson: {
        stage: deal.stage,
        isSaleConfirmed: deal.isSaleConfirmed,
        handedOffToCommercial: deal.handedOffToCommercial,
      },
      newValueJson: {
        stage: PipelineStage.STAGE_6_CLOSED_WON,
        totalAmountInr: deal.totalAmountInr,
        confirmedAt: now.toISOString(),
        requiredKycDocs: mandatoryKycDocs,
        handedOffToCommercial: true,
        salesTargetUpdatedId: result.target?.id ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Sale confirmed! Deal closed won and successfully handed off to Commercial team.",
      deal: result.deal,
      client: result.client,
      salesTarget: result.target,
    });
  } catch (err: any) {
    console.error("Confirm sale error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to confirm sale" }, { status: 500 });
  }
}
