import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import {
  evaluateDiscountGate,
  findApproverInHierarchy,
} from "@/lib/discount-escalation";
import { calculateGstBreakdown } from "@/lib/gst-calculator";
import { logImmutableAudit } from "@/lib/audit";
import {
  PipelineStage,
  CallNature,
  ApprovalStatus,
  Prisma,
} from "@prisma/client";

const RequestDiscountSchema = z.object({
  dealLineItemId: z.string().min(1),
  offeredPriceInr: z.coerce.number().positive(),
  expectedClientRateInr: z.coerce.number().optional(),
});

const ManagerDecisionSchema = z.object({
  discountRequestId: z.string().min(1),
  action: z.enum(["ACCEPT", "REJECT_ESCALATE", "DENY"]),
  decisionRemarks: z.string().min(2, "Remarks required for discount decision"),
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
        tenant: true,
        client: { include: { stateRegion: true } },
        lineItems: { include: { product: true } },
      },
    });

    if (!deal || deal.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Deal not found" }, { status: 404 });
    }

    // Auto-advance deal and client to STAGE_5_NEGOTIATION and natureOfCall: HOT
    await prisma.$transaction([
      prisma.deal.update({
        where: { id: deal.id },
        data: {
          stage: PipelineStage.STAGE_5_NEGOTIATION,
          natureOfCall: CallNature.HOT,
        },
      }),
      prisma.client.update({
        where: { id: deal.clientId },
        data: {
          currentStage: PipelineStage.STAGE_5_NEGOTIATION,
          natureOfCall: CallNature.HOT,
          statusLabel: "Negotiation Stage",
        },
      }),
    ]);

    const body = await req.json();

    // Route A: Manager Decision (ACCEPT / REJECT_ESCALATE / DENY)
    if (body.discountRequestId) {
      const decision = ManagerDecisionSchema.parse(body);

      const request = await prisma.discountApprovalRequest.findUnique({
        where: { id: decision.discountRequestId },
        include: { dealLineItem: true },
      });

      if (!request || request.dealId !== deal.id) {
        return NextResponse.json({ error: "Discount approval request not found" }, { status: 404 });
      }

      if (request.status !== ApprovalStatus.PENDING) {
        return NextResponse.json(
          { error: `Request has already been resolved (${request.status}).` },
          { status: 400 }
        );
      }

      const now = new Date();

      if (decision.action === "ACCEPT") {
        // 1. Accept discount: Update request, line item, and recalculate deal total
        await prisma.$transaction(async (tx) => {
          await tx.discountApprovalRequest.update({
            where: { id: request.id },
            data: {
              status: ApprovalStatus.APPROVED,
              decidedAt: now,
              decisionRemarks: decision.decisionRemarks,
            },
          });

          const offeredPrice = Number(request.offeredPriceInr);
          const actualPrice = Number(request.actualPriceInr);
          const discountPercent = Number(request.discountPercent);

          const quantity = Number(request.dealLineItem.quantity);
          const lineSubtotal = Math.round(offeredPrice * quantity);
          const gstRate = Number(request.dealLineItem.gstRatePercent);

          const tax = calculateGstBreakdown(
            lineSubtotal,
            gstRate,
            deal.tenant.operatingState,
            deal.client.stateRegion.stateName
          );

          await tx.dealLineItem.update({
            where: { id: request.dealLineItemId },
            data: {
              offeredUnitPriceInr: offeredPrice,
              discountPercent,
              lineSubtotalInr: tax.subtotalInr,
              lineTotalWithGstInr: tax.totalWithGstInr,
            },
          });

          // Refresh deal financials
          const allLineItems = await tx.dealLineItem.findMany({
            where: { dealId: deal.id },
          });

          let subtotal = 0;
          let cgst = 0;
          let sgst = 0;
          let igst = 0;
          let total = 0;

          for (const item of allLineItems) {
            const itemTax = calculateGstBreakdown(
              Number(item.lineSubtotalInr),
              Number(item.gstRatePercent),
              deal.tenant.operatingState,
              deal.client.stateRegion.stateName
            );
            subtotal += itemTax.subtotalInr;
            cgst += itemTax.cgstInr;
            sgst += itemTax.sgstInr;
            igst += itemTax.igstInr;
            total += itemTax.totalWithGstInr;
          }

          await tx.deal.update({
            where: { id: deal.id },
            data: {
              subtotalInr: subtotal,
              cgstInr: cgst,
              sgstInr: sgst,
              igstInr: igst,
              totalAmountInr: total,
            },
          });
        });

        await logImmutableAudit({
          tenantId: auth.tenantId,
          actorId: auth.userId,
          entityType: "DiscountApprovalRequest",
          entityId: request.id,
          action: "ACCEPT_DISCOUNT_REQUEST",
          oldValueJson: { status: ApprovalStatus.PENDING },
          newValueJson: {
            status: ApprovalStatus.APPROVED,
            approvedBy: auth.userId,
            remarks: decision.decisionRemarks,
          },
        });

        return NextResponse.json({
          success: true,
          action: "ACCEPT",
          message: "Discount rate approved. Deal financials updated.",
        });
      }

      if (decision.action === "REJECT_ESCALATE") {
        // 2. Reject and escalate up the chain of command
        const currentLevel = request.currentApprovalLevel;
        if (currentLevel <= 0) {
          return NextResponse.json(
            { error: "Admin level (Level 0) cannot be escalated further. Please Accept or Deny." },
            { status: 400 }
          );
        }

        const nextLevel = currentLevel - 1;
        const nextRule = await prisma.approvalMatrixRule.findUnique({
          where: {
            tenantId_approvalLevelNumber: {
              tenantId: auth.tenantId,
              approvalLevelNumber: nextLevel,
            },
          },
        });

        const nextSlaHours = nextRule?.slaHours ?? 24;
        const nextSlaExpiresAt = new Date(now.getTime() + nextSlaHours * 60 * 60 * 1000);
        const nextApprover = await findApproverInHierarchy(
          auth.tenantId,
          request.requestedById,
          nextRule?.layerDepth ?? 1
        );

        const history = Array.isArray(request.escalationHistoryJson)
          ? [...(request.escalationHistoryJson as unknown[])]
          : [];

        history.push({
          escalatedAt: now.toISOString(),
          byOfficerId: auth.userId,
          byOfficerName: auth.fullName,
          fromLevel: currentLevel,
          toLevel: nextLevel,
          reason: `Manual Reject ↑ (Escalated to Level ${nextLevel}): ${decision.decisionRemarks}`,
        });

        const updated = await prisma.discountApprovalRequest.update({
          where: { id: request.id },
          data: {
            currentApprovalLevel: nextLevel,
            currentApproverId: nextApprover.id,
            slaHoursAllocated: nextSlaHours,
            slaExpiresAt: nextSlaExpiresAt,
            escalationHistoryJson: history as Prisma.InputJsonValue,
          },
        });

        await logImmutableAudit({
          tenantId: auth.tenantId,
          actorId: auth.userId,
          entityType: "DiscountApprovalRequest",
          entityId: request.id,
          action: "MANUAL_ESCALATE_DISCOUNT_REQUEST",
          oldValueJson: { level: currentLevel, approverId: request.currentApproverId },
          newValueJson: {
            level: nextLevel,
            approverId: nextApprover.id,
            slaExpiresAt: nextSlaExpiresAt,
            remarks: decision.decisionRemarks,
          },
        });

        return NextResponse.json({
          success: true,
          action: "REJECT_ESCALATE",
          message: `Discount request rejected and escalated to Level ${nextLevel} (${nextApprover.fullName}).`,
          request: updated,
        });
      }

      if (decision.action === "DENY") {
        // 3. Hard Deny: blocks sale below floor price, tracks level on chart
        const denied = await prisma.discountApprovalRequest.update({
          where: { id: request.id },
          data: {
            status: ApprovalStatus.DENIED,
            deniedByUserId: auth.userId,
            deniedByLevel: auth.layerDepth,
            decidedAt: now,
            decisionRemarks: decision.decisionRemarks,
          },
        });

        await logImmutableAudit({
          tenantId: auth.tenantId,
          actorId: auth.userId,
          entityType: "DiscountApprovalRequest",
          entityId: request.id,
          action: "DENY_DISCOUNT_REQUEST",
          oldValueJson: { status: ApprovalStatus.PENDING },
          newValueJson: {
            status: ApprovalStatus.DENIED,
            deniedByUserId: auth.userId,
            deniedByLevel: auth.layerDepth,
            remarks: decision.decisionRemarks,
          },
        });

        return NextResponse.json({
          success: true,
          action: "DENY",
          message: `Discount request hard-denied by Layer ${auth.layerDepth} officer. Sale below offered floor price is blocked.`,
          request: denied,
        });
      }
    }

    // Route B: Requester proposing new discount / rate
    const validatedInput = RequestDiscountSchema.parse(body);

    const lineItem = deal.lineItems.find((li) => li.id === validatedInput.dealLineItemId);
    if (!lineItem) {
      return NextResponse.json({ error: "Deal line item not found" }, { status: 404 });
    }

    const actualPrice = Number(lineItem.actualUnitPriceInr);
    const offeredPrice = validatedInput.offeredPriceInr;
    const quantity = Number(lineItem.quantity);

    if (offeredPrice > actualPrice) {
      return NextResponse.json({ error: "Offered price cannot exceed product master price." }, { status: 400 });
    }

    const discountAmountPerUnit = actualPrice - offeredPrice;
    const discountPercent = Number(((discountAmountPerUnit / actualPrice) * 100).toFixed(2));
    const totalDiscountValueInr = Math.round(discountAmountPerUnit * quantity);

    // Evaluate dual-gate discount rules
    const evaluation = await evaluateDiscountGate(
      auth.tenantId,
      discountPercent,
      totalDiscountValueInr
    );

    // Case 1: Auto-Approved (Level 5: 0-5%, <= ₹10k)
    if (evaluation.isAutoApproved) {
      const lineSubtotal = Math.round(offeredPrice * quantity);
      const gstRate = Number(lineItem.gstRatePercent);
      const tax = calculateGstBreakdown(
        lineSubtotal,
        gstRate,
        deal.tenant.operatingState,
        deal.client.stateRegion.stateName
      );

      await prisma.dealLineItem.update({
        where: { id: lineItem.id },
        data: {
          offeredUnitPriceInr: offeredPrice,
          expectedClientRateInr: validatedInput.expectedClientRateInr ?? null,
          discountPercent,
          lineSubtotalInr: tax.subtotalInr,
          lineTotalWithGstInr: tax.totalWithGstInr,
        },
      });

      return NextResponse.json({
        success: true,
        autoApproved: true,
        evaluation,
        message: `Discount of ${discountPercent}% (₹${totalDiscountValueInr.toLocaleString("en-IN")}) is within Executive authority. Auto-approved instantly.`,
      });
    }

    // Case 2: Requires Superior Approval -> create DiscountApprovalRequest
    const approver = await findApproverInHierarchy(
      auth.tenantId,
      auth.userId,
      evaluation.rule.layerDepth
    );

    const discountRequest = await prisma.discountApprovalRequest.create({
      data: {
        tenantId: auth.tenantId,
        dealId: deal.id,
        dealLineItemId: lineItem.id,
        requestedById: auth.userId,
        currentApproverId: approver.id,
        currentApprovalLevel: evaluation.requiredLevelNumber,
        actualPriceInr: actualPrice,
        expectedPriceInr: validatedInput.expectedClientRateInr ?? offeredPrice,
        offeredPriceInr: offeredPrice,
        discountPercent,
        totalDiscountValueInr,
        status: ApprovalStatus.PENDING,
        slaHoursAllocated: evaluation.slaHours,
        slaExpiresAt: evaluation.slaExpiresAt,
      },
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "DiscountApprovalRequest",
      entityId: discountRequest.id,
      action: "CREATE_DISCOUNT_APPROVAL_REQUEST",
      oldValueJson: null,
      newValueJson: {
        discountPercent,
        totalDiscountValueInr,
        currentApprovalLevel: evaluation.requiredLevelNumber,
        approverId: approver.id,
        slaExpiresAt: evaluation.slaExpiresAt,
      },
    });

    return NextResponse.json(
      {
        success: true,
        autoApproved: false,
        evaluation,
        approver: {
          id: approver.id,
          fullName: approver.fullName,
          designation: approver.designation,
          layerDepth: approver.layerDepth,
        },
        discountRequest,
        message: `Dual-Gate triggered: Routed to Level ${evaluation.requiredLevelNumber} (${approver.fullName}) with ${evaluation.slaHours}h SLA.`,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Negotiate error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to process negotiation request" }, { status: 500 });
  }
}
