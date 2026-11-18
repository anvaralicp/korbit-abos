import { prisma } from "@/lib/prisma";
import { logImmutableAudit } from "@/lib/audit";
import { RoleLevel, CorrectionActionType, CorrectionStatus, Prisma } from "@prisma/client";

/**
 * Custom error thrown when a user under Resignation Freeze attempts unauthorized mutations.
 */
export class ResignationFreezeError extends Error {
  public statusCode: number = 403;
  public seniorAlertedId: string | null;
  public actionType: string;

  constructor(message: string, seniorAlertedId: string | null, actionType: string) {
    super(message);
    this.name = "ResignationFreezeError";
    this.seniorAlertedId = seniorAlertedId;
    this.actionType = actionType;
  }
}

/**
 * Asserts that a user is not under Resignation Freeze for the requested action.
 *
 * Rules (Section 6.6):
 * - If `user.isResignationFrozen === true`, ONLY `"ADD_CLIENT"` and `"ADD_FOLLOWUP_REMARK"` are permitted.
 * - Any other mutation is blocked, logged to `ImmutableAuditLog`, and triggers a 403 alerting the senior officer.
 */
export async function assertNotResignationFrozen(
  userId: string,
  actionType: string
): Promise<{ allowed: boolean; isFrozen: boolean }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      fullName: true,
      employeeCode: true,
      isResignationFrozen: true,
      managerId: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error(`User with ID "${userId}" does not exist.`);
  }

  // If the user is not frozen, allow immediately
  if (!user.isResignationFrozen) {
    return { allowed: true, isFrozen: false };
  }

  // Under resignation freeze, strictly permitted actions:
  const ALLOWED_ACTIONS = ["ADD_CLIENT", "ADD_FOLLOWUP_REMARK"];
  if (ALLOWED_ACTIONS.includes(actionType)) {
    return { allowed: true, isFrozen: true };
  }

  // Unauthorized mutation attempt during resignation freeze:
  // 1. Write immutable audit log
  await logImmutableAudit({
    tenantId: user.tenantId,
    actorId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "RESIGNATION_FREEZE_BLOCKED_ATTEMPT",
    oldValueJson: {
      isResignationFrozen: true,
      attemptedAction: actionType,
    },
    newValueJson: {
      blocked: true,
      seniorAlertedId: user.managerId,
      seniorName: user.manager?.fullName ?? null,
      seniorEmail: user.manager?.email ?? null,
    },
  });

  // 2. Reject with 403 error alerting immediate senior
  throw new ResignationFreezeError(
    `Security Alert: User ${user.fullName} (${user.employeeCode}) is currently under Resignation Freeze. Mutation "${actionType}" is strictly prohibited. Reporting officer (${user.manager?.fullName ?? "Senior Officer"}) has been alerted.`,
    user.managerId,
    actionType
  );
}

export interface ClientModificationResult {
  applied: boolean;
  client?: Prisma.ClientGetPayload<object>;
  correctionRequest?: Prisma.ClientCorrectionRequestGetPayload<object>;
  message: string;
}

/**
 * Handles locked client data updates according to the Section 13.1 Data Protection Protocol.
 *
 * Rules:
 * - All Client records have `isLocked: true`.
 * - If `actorUser.roleLevel === LAYER_01_ADMIN`, the modification is applied directly and audited.
 * - Otherwise, direct updates are BLOCKED, and a `ClientCorrectionRequest` is generated in `PENDING_ADMIN` status.
 */
export async function requestOrApplyClientModification(
  actorUser: {
    id: string;
    tenantId: string;
    roleLevel: RoleLevel | string;
  },
  clientId: string,
  requestedChanges: Prisma.ClientUpdateInput & Record<string, unknown>,
  reason: string,
  actionType: CorrectionActionType = CorrectionActionType.UPDATE_CLIENT
): Promise<ClientModificationResult> {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
  });

  if (!client) {
    throw new Error(`Client record "${clientId}" not found.`);
  }

  // 1. LAYER_01_ADMIN directly updates the locked client record
  if (actorUser.roleLevel === RoleLevel.LAYER_01_ADMIN) {
    const updatedClient = await prisma.client.update({
      where: { id: clientId },
      data: requestedChanges,
    });

    await logImmutableAudit({
      tenantId: actorUser.tenantId,
      actorId: actorUser.id,
      entityType: "Client",
      entityId: clientId,
      action: "ADMIN_DIRECT_CLIENT_UPDATE",
      oldValueJson: JSON.parse(JSON.stringify(client)),
      newValueJson: JSON.parse(JSON.stringify(updatedClient)),
    });

    return {
      applied: true,
      client: updatedClient,
      message: "Client record updated directly by Administrator.",
    };
  }

  // 2. Non-Admin (Managers/Executives): Client is locked. Route to ClientCorrectionRequest
  const correctionRequest = await prisma.clientCorrectionRequest.create({
    data: {
      tenantId: actorUser.tenantId,
      clientId: client.id,
      requestedById: actorUser.id,
      actionType,
      originalValuesJson: JSON.parse(JSON.stringify(client)),
      requestedValuesJson: requestedChanges as Prisma.InputJsonValue,
      reason,
      status: CorrectionStatus.PENDING_ADMIN,
    },
  });

  await logImmutableAudit({
    tenantId: actorUser.tenantId,
    actorId: actorUser.id,
    entityType: "ClientCorrectionRequest",
    entityId: correctionRequest.id,
    action: "CLIENT_CORRECTION_REQUESTED",
    oldValueJson: {
      clientId: client.id,
      isLocked: client.isLocked,
    },
    newValueJson: {
      correctionRequestId: correctionRequest.id,
      requestedChanges,
      reason,
      status: CorrectionStatus.PENDING_ADMIN,
    },
  });

  return {
    applied: false,
    correctionRequest,
    message: "Client records are locked against manager modifications. A formal Client Correction Request has been queued for Administrator approval.",
  };
}

/**
 * Allows a LAYER_01_ADMIN to review (Approve / Reject) a pending ClientCorrectionRequest.
 * If approved, atomic transaction applies requested changes to the locked Client and logs to audit ledger.
 */
export async function reviewClientCorrectionRequest(
  adminUser: { id: string; tenantId: string; roleLevel: RoleLevel | string },
  requestId: string,
  approved: boolean,
  adminNotes?: string
) {
  if (adminUser.roleLevel !== RoleLevel.LAYER_01_ADMIN) {
    throw new Error("Unauthorized: Only LAYER_01_ADMIN can review client correction requests.");
  }

  return await prisma.$transaction(async (tx) => {
    const request = await tx.clientCorrectionRequest.findUnique({
      where: { id: requestId },
      include: { client: true },
    });

    if (!request) {
      throw new Error(`Correction request "${requestId}" not found.`);
    }

    if (request.status !== CorrectionStatus.PENDING_ADMIN) {
      throw new Error(`Correction request "${requestId}" has already been resolved (${request.status}).`);
    }

    const newStatus = approved ? CorrectionStatus.APPROVED : CorrectionStatus.REJECTED;

    const updatedRequest = await tx.clientCorrectionRequest.update({
      where: { id: requestId },
      data: {
        status: newStatus,
        reviewedByAdminId: adminUser.id,
        reviewedAt: new Date(),
        adminNotes: adminNotes ?? null,
      },
    });

    let updatedClient = null;

    if (approved) {
      // Apply proposed values to client
      const changes = request.requestedValuesJson as Prisma.ClientUpdateInput;
      updatedClient = await tx.client.update({
        where: { id: request.clientId },
        data: changes,
      });
    }

    // Append-only audit record
    await logImmutableAudit({
      tenantId: adminUser.tenantId,
      actorId: adminUser.id,
      entityType: "ClientCorrectionRequest",
      entityId: request.id,
      action: approved ? "ADMIN_APPROVED_CORRECTION" : "ADMIN_REJECTED_CORRECTION",
      oldValueJson: {
        status: request.status,
        client: request.originalValuesJson,
      },
      newValueJson: {
        status: newStatus,
        adminNotes,
        appliedChanges: approved ? request.requestedValuesJson : null,
      },
    });

    return {
      correctionRequest: updatedRequest,
      client: updatedClient,
      approved,
    };
  });
}
