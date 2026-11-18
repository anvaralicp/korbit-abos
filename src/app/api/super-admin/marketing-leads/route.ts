import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { MarketingLeadStatus } from "@prisma/client";

const updateLeadSchema = z.object({
  leadId: z.string().min(1, "Lead ID is required"),
  status: z.nativeEnum(MarketingLeadStatus).optional(),
  superAdminNotes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const admin = await getSuperAdminFromCookie(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized Super Admin access" }, { status: 401 });
    }

    const leads = await prisma.marketingSimulationLead.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      leads,
    });
  } catch (err: any) {
    console.error("Super Admin get leads error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load marketing leads" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await getSuperAdminFromCookie(req);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized Super Admin access" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateLeadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid update data" },
        { status: 400 }
      );
    }

    const { leadId, status, superAdminNotes } = parsed.data;

    const updated = await prisma.marketingSimulationLead.update({
      where: { id: leadId },
      data: {
        ...(status ? { status } : {}),
        ...(typeof superAdminNotes === "string" ? { superAdminNotes } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      lead: updated,
      message: "Marketing lead updated successfully",
    });
  } catch (err: any) {
    console.error("Super Admin patch lead error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update marketing lead" },
      { status: 500 }
    );
  }
}
