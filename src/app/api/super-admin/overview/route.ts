import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { SubscriptionStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await getSuperAdminFromCookie(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized Super Admin session." }, { status: 401 });
    }

    // 1. Fetch Tenants with related counters
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            users: true,
            zones: true,
            clients: true,
            deals: true,
          },
        },
        users: {
          select: {
            id: true,
            layerDepth: true,
            department: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // 2. Fetch Payment Logs
    const paymentLogs = await prisma.platformPaymentLog.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      include: {
        tenant: {
          select: {
            companyName: true,
            adminEmail: true,
          },
        },
      },
    });

    // 3. Fetch Support Tickets
    const supportTickets = await prisma.supportTicket.findMany({
      take: 50,
      orderBy: { updatedAt: "desc" },
      include: {
        tenant: {
          select: {
            companyName: true,
          },
        },
        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // 4. Fetch Marketing Simulation Leads (Phase 9)
    const marketingLeads = await prisma.marketingSimulationLead.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    // 5. Calculate Financial KPIs
    let totalSeats = 0;
    let mrrInr = 0;
    let activeTenantsCount = 0;

    tenants.forEach((t) => {
      if (t.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        activeTenantsCount++;
        totalSeats += t.declaredEmployeeCount;
        const monthlyRate = Number(t.pricePerUserInr) * t.declaredEmployeeCount;
        if (t.billingCycle === "ANNUAL") {
          // Annual paid upfront with 10% discount: Monthly MRR is total / 12
          mrrInr += (monthlyRate * 12 * 0.9) / 12;
        } else {
          mrrInr += monthlyRate;
        }
      }
    });

    const arrInr = mrrInr * 12;

    // 5. Onboarding Funnel Categorization
    const formattedTenants = tenants.map((t) => {
      const hasDeptHeads = t.users.some((u) => u.layerDepth === 2);
      const hasZones = t._count.zones > 0;
      let onboardingStep = 1; // Registered
      let onboardingStepLabel = "Registered (Payment Pending)";

      if (t.subscriptionStatus === SubscriptionStatus.ACTIVE) {
        if (!hasDeptHeads) {
          onboardingStep = 2;
          onboardingStepLabel = "Payment Verified (Setup Pending)";
        } else if (!hasZones) {
          onboardingStep = 3;
          onboardingStepLabel = "Dept Heads Invited";
        } else {
          onboardingStep = 4;
          onboardingStepLabel = "Fully Configured";
        }
      }

      return {
        id: t.id,
        companyName: t.companyName,
        adminEmail: t.adminEmail,
        adminDesignation: t.adminDesignation,
        adminContactNumber: t.adminContactNumber,
        declaredEmployeeCount: t.declaredEmployeeCount,
        actualUserCount: t._count.users,
        planTier: t.planTier,
        billingCycle: t.billingCycle,
        pricePerUserInr: Number(t.pricePerUserInr),
        subscriptionStatus: t.subscriptionStatus,
        isTeamSetupUnlocked: t.isTeamSetupUnlocked,
        operatingState: t.operatingState,
        industryType: t.industryType,
        onboardingStep,
        onboardingStepLabel,
        createdAt: t.createdAt,
      };
    });

    const funnelCounts = {
      step1PendingPayment: formattedTenants.filter((t) => t.onboardingStep === 1).length,
      step2PaymentVerified: formattedTenants.filter((t) => t.onboardingStep === 2).length,
      step3DeptHeadsInvited: formattedTenants.filter((t) => t.onboardingStep === 3).length,
      step4FullyConfigured: formattedTenants.filter((t) => t.onboardingStep === 4).length,
    };

    return NextResponse.json({
      kpis: {
        totalTenants: tenants.length,
        activeTenants: activeTenantsCount,
        totalSeats,
        mrrInr: Math.round(mrrInr),
        arrInr: Math.round(arrInr),
        openTicketsCount: supportTickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
        marketingLeadsCount: marketingLeads.length,
      },
      funnelCounts,
      tenants: formattedTenants,
      marketingLeads,
      paymentLogs: paymentLogs.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        companyName: p.tenant.companyName,
        adminEmail: p.tenant.adminEmail,
        gatewayProvider: p.gatewayProvider,
        gatewayOrderId: p.gatewayOrderId,
        gatewayPaymentId: p.gatewayPaymentId,
        amountInr: Number(p.amountInr),
        planTier: p.planTier,
        billingCycle: p.billingCycle,
        employeeCount: p.employeeCount,
        status: p.status,
        createdAt: p.createdAt,
      })),
      supportTickets: supportTickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        tenantId: t.tenantId,
        companyName: t.tenant.companyName,
        creatorName: t.createdBy.fullName,
        creatorEmail: t.createdBy.email,
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        messagesCount: t.messages.length,
        messages: t.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error: unknown) {
    console.error("Super Admin overview error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
