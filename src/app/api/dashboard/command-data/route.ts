import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RoleLevel, DepartmentType } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const selectedRole = searchParams.get("role") || "LAYER_01_ADMIN";

    // 1. Fetch Demo Tenant
    const tenant = await prisma.tenant.findFirst({
      where: { adminEmail: "admin@korbit.in" },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Demo tenant not found. Please run seed." }, { status: 404 });
    }

    // 2. Identify the acting user based on selected role
    let actingUserQuery: any = { tenantId: tenant.id };
    if (selectedRole === "LAYER_01_ADMIN") {
      actingUserQuery.roleLevel = RoleLevel.LAYER_01_ADMIN;
    } else if (selectedRole === "LAYER_02_SALES_HEAD") {
      actingUserQuery.roleLevel = RoleLevel.LAYER_02_DEPT_HEAD;
      actingUserQuery.department = DepartmentType.SALES;
    } else if (selectedRole === "LAYER_02_HR_HEAD") {
      actingUserQuery.roleLevel = RoleLevel.LAYER_02_DEPT_HEAD;
      actingUserQuery.department = DepartmentType.HR;
    } else if (selectedRole === "LAYER_02_COMMERCIAL_HEAD") {
      actingUserQuery.roleLevel = RoleLevel.LAYER_02_DEPT_HEAD;
      actingUserQuery.department = DepartmentType.COMMERCIAL;
    } else if (selectedRole === "LAYER_05_CITY_MANAGER") {
      actingUserQuery.roleLevel = RoleLevel.LAYER_05_CITY_MANAGER;
    }

    const actingUser = (await prisma.user.findFirst({
      where: actingUserQuery,
      include: { manager: true },
    })) ?? (await prisma.user.findFirst({ where: { tenantId: tenant.id, layerDepth: 1 } }));

    // 3. Tab 1: Employees and Sales Targets
    const allUsers = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      include: {
        manager: { select: { id: true, fullName: true, employeeCode: true } },
        targetsReceived: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { layerDepth: "asc" },
    });

    const employees = allUsers.map((u) => {
      const activeTarget = u.targetsReceived[0];
      const targetAmount = activeTarget ? Number(activeTarget.targetAmountInr) : 0;
      const achievedAmount = activeTarget ? Number(activeTarget.achievedAmountInr) : 0;
      const difference = achievedAmount - targetAmount;
      const performancePct = targetAmount > 0 ? Math.round((achievedAmount / targetAmount) * 100) : 0;

      return {
        id: u.id,
        fullName: u.fullName,
        employeeCode: u.employeeCode,
        email: u.email,
        mobile: u.mobile,
        designation: u.designation,
        department: u.department,
        roleLevel: u.roleLevel,
        layerDepth: u.layerDepth,
        reportingTo: u.manager ? `${u.manager.fullName} (${u.manager.employeeCode})` : "Board of Directors",
        targetAmount,
        achievedAmount,
        difference,
        performancePct,
        isResignationFrozen: u.isResignationFrozen,
        materializedPath: u.materializedPath,
      };
    });

    // 4. Tab 2: Master Client & 6-Stage Pipeline Board
    const deals = await prisma.deal.findMany({
      where: { tenantId: tenant.id },
      include: {
        client: {
          include: {
            stateRegion: true,
            division: true,
            zone: true,
          },
        },
        owner: { select: { id: true, fullName: true, employeeCode: true } },
        lineItems: { include: { product: true } },
        discountRequests: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 5. Tab 3: Discount Approval Requests
    const discountRequests = await prisma.discountApprovalRequest.findMany({
      where: { tenantId: tenant.id },
      include: {
        deal: {
          include: {
            client: true,
          },
        },
        dealLineItem: {
          include: {
            product: true,
          },
        },
        requestedBy: true,
        currentApprover: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 6. Tab 4: Admin Client Correction Queue & Audit Ledger
    const correctionRequests = await prisma.clientCorrectionRequest.findMany({
      where: { tenantId: tenant.id },
      include: {
        client: true,
        requestedBy: true,
        reviewedByAdmin: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const auditLogs = await prisma.immutableAuditLog.findMany({
      where: { tenantId: tenant.id },
      include: {
        actor: { select: { fullName: true, employeeCode: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    // 7. Tab 5: Commercial Handoff Desk (Stage 6 Closed Won)
    const commercialHandoffs = await prisma.deal.findMany({
      where: {
        tenantId: tenant.id,
        stage: "STAGE_6_CLOSED_WON",
      },
      include: {
        client: true,
        owner: true,
        lineItems: { include: { product: true } },
      },
      orderBy: { confirmedAt: "desc" },
    });

    // 8. Tab 6: Monthly HR & Travel Allowance Reports
    const now = new Date();
    const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const hrReports = await prisma.monthlyHrReport.findMany({
      where: { tenantId: tenant.id, monthYear: currentMonthYear },
      include: {
        user: true,
      },
      orderBy: { totalTravelDistanceKm: "desc" },
    });

    const products = await prisma.product.findMany({
      where: { tenantId: tenant.id },
      orderBy: { productCode: "asc" },
    });

    return NextResponse.json({
      success: true,
      tenant,
      actingUser,
      selectedRole,
      data: {
        employees,
        deals,
        discountRequests,
        correctionRequests,
        auditLogs,
        commercialHandoffs,
        hrReports,
        products,
      },
    });
  } catch (err: any) {
    console.error("Command data error:", err);
    return NextResponse.json({ error: err.message || "Failed to load command data" }, { status: 500 });
  }
}
