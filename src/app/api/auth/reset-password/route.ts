import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth-utils";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";

const ResetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized session." }, { status: 401 });
    }

    const body = await req.json();
    const validated = ResetPasswordSchema.parse(body);

    await prisma.user.update({
      where: { id: auth.userId },
      data: {
        passwordHash: hashPassword(validated.newPassword),
        mustResetPassword: false,
      },
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "User",
      entityId: auth.userId,
      action: "PASSWORD_RESET_COMPLETED",
      oldValueJson: { mustResetPassword: true },
      newValueJson: { mustResetPassword: false, resetAt: new Date().toISOString() },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully. Initial onboarding lock cleared.",
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
