import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { signTenantSession, TENANT_COOKIE_NAME } from "@/lib/tenant-auth";
import { logImmutableAudit } from "@/lib/audit";
import { SubscriptionStatus } from "@prisma/client";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: validated.email },
      include: {
        tenant: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 1. Password Verification
    const isPasswordValid = verifyPassword(validated.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // 2. Tenant Suspension Gate
    if (user.tenant.subscriptionStatus === SubscriptionStatus.SUSPENDED) {
      return NextResponse.json(
        { error: "Your company account is currently suspended. Please contact support." },
        { status: 403 }
      );
    }

    // 3. Resignation Last-Day Auto-Disable Gate (Section 6.6)
    const isNoticeExpired =
      user.noticePeriodEndDate && new Date() > new Date(user.noticePeriodEndDate);

    if (user.isLoginDisabled || isNoticeExpired) {
      if (!user.isLoginDisabled) {
        await prisma.user.update({
          where: { id: user.id },
          data: { isLoginDisabled: true },
        });

        await logImmutableAudit({
          tenantId: user.tenantId,
          actorId: user.id,
          entityType: "User",
          entityId: user.id,
          action: "RESIGNATION_LAST_DAY_LOGIN_AUTO_DISABLED",
          oldValueJson: { isLoginDisabled: false },
          newValueJson: {
            isLoginDisabled: true,
            noticePeriodEndDate: user.noticePeriodEndDate,
            disabledAt: new Date().toISOString(),
          },
        });
      }

      return NextResponse.json(
        {
          error:
            "Employment notice period has ended. Account access is transferred to your reporting senior.",
        },
        { status: 403 }
      );
    }

    // 4. 72-Hour Invite Expiry Gate (Section 2.3)
    if (
      user.mustResetPassword &&
      user.inviteExpiresAt &&
      new Date() > new Date(user.inviteExpiresAt)
    ) {
      return NextResponse.json(
        {
          error:
            "Initial 72-hour onboarding invite has expired. Please ask your administrator to re-issue the invitation.",
        },
        { status: 403 }
      );
    }

    // 5. Generate Signed Tenant Session Cookie
    const token = signTenantSession({
      userId: user.id,
      tenantId: user.tenantId,
      employeeCode: user.employeeCode,
      fullName: user.fullName,
      roleLevel: user.roleLevel,
      layerDepth: user.layerDepth,
      department: user.department,
      materializedPath: user.materializedPath,
    });

    const redirectUrl =
      user.layerDepth <= 5 ? "/dashboard/command" : "/dashboard/field";

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        tenantId: user.tenantId,
        employeeCode: user.employeeCode,
        fullName: user.fullName,
        email: user.email,
        roleLevel: user.roleLevel,
        layerDepth: user.layerDepth,
        department: user.department,
        mustResetPassword: user.mustResetPassword,
        gpsConsentAcceptedAt: user.gpsConsentAcceptedAt,
      },
      mustResetPassword: user.mustResetPassword,
      needsGpsConsent: !user.gpsConsentAcceptedAt,
      redirectUrl,
    });

    res.cookies.set({
      name: TENANT_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return res;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
