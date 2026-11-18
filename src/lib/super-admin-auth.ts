import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export const SA_COOKIE_NAME = "korbit_sa_session";

interface SuperAdminPayload {
  sub: string;
  email: string;
  fullName: string;
  exp: number;
}

const AUTH_SECRET = process.env.AUTH_SECRET || "korbit-superadmin-secret-2026-production";

export function signSuperAdminSession(admin: { id: string; email: string; fullName: string }): string {
  const payload: SuperAdminPayload = {
    sub: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 3600, // 7 days
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", AUTH_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySuperAdminSession(token: string): SuperAdminPayload | null {
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
    const payload: SuperAdminPayload = JSON.parse(payloadJson);

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

export async function getSuperAdminFromCookie(req?: NextRequest): Promise<SuperAdminPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SA_COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(SA_COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifySuperAdminSession(token);
}
