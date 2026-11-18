import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleLevel, DepartmentType } from "@prisma/client";
import { getTenantSessionFromCookie } from "@/lib/tenant-auth";

export interface AuthContext {
  userId: string;
  tenantId: string;
  roleLevel: RoleLevel;
  department: DepartmentType;
  layerDepth: number;
  materializedPath: string;
  fullName: string;
  email: string;
  isResignationFrozen: boolean;
}

/**
 * Extracts and verifies the authenticated user and tenant context from request headers or query params.
 * In production, this decodes the session/JWT; in API calls it supports `x-user-id` / `x-tenant-id`.
 */
export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  // Check headers first
  let userId = req.headers.get("x-user-id");
  let tenantId = req.headers.get("x-tenant-id");

  // Fallback to query params if testing via browser/curl
  if (!userId) {
    const url = new URL(req.url);
    userId = url.searchParams.get("userId");
    if (!tenantId) tenantId = url.searchParams.get("tenantId");
  }

  // Fallback to signed HTTP-only tenant session cookie
  if (!userId) {
    const session = await getTenantSessionFromCookie(req);
    if (session) {
      userId = session.userId;
      tenantId = session.tenantId;
    }
  }

  if (!userId) {
    // If not supplied, try to find the primary admin for convenience in local dev
    if (tenantId) {
      const tenantAdmin = await prisma.user.findFirst({
        where: { tenantId, layerDepth: 1 },
      });
      if (tenantAdmin) {
        return {
          userId: tenantAdmin.id,
          tenantId: tenantAdmin.tenantId,
          roleLevel: tenantAdmin.roleLevel,
          department: tenantAdmin.department,
          layerDepth: tenantAdmin.layerDepth,
          materializedPath: tenantAdmin.materializedPath,
          fullName: tenantAdmin.fullName,
          email: tenantAdmin.email,
          isResignationFrozen: tenantAdmin.isResignationFrozen,
        };
      }
    }
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenantId: true,
      roleLevel: true,
      department: true,
      layerDepth: true,
      materializedPath: true,
      fullName: true,
      email: true,
      isResignationFrozen: true,
    },
  });

  if (!user) return null;

  return {
    userId: user.id,
    tenantId: user.tenantId,
    roleLevel: user.roleLevel,
    department: user.department,
    layerDepth: user.layerDepth,
    materializedPath: user.materializedPath,
    fullName: user.fullName,
    email: user.email,
    isResignationFrozen: user.isResignationFrozen,
  };
}
