import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { RoleLevel, DepartmentType } from "@prisma/client";

export const TENANT_COOKIE_NAME = "korbit_tenant_session";

export interface TenantSessionPayload {
  userId: string;
  tenantId: string;
  employeeCode: string;
  fullName: string;
  roleLevel: RoleLevel;
  layerDepth: number;
  department: DepartmentType;
  materializedPath: string;
  exp: number;
}

const AUTH_SECRET = process.env.AUTH_SECRET || "korbit-tenant-auth-secret-2026-production";

export function signTenantSession(user: {
  userId: string;
  tenantId: string;
  employeeCode: string;
  fullName: string;
  roleLevel: RoleLevel;
  layerDepth: number;
  department: DepartmentType;
  materializedPath: string;
}): string {
  const payload: TenantSessionPayload = {
    userId: user.userId,
    tenantId: user.tenantId,
    employeeCode: user.employeeCode,
    fullName: user.fullName,
    roleLevel: user.roleLevel,
    layerDepth: user.layerDepth,
    department: user.department,
    materializedPath: user.materializedPath,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7-day session
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifyTenantSession(token: string): TenantSessionPayload | null {
  try {
    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) return null;

    const expectedSig = createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);

    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const payload: TenantSessionPayload = JSON.parse(payloadJson);

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired session
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getTenantSessionFromCookie(req?: NextRequest): Promise<TenantSessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(TENANT_COOKIE_NAME)?.value;
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(TENANT_COOKIE_NAME)?.value;
    } catch {
      return null;
    }
  }

  if (!token) return null;
  return verifyTenantSession(token);
}
