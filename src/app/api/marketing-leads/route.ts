import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { PlanTier } from "@prisma/client";

const leadSchema = z.object({
  businessEmail: z.string().email("A valid business email is required"),
  organisationName: z.string().min(2, "Organisation name must be at least 2 characters"),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  country: z.string().default("India"),
  employeeCount: z.coerce.number().int().positive("Employee count must be at least 1"),
  configuredIndustry: z.string().default("Manufacturing & Industrial"),
  selectedModules: z.array(z.string()).default(["Sales", "Commercial"]),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = leadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid lead data" },
        { status: 400 }
      );
    }

    const {
      businessEmail,
      organisationName,
      city,
      state,
      country,
      employeeCount,
      configuredIndustry,
      selectedModules,
    } = parsed.data;

    let recommendedTier: PlanTier = PlanTier.BASIC;
    if (employeeCount <= 20) {
      recommendedTier = PlanTier.BASIC;
    } else if (employeeCount <= 100) {
      recommendedTier = PlanTier.ADVANCED;
    } else if (employeeCount <= 500) {
      recommendedTier = PlanTier.PREMIUM;
    } else {
      recommendedTier = PlanTier.ENTERPRISE;
    }

    const lead = await prisma.marketingSimulationLead.create({
      data: {
        businessEmail,
        organisationName,
        city,
        state,
        country,
        employeeCount,
        recommendedTier,
        configuredIndustry,
        selectedModulesJson: selectedModules,
        unlockedSimulator: true,
      },
    });

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      recommendedTier: lead.recommendedTier,
      message: "Interactive simulation access unlocked successfully.",
    });
  } catch (err: any) {
    console.error("Marketing lead capture error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process lead capture" },
      { status: 500 }
    );
  }
}
