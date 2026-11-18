import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { SubscriptionStatus, PlanTier } from "@prisma/client";

const UpdateTenantSchema = z.object({
  subscriptionStatus: z.nativeEnum(SubscriptionStatus).optional(),
  declaredEmployeeCount: z.number().int().positive().optional(),
  planTier: z.nativeEnum(PlanTier).optional(),
  isTeamSetupUnlocked: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminFromCookie(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized Super Admin session." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const validated = UpdateTenantSchema.parse(body);

    const existingTenant = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!existingTenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    const updated = await prisma.tenant.update({
      where: { id },
      data: {
        ...(validated.subscriptionStatus && { subscriptionStatus: validated.subscriptionStatus }),
        ...(validated.declaredEmployeeCount && { declaredEmployeeCount: validated.declaredEmployeeCount }),
        ...(validated.planTier && { planTier: validated.planTier }),
        ...(validated.isTeamSetupUnlocked !== undefined && { isTeamSetupUnlocked: validated.isTeamSetupUnlocked }),
      },
    });

    return NextResponse.json({
      success: true,
      tenant: updated,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
