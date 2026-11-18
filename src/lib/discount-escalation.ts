import { prisma } from "@/lib/prisma";
import { logImmutableAudit } from "@/lib/audit";
import { ApprovalStatus, Prisma } from "@prisma/client";

export interface DefaultRuleConfig {
  approvalLevelNumber: number;
  roleLabel: string;
  layerDepth: number;
  minDiscountPercent: number;
  maxDiscountPercent: number;
  maxDiscountAmountInr: number;
  slaHours: number;
  escalateToLevelNumber: number | null;
}

export const DEFAULT_APPROVAL_MATRIX_RULES: DefaultRuleConfig[] = [
  {
    approvalLevelNumber: 5,
    roleLabel: "Level 5 (Executive)",
    layerDepth: 6,
    minDiscountPercent: 0.0,
    maxDiscountPercent: 5.0,
    maxDiscountAmountInr: 10000,
    slaHours: 0, // Instant
    escalateToLevelNumber: null,
  },
  {
    approvalLevelNumber: 4,
    roleLabel: "Level 4 (City Manager)",
    layerDepth: 5,
    minDiscountPercent: 5.01,
    maxDiscountPercent: 10.0,
    maxDiscountAmountInr: 25000,
    slaHours: 4, // 4h SLA -> escalates to Level 3
    escalateToLevelNumber: 3,
  },
  {
    approvalLevelNumber: 3,
    roleLabel: "Level 3 (Region Manager)",
    layerDepth: 4,
    minDiscountPercent: 10.01,
    maxDiscountPercent: 15.0,
    maxDiscountAmountInr: 50000,
    slaHours: 8, // 8h SLA -> escalates to Level 2
    escalateToLevelNumber: 2,
  },
  {
    approvalLevelNumber: 2,
    roleLabel: "Level 2 (Zone Head)",
    layerDepth: 3,
    minDiscountPercent: 15.01,
    maxDiscountPercent: 20.0,
    maxDiscountAmountInr: 100000,
    slaHours: 12, // 12h SLA -> escalates to Level 1
    escalateToLevelNumber: 1,
  },
  {
    approvalLevelNumber: 1,
    roleLabel: "Level 1 (Sales Head)",
    layerDepth: 2,
    minDiscountPercent: 20.01,
    maxDiscountPercent: 25.0,
    maxDiscountAmountInr: 200000,
    slaHours: 24, // 24h SLA -> escalates to Level 0 (Admin)
    escalateToLevelNumber: 0,
  },
  {
    approvalLevelNumber: 0,
    roleLabel: "Level 0 (Admin)",
    layerDepth: 1,
    minDiscountPercent: 25.01,
    maxDiscountPercent: 100.0,
    maxDiscountAmountInr: 999999999, // Above ₹2,00,000
    slaHours: 48, // 48h SLA
    escalateToLevelNumber: null,
  },
];

/**
 * Seeds or updates the 6 Dual-Gate approval matrix rules for a tenant.
 */
export async function seedDefaultApprovalMatrix(tenantId: string) {
  const operations = DEFAULT_APPROVAL_MATRIX_RULES.map((rule) => {
    return prisma.approvalMatrixRule.upsert({
      where: {
        tenantId_approvalLevelNumber: {
          tenantId,
          approvalLevelNumber: rule.approvalLevelNumber,
        },
      },
      update: {
        roleLabel: rule.roleLabel,
        layerDepth: rule.layerDepth,
        minDiscountPercent: rule.minDiscountPercent,
        maxDiscountPercent: rule.maxDiscountPercent,
        maxDiscountAmountInr: rule.maxDiscountAmountInr,
        slaHours: rule.slaHours,
        escalateToLevelNumber: rule.escalateToLevelNumber,
      },
      create: {
        tenantId,
        approvalLevelNumber: rule.approvalLevelNumber,
        roleLabel: rule.roleLabel,
        layerDepth: rule.layerDepth,
        minDiscountPercent: rule.minDiscountPercent,
        maxDiscountPercent: rule.maxDiscountPercent,
        maxDiscountAmountInr: rule.maxDiscountAmountInr,
        slaHours: rule.slaHours,
        escalateToLevelNumber: rule.escalateToLevelNumber,
      },
    });
  });

  return await prisma.$transaction(operations);
}

/**
 * Derives the required approval level number (0 to 5) based on percentage cap.
 */
export function getLevelForDiscountPercent(percent: number): number {
  if (percent <= 5.0) return 5;
  if (percent <= 10.0) return 4;
  if (percent <= 15.0) return 3;
  if (percent <= 20.0) return 2;
  if (percent <= 25.0) return 1;
  return 0; // > 25% requires Admin
}

/**
 * Derives the required approval level number (0 to 5) based on monetary INR cap.
 */
export function getLevelForDiscountAmount(amountInr: number): number {
  if (amountInr <= 10000) return 5;
  if (amountInr <= 25000) return 4;
  if (amountInr <= 50000) return 3;
  if (amountInr <= 100000) return 2;
  if (amountInr <= 200000) return 1;
  return 0; // > ₹2,00,000 requires Admin
}

export interface DiscountGateEvaluation {
  requiredLevelNumber: number;
  rule: {
    id?: string;
    approvalLevelNumber: number;
    roleLabel: string;
    layerDepth: number;
    minDiscountPercent: number | Prisma.Decimal;
    maxDiscountPercent: number | Prisma.Decimal;
    maxDiscountAmountInr: number | Prisma.Decimal;
    slaHours: number;
    escalateToLevelNumber: number | null;
  };
  slaHours: number;
  slaExpiresAt: Date;
  isAutoApproved: boolean; // Level 5 (0-5%, <= ₹10k) is instantly approved
  gateReason: string;
}

/**
 * Evaluates the Dual-Gate Discount rules for a given discount request.
 * Picks the stricter level if either the % or ₹ cap is exceeded.
 * Computes `slaExpiresAt` based on the rule's allocated SLA hours.
 */
export async function evaluateDiscountGate(
  tenantId: string,
  discountPercent: number,
  totalDiscountValueInr: number
): Promise<DiscountGateEvaluation> {
  const percentLevel = getLevelForDiscountPercent(discountPercent);
  const amountLevel = getLevelForDiscountAmount(totalDiscountValueInr);

  // Stricter level = Lower level number in hierarchy (0 = Admin, 5 = Executive)
  const stricterLevel = Math.min(percentLevel, amountLevel);

  // Fetch tenant-specific rule or fallback to defaults
  let rule = await prisma.approvalMatrixRule.findUnique({
    where: {
      tenantId_approvalLevelNumber: {
        tenantId,
        approvalLevelNumber: stricterLevel,
      },
    },
  });

  if (!rule) {
    // If not seeded yet, seed and retrieve
    await seedDefaultApprovalMatrix(tenantId);
    rule = await prisma.approvalMatrixRule.findUnique({
      where: {
        tenantId_approvalLevelNumber: {
          tenantId,
          approvalLevelNumber: stricterLevel,
        },
      },
    });
  }

  const effectiveRule = rule ?? DEFAULT_APPROVAL_MATRIX_RULES.find((r) => r.approvalLevelNumber === stricterLevel)!;

  const now = new Date();
  const slaHours = effectiveRule.slaHours;
  const slaExpiresAt =
    slaHours === 0
      ? now
      : new Date(now.getTime() + slaHours * 60 * 60 * 1000);

  const isAutoApproved = stricterLevel === 5;

  const gateReason = `Discount of ${discountPercent.toFixed(2)}% (Gate %: Level ${percentLevel}) and ₹${totalDiscountValueInr.toLocaleString("en-IN")} (Gate ₹: Level ${amountLevel}) resolves to stricter Level ${stricterLevel} (${effectiveRule.roleLabel}) with ${slaHours}h SLA.`;

  return {
    requiredLevelNumber: stricterLevel,
    rule: effectiveRule,
    slaHours,
    slaExpiresAt,
    isAutoApproved,
    gateReason,
  };
}

/**
 * Traverses the management hierarchy to find the appropriate approver User for a required approval level.
 * If no matching intermediate officer is configured, escalates upward until Admin (layerDepth 1).
 */
export async function findApproverInHierarchy(
  tenantId: string,
  requesterId: string,
  targetLayerDepth: number
) {
  const requester = await prisma.user.findUnique({
    where: { id: requesterId },
    select: {
      id: true,
      materializedPath: true,
      managerId: true,
      layerDepth: true,
    },
  });

  if (!requester) {
    throw new Error(`Requester user "${requesterId}" not found.`);
  }

  // Parse path IDs: e.g. "/rootId/deptHeadId/zoneId/userId/"
  const pathIds = requester.materializedPath.split("/").filter(Boolean);

  // If pathIds contains chain, search along chain
  const chainUsers = await prisma.user.findMany({
    where: {
      id: { in: pathIds },
      tenantId,
    },
    orderBy: { layerDepth: "asc" },
  });

  // Find user matching targetLayerDepth
  const exactMatch = chainUsers.find((u) => u.layerDepth === targetLayerDepth);
  if (exactMatch) return exactMatch;

  // Closest superior officer matching <= targetLayerDepth
  const superior = chainUsers
    .filter((u) => u.layerDepth <= targetLayerDepth)
    .sort((a, b) => b.layerDepth - a.layerDepth)[0];

  if (superior) return superior;

  // Fallback: Tenant Admin (layerDepth 1)
  const admin = await prisma.user.findFirst({
    where: {
      tenantId,
      layerDepth: 1,
    },
    orderBy: { createdAt: "asc" },
  });

  if (!admin) {
    throw new Error(`No administrative approver found for tenant "${tenantId}".`);
  }

  return admin;
}

/**
 * Automatically escalates all pending discount approval requests whose SLA has expired.
 * Background SLA runner (Section 10.2 Dual-Gate Escalation).
 */
export async function escalateExpiredDiscountRequests(tenantId?: string) {
  const now = new Date();

  const whereClause: Prisma.DiscountApprovalRequestWhereInput = {
    status: ApprovalStatus.PENDING,
    slaExpiresAt: {
      lte: now,
    },
  };

  if (tenantId) {
    whereClause.tenantId = tenantId;
  }

  const expiredRequests = await prisma.discountApprovalRequest.findMany({
    where: whereClause,
    include: {
      requestedBy: true,
      currentApprover: true,
    },
  });

  const escalationResults = [];

  for (const req of expiredRequests) {
    const currentLevel = req.currentApprovalLevel;

    // Admin level (0) cannot escalate further
    if (currentLevel <= 0) continue;

    // Rule for current level
    const currentRule = await prisma.approvalMatrixRule.findUnique({
      where: {
        tenantId_approvalLevelNumber: {
          tenantId: req.tenantId,
          approvalLevelNumber: currentLevel,
        },
      },
    });

    const nextLevel = currentRule?.escalateToLevelNumber ?? currentLevel - 1;

    // Fetch rule for next level
    const nextRule = await prisma.approvalMatrixRule.findUnique({
      where: {
        tenantId_approvalLevelNumber: {
          tenantId: req.tenantId,
          approvalLevelNumber: nextLevel,
        },
      },
    });

    const nextSlaHours = nextRule?.slaHours ?? 24;
    const nextSlaExpiresAt = new Date(now.getTime() + nextSlaHours * 60 * 60 * 1000);
    const nextApprover = await findApproverInHierarchy(
      req.tenantId,
      req.requestedById,
      nextRule?.layerDepth ?? 1
    );

    const history = Array.isArray(req.escalationHistoryJson)
      ? [...(req.escalationHistoryJson as unknown[])]
      : [];

    history.push({
      escalatedAt: now.toISOString(),
      fromLevel: currentLevel,
      toLevel: nextLevel,
      previousApproverId: req.currentApproverId,
      newApproverId: nextApprover.id,
      reason: `SLA of ${req.slaHoursAllocated}h expired without decision.`,
    });

    const updated = await prisma.discountApprovalRequest.update({
      where: { id: req.id },
      data: {
        currentApprovalLevel: nextLevel,
        currentApproverId: nextApprover.id,
        slaHoursAllocated: nextSlaHours,
        slaExpiresAt: nextSlaExpiresAt,
        escalationHistoryJson: history as Prisma.InputJsonValue,
      },
    });

    await logImmutableAudit({
      tenantId: req.tenantId,
      actorId: nextApprover.id,
      entityType: "DiscountApprovalRequest",
      entityId: req.id,
      action: "AUTO_ESCALATE_DISCOUNT_REQUEST",
      oldValueJson: {
        level: currentLevel,
        approverId: req.currentApproverId,
      },
      newValueJson: {
        level: nextLevel,
        approverId: nextApprover.id,
        slaExpiresAt: nextSlaExpiresAt,
      },
    });

    escalationResults.push(updated);
  }

  return escalationResults;
}

export const escalateOverdueDiscountRequests = escalateExpiredDiscountRequests;
