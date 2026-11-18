import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface LogImmutableAuditParams {
  tenantId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValueJson?: Prisma.InputJsonValue | unknown;
  newValueJson?: Prisma.InputJsonValue | unknown;
  timestamp?: Date;
}

/**
 * Computes the SHA-256 hash for an immutable audit ledger entry.
 * Hash formula: SHA256(previousHash + actorId + entityType + entityId + JSON.stringify(oldValueJson) + JSON.stringify(newValueJson) + timestamp)
 */
export function computeAuditEntryHash(
  previousHash: string | null,
  actorId: string,
  entityType: string,
  entityId: string,
  oldValueJson: unknown,
  newValueJson: unknown,
  timestamp: Date | string
): string {
  const prevStr = previousHash ?? "GENESIS";
  const oldStr = oldValueJson !== undefined ? JSON.stringify(oldValueJson) : "null";
  const newStr = newValueJson !== undefined ? JSON.stringify(newValueJson) : "null";
  const timeStr = timestamp instanceof Date ? timestamp.toISOString() : String(timestamp);

  const hashPayload = `${prevStr}${actorId}${entityType}${entityId}${oldStr}${newStr}${timeStr}`;
  return createHash("sha256").update(hashPayload).digest("hex");
}

/**
 * Inserts an append-only cryptographic ledger record into ImmutableAuditLog.
 * Links to the previous hash in the tenant's chain to ensure tamper detection.
 */
export async function logImmutableAudit(params: LogImmutableAuditParams) {
  const eventTime = params.timestamp ?? new Date();

  // 1. Fetch the most recent audit entry for the tenant to maintain the cryptographic hash chain
  const latestEntry = await prisma.immutableAuditLog.findFirst({
    where: { tenantId: params.tenantId },
    orderBy: { createdAt: "desc" },
    select: { entryHash: true },
  });

  const previousHash = latestEntry?.entryHash ?? null;

  // 2. Compute the cryptographic SHA-256 entry hash
  const entryHash = computeAuditEntryHash(
    previousHash,
    params.actorId,
    params.entityType,
    params.entityId,
    params.oldValueJson,
    params.newValueJson,
    eventTime
  );

  // 3. Persist the append-only row
  const auditRow = await prisma.immutableAuditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      oldValueJson: (params.oldValueJson ?? undefined) as Prisma.InputJsonValue,
      newValueJson: (params.newValueJson ?? undefined) as Prisma.InputJsonValue,
      previousHash,
      entryHash,
      createdAt: eventTime,
    },
  });

  return auditRow;
}

/**
 * Validates the integrity of the tenant's cryptographic audit chain.
 * Verifies that each entry links cleanly to its predecessor and hashes match.
 */
export async function verifyAuditChain(tenantId: string): Promise<{
  isValid: boolean;
  totalLogsChecked: number;
  brokenIndex?: number;
  reason?: string;
}> {
  const logs = await prisma.immutableAuditLog.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
  });

  let previousHash: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const entry = logs[i];

    // Check link to previous
    if (entry.previousHash !== previousHash) {
      return {
        isValid: false,
        totalLogsChecked: logs.length,
        brokenIndex: i,
        reason: `Hash link mismatch at record ${entry.id}. Expected ${previousHash}, got ${entry.previousHash}`,
      };
    }

    // Verify self hash
    const expectedHash = computeAuditEntryHash(
      entry.previousHash,
      entry.actorId,
      entry.entityType,
      entry.entityId,
      entry.oldValueJson,
      entry.newValueJson,
      entry.createdAt
    );

    if (expectedHash !== entry.entryHash) {
      return {
        isValid: false,
        totalLogsChecked: logs.length,
        brokenIndex: i,
        reason: `Cryptographic checksum mismatch at record ${entry.id}.`,
      };
    }

    previousHash = entry.entryHash;
  }

  return {
    isValid: true,
    totalLogsChecked: logs.length,
  };
}
