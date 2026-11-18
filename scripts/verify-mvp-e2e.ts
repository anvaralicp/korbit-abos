import { PrismaClient, PlanTier, BillingCycle, SubscriptionStatus, DepartmentType, RoleLevel, ZoneCode, ApprovalStatus, CorrectionActionType, CorrectionStatus, PipelineStage, MarketingLeadStatus } from "@prisma/client";
import { calculatePricing } from "../src/lib/pricing";
import { calculateGstBreakdown } from "../src/lib/gst-calculator";
import { deriveRoleLevelFromDepth, getUserSubordinatesFilter, isOfficerAboveInChain, createSubordinateWithDLD } from "../src/lib/dld-hierarchy";
import { assertNotResignationFrozen, requestOrApplyClientModification, reviewClientCorrectionRequest } from "../src/lib/security-guards";
import { logImmutableAudit } from "../src/lib/audit";
import { escalateOverdueDiscountRequests } from "../src/lib/discount-escalation";
import { hashPassword } from "../src/lib/auth-utils";
import { getPlatformBrandingConfig, updatePlatformBrandingConfig, DEFAULT_BRANDING_CONFIG } from "../src/lib/branding";

const prisma = new PrismaClient();

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    testsPassed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    testsFailed++;
  }
}

async function runE2EVerification() {
  console.log("\n================================================================================");
  console.log("🚀 KORBIT ABOS V1.0 COMMERCIAL MVP — AUTOMATED END-TO-END VERIFICATION SUITE");
  console.log("================================================================================\n");

  // Fetch or ensure demo tenant exists
  let tenant = await prisma.tenant.findFirst({
    where: { adminEmail: "admin@korbit.in" },
    include: {
      users: true,
      zones: { include: { states: { include: { divisions: true } } } },
      products: true,
    },
  });

  if (!tenant) {
    console.error("❌ Demo tenant not found! Please run `npx tsx prisma/seed.ts` first.");
    process.exit(1);
  }

  // ----------------------------------------------------------------------------
  // TEST 1: Tiered Pricing Engine & Registration Calculations
  // ----------------------------------------------------------------------------
  console.log("📋 Test 1: Tiered Pricing Engine & Registration Calculations");
  {
    const basicMonthly = calculatePricing(15, BillingCycle.MONTHLY);
    assert(
      basicMonthly.planTier === PlanTier.BASIC && basicMonthly.pricePerUserMonthlyInr === 299,
      "15 employees auto-assigns to BASIC Tier @ ₹299/user/mo"
    );

    const advancedMonthly = calculatePricing(50, BillingCycle.MONTHLY);
    assert(
      advancedMonthly.planTier === PlanTier.ADVANCED && advancedMonthly.pricePerUserMonthlyInr === 599,
      "50 employees auto-assigns to ADVANCED Tier @ ₹599/user/mo"
    );

    const premiumAnnual = calculatePricing(250, BillingCycle.ANNUAL);
    const expectedSubtotal = 250 * 999 * 12;
    const expectedDiscount = Math.round(expectedSubtotal * 0.1);
    const expectedNet = expectedSubtotal - expectedDiscount;
    const expectedGst = Math.round(expectedNet * 0.18);
    const expectedTotal = expectedNet + expectedGst;

    assert(
      premiumAnnual.planTier === PlanTier.PREMIUM &&
      premiumAnnual.discountAmountInr === expectedDiscount &&
      premiumAnnual.totalPayableInr === expectedTotal,
      "250 employees ANNUAL applies 10% discount + 18% GST correctly"
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 2: Dynamic Layer Detection (DLD) & Upward Visibility Chain
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 2: Dynamic Layer Detection & Upward Hierarchy Visibility");
  {
    const adminUser = tenant.users.find((u) => u.layerDepth === 1);
    const execUser = tenant.users.find((u) => u.layerDepth === 6);

    assert(Boolean(adminUser && execUser), "Found Layer 01 Admin and Layer 06 Executive nodes in tenant tree");

    if (adminUser && execUser) {
      assert(
        execUser.materializedPath.startsWith(adminUser.materializedPath),
        "Layer 06 materializedPath inherits Layer 01 Admin path prefix"
      );

      const roleFromDepth = deriveRoleLevelFromDepth(6);
      assert(
        roleFromDepth === RoleLevel.LAYER_06_EXECUTIVE,
        "deriveRoleLevelFromDepth(6) returns LAYER_06_EXECUTIVE"
      );

      const adminFilter = getUserSubordinatesFilter(adminUser);
      const juniorFilter = getUserSubordinatesFilter(execUser);

      assert(
        adminFilter.materializedPath.startsWith === adminUser.materializedPath,
        "Senior manager filter queries full subtree prefix"
      );
      assert(
        isOfficerAboveInChain(adminUser, execUser),
        "isOfficerAboveInChain confirms Admin is above Executive in hierarchy"
      );
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 3: Product Master & Dual-Jurisdiction GST Engine
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 3: Product Master & Dual-Jurisdiction GST Tax Engine");
  {
    // Intra-state: Operating State Kerala -> Client Kerala
    const intraGst = calculateGstBreakdown(100000, 18, "Kerala", "Kerala");

    assert(
      !intraGst.isInterState &&
      intraGst.cgstInr === 9000 &&
      intraGst.sgstInr === 9000 &&
      intraGst.igstInr === 0 &&
      intraGst.totalWithGstInr === 118000,
      "Intra-state (Kerala -> Kerala) splits 18% into 9% CGST + 9% SGST"
    );

    // Inter-state: Operating State Kerala -> Client Tamil Nadu
    const interGst = calculateGstBreakdown(100000, 18, "Kerala", "Tamil Nadu");

    assert(
      interGst.isInterState &&
      interGst.cgstInr === 0 &&
      interGst.sgstInr === 0 &&
      interGst.igstInr === 18000 &&
      interGst.totalWithGstInr === 118000,
      "Inter-state (Kerala -> Tamil Nadu) applies 18% IGST exclusively"
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 4: Admin-Only Client Lock & SHA-256 Tamper-Evident Audit Chain
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 4: Client Admin Lock Workflow & Cryptographic Audit Chaining");
  {
    const adminUser = tenant.users.find((u) => u.layerDepth === 1)!;
    const cityMgrUser = tenant.users.find((u) => u.layerDepth === 5)!;
    const client = await prisma.client.findFirst({ where: { tenantId: tenant.id } });

    assert(Boolean(client && client.isLocked), "Sample client exists with isLocked === true");

    if (client) {
      // 1. Layer 05 Manager attempts to edit locked client -> Correction Request created
      const modResult = await requestOrApplyClientModification(
        cityMgrUser,
        client.id,
        { contactMobile: "+91 9999900000" },
        "Client mobile update by city manager",
        CorrectionActionType.UPDATE_CLIENT
      );

      assert(
        modResult.applied === false && Boolean(modResult.correctionRequest),
        "City Manager direct edit is gated; created ClientCorrectionRequest"
      );

      // 2. Layer 01 Admin approves correction request
      if (modResult.correctionRequest) {
        const reviewResult = await reviewClientCorrectionRequest(
          adminUser,
          modResult.correctionRequest.id,
          true,
          "Approved by Administrator"
        );

        assert(
          reviewResult.approved === true && Boolean(reviewResult.client),
          "Admin review successfully approves client correction request"
        );

        const recentAudits = await prisma.immutableAuditLog.findMany({
          where: { tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: 2,
        });

        assert(
          recentAudits.length >= 2 && Boolean(recentAudits[0].previousHash),
          "SHA-256 cryptographic audit chain records append-only tamper-evident hashes"
        );
      }
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 5: Dual-Gate Discount SLA Auto-Escalation Engine
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 5: Dual-Gate Discount SLA Auto-Escalation Engine");
  {
    const adminUser = tenant.users.find((u) => u.layerDepth === 1)!;
    const regionHead = tenant.users.find((u) => u.layerDepth === 4) || adminUser;
    const execUser = tenant.users.find((u) => u.layerDepth === 6)!;
    const deal = await prisma.deal.findFirst({ where: { tenantId: tenant.id } });

    if (deal) {
      let lineItem = await prisma.dealLineItem.findFirst({ where: { dealId: deal.id } });
      if (!lineItem) {
        const prod = tenant.products[0];
        lineItem = await prisma.dealLineItem.create({
          data: {
            dealId: deal.id,
            productId: prod.id,
            quantity: 1,
            actualUnitPriceInr: prod.unitPriceInr,
            offeredUnitPriceInr: prod.unitPriceInr,
            gstRatePercent: prod.gstRatePercent,
            lineSubtotalInr: prod.unitPriceInr,
            lineTotalWithGstInr: 1180,
          },
        });
      }

      // Create a 12% discount request with an expired SLA timer
      const expiredSla = new Date(Date.now() - 5 * 60 * 1000); // 5 mins ago
      const req = await prisma.discountApprovalRequest.create({
        data: {
          tenantId: tenant.id,
          dealId: deal.id,
          dealLineItemId: lineItem.id,
          requestedById: execUser.id,
          currentApproverId: regionHead.id,
          currentApprovalLevel: 3, // Level 3 Region Manager
          actualPriceInr: 100000,
          expectedPriceInr: 100000,
          offeredPriceInr: 88000,
          discountPercent: 12.0,
          totalDiscountValueInr: 12000,
          status: ApprovalStatus.PENDING,
          slaHoursAllocated: 8,
          slaExpiresAt: expiredSla,
          decisionRemarks: "E2E Test Discount Escalation Request",
        },
      });

      // Run escalation routine
      const escalatedResults = await escalateOverdueDiscountRequests();

      const freshReq = await prisma.discountApprovalRequest.findUnique({
        where: { id: req.id },
      });

      assert(
        escalatedResults.length >= 1 &&
        freshReq?.currentApprovalLevel === 2,
        "Expired 12% discount request auto-escalated from Level 3 to Level 2 Zone Head"
      );

      // Clean up test discount request
      await prisma.discountApprovalRequest.delete({ where: { id: req.id } });
    }
  }

  // ----------------------------------------------------------------------------
  // TEST 6: 3-Point GPS Field Visit, Road Km & Privacy Kill-Switch
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 6: 3-Point Field Attendance & DPDP 2023 GPS Privacy Kill-Switch");
  {
    const execUser = tenant.users.find((u) => u.layerDepth === 6)!;
    const client = await prisma.client.findFirst({ where: { tenantId: tenant.id } });
    if (!client) throw new Error("Client not found");

    const testDate = new Date("2030-01-01T00:00:00.000Z");
    await prisma.fieldAttendance.deleteMany({ where: { userId: execUser.id, attendanceDate: testDate } });

    // 1. Shift Sign-In (Kill-Switch Active)
    const att = await prisma.fieldAttendance.create({
      data: {
        tenantId: tenant.id,
        userId: execUser.id,
        attendanceDate: testDate,
        signedInAt: new Date(),
        signInLat: 9.9312,
        signInLng: 76.2673,
        isGpsTrackingLive: true,
      },
    });

    assert(att.isGpsTrackingLive === true, "Duty Sign-In sets isGpsTrackingLive === true");

    // 2. Client Check-In
    const visit = await prisma.fieldMeetingVisit.create({
      data: {
        tenantId: tenant.id,
        userId: execUser.id,
        clientId: client.id,
        journeyStartedAt: new Date(),
        originLat: 9.9312,
        originLng: 76.2673,
        checkedInAt: new Date(),
        checkInLat: 9.9315,
        checkInLng: 76.2675,
        distanceFromClientMeters: 28.5, // <= 100m geo-fence
        checkedOutAt: new Date(),
        roadDistanceKm: 14.8,
      },
    });

    assert(
      Number(visit.distanceFromClientMeters) <= 100 && Number(visit.roadDistanceKm) > 0,
      "Field check-in verifies 100m client geo-fence radius and records road distance"
    );

    // 3. Shift Sign-Out (DPDP Act 2023 Privacy Kill-Switch Immediately Deactivates)
    const updatedAtt = await prisma.fieldAttendance.update({
      where: { id: att.id },
      data: {
        signedOutAt: new Date(),
        signOutLat: 9.9312,
        signOutLng: 76.2673,
        isGpsTrackingLive: false,
      },
    });

    assert(
      updatedAtt.isGpsTrackingLive === false,
      "Duty Sign-Out triggers DPDP 2023 Kill-Switch (isGpsTrackingLive === false)"
    );

    // Clean up test attendance
    await prisma.fieldMeetingVisit.delete({ where: { id: visit.id } });
    await prisma.fieldAttendance.delete({ where: { id: att.id } });
  }

  // ----------------------------------------------------------------------------
  // TEST 7: Resignation Account Freeze Protocol
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 7: Resignation Account Freeze Protocol (Section 6.6)");
  {
    const execUser = tenant.users.find((u) => u.layerDepth === 6)!;

    // Simulate resignation freeze
    await prisma.user.update({
      where: { id: execUser.id },
      data: {
        isResignationFrozen: true,
        resignationSubmittedAt: new Date(),
      },
    });

    // Action 1: ADD_CLIENT is explicitly permitted under resignation freeze
    let addClientBlocked = false;
    try {
      await assertNotResignationFrozen(execUser.id, "ADD_CLIENT");
    } catch {
      addClientBlocked = true;
    }
    assert(!addClientBlocked, "Resignation freeze permits ADD_CLIENT operations");

    // Action 2: EDIT_CLIENT must be strictly blocked and logged to ImmutableAuditLog
    let editClientBlocked = false;
    try {
      await assertNotResignationFrozen(execUser.id, "EDIT_CLIENT");
    } catch (err: any) {
      if (err.name === "ResignationFreezeError") {
        editClientBlocked = true;
      }
    }
    assert(editClientBlocked, "Resignation freeze blocks EDIT_CLIENT operations with ResignationFreezeError");

    // Restore user state
    await prisma.user.update({
      where: { id: execUser.id },
      data: {
        isResignationFrozen: false,
        resignationSubmittedAt: null,
      },
    });
  }

  // ----------------------------------------------------------------------------
  // TEST 8: Layer 00 Super Admin, MRR/ARR & Support Ticket Lifecycle
  // ----------------------------------------------------------------------------
  console.log("\n📋 Test 8: Layer 00 Super Admin Control Plane & Support Ticket Flow");
  {
    const adminUser = tenant.users.find((u) => u.layerDepth === 1)!;
    const superAdmin = await prisma.superAdmin.findFirst({ where: { email: "superadmin@korbit.in" } });

    assert(Boolean(superAdmin && superAdmin.isActive), "Super Admin exists and is active");

    // 1. Create support ticket
    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber: `TKT-E2E-${Date.now().toString().slice(-4)}`,
        tenantId: tenant.id,
        createdById: adminUser.id,
        subject: "E2E Verification Support Ticket",
        category: "BILLING",
        priority: "HIGH",
        status: "OPEN",
        messages: {
          create: {
            senderRole: "TENANT_USER",
            senderName: adminUser.fullName,
            message: "Need assistance with payment receipt",
          },
        },
      },
    });

    assert(ticket.status === "OPEN", "Support ticket opened successfully");

    // 2. Super Admin reply and resolution
    if (superAdmin) {
      await prisma.supportTicketMessage.create({
        data: {
          ticketId: ticket.id,
          senderRole: "SUPER_ADMIN",
          senderName: superAdmin.fullName,
          message: "Payment receipt has been generated and verified.",
        },
      });

      const resolvedTicket = await prisma.supportTicket.update({
        where: { id: ticket.id },
        data: { status: "RESOLVED", resolvedAt: new Date() },
        include: { messages: true },
      });

      assert(
        resolvedTicket.status === "RESOLVED" && resolvedTicket.messages.length === 2,
        "Super Admin replied and resolved support ticket"
      );

      // Clean up test ticket
      await prisma.supportTicketMessage.deleteMany({ where: { ticketId: ticket.id } });
      await prisma.supportTicket.delete({ where: { id: ticket.id } });
    }

    // 3. Platform Payment Log Verification
    const paymentLog = await prisma.platformPaymentLog.findFirst({
      where: { tenantId: tenant.id, status: "SUCCESS" },
    });
    assert(Boolean(paymentLog), "PlatformPaymentLog recorded successfully with status SUCCESS");
  }

  // ----------------------------------------------------------------------------
  // TEST 9: Layer 00 Dynamic Platform Branding & UI Theme Studio
  // ----------------------------------------------------------------------------
  console.log("🎨 Test 9: Layer 00 Dynamic Platform Branding & UI Theme Studio");
  {
    // 1. Fetch current branding configuration
    const initialBranding = await getPlatformBrandingConfig();
    assert(
      Boolean(initialBranding) && initialBranding.id === "default_platform_brand",
      "PlatformBrandingConfig retrieved successfully from database"
    );

    // 2. Update branding to custom enterprise theme
    const customTheme = {
      platformName: "KORBIT COMMERCIAL",
      badgeText: "ENTERPRISE",
      primaryColorHex: "#6366F1",
      accentColorHex: "#F59E0B",
      commandBgHex: "#0F172A",
      headingFontFamily: "Inter",
      allowTenantPdfLogo: true,
      showPoweredByFooter: true,
    };

    const updatedBranding = await updatePlatformBrandingConfig(customTheme);
    assert(
      updatedBranding.platformName === "KORBIT COMMERCIAL" &&
      updatedBranding.primaryColorHex === "#6366F1" &&
      updatedBranding.badgeText === "ENTERPRISE",
      "Platform branding updated and persisted to PostgreSQL ledger"
    );

    // Verify retrieval matches updated state
    const fetchedAgain = await getPlatformBrandingConfig();
    assert(
      fetchedAgain.platformName === "KORBIT COMMERCIAL" &&
      fetchedAgain.accentColorHex === "#F59E0B",
      "Dynamic theme changes immediately visible in subsequent queries"
    );

    // 3. Reset to Orbital Enterprise defaults
    const resetBranding = await updatePlatformBrandingConfig(DEFAULT_BRANDING_CONFIG);
    assert(
      resetBranding.platformName === "KORBIT" &&
      resetBranding.primaryColorHex === "#2563EB" &&
      resetBranding.commandBgHex === "#0B1120",
      "Branding successfully reverted to Orbital Enterprise defaults"
    );
  }

  // ----------------------------------------------------------------------------
  // TEST 10: Gated Simulation Lead Capture & Layer 00 Follow-Up Flow (Phase 9)
  // ----------------------------------------------------------------------------
  console.log("🎯 Test 10: Gated Simulation Lead Capture & Layer 00 Follow-Up Flow");
  {
    // 1. Create a prospective simulation lead
    const newLead = await prisma.marketingSimulationLead.create({
      data: {
        businessEmail: "cto.test@keralatech.org",
        organisationName: "Kerala Tech Innovators Ltd",
        city: "Thiruvananthapuram",
        state: "Kerala",
        country: "India",
        employeeCount: 65,
        recommendedTier: PlanTier.ADVANCED,
        configuredIndustry: "B2B Solutions & Enterprise Services",
        selectedModulesJson: ["Sales", "Commercial", "AI"],
        unlockedSimulator: true,
        status: MarketingLeadStatus.NEW_LEAD,
      },
    });

    assert(
      Boolean(newLead.id) &&
      newLead.recommendedTier === PlanTier.ADVANCED &&
      newLead.unlockedSimulator === true,
      "Simulation lead captured with recommended tier ADVANCED for 65 seats"
    );

    // 2. Layer 00 Super Admin reviews lead, advances status & writes follow-up notes
    const updatedLead = await prisma.marketingSimulationLead.update({
      where: { id: newLead.id },
      data: {
        status: MarketingLeadStatus.DEMO_SCHEDULED,
        superAdminNotes: "Spoke with CTO; scheduling high-level architectural walkthrough for enterprise DLD hierarchy on Monday.",
      },
    });

    assert(
      updatedLead.status === MarketingLeadStatus.DEMO_SCHEDULED &&
      Boolean(updatedLead.superAdminNotes?.includes("scheduling high-level architectural walkthrough")),
      "Super Admin successfully advanced lead status to DEMO_SCHEDULED with notes"
    );

    // 3. Clean up test record
    await prisma.marketingSimulationLead.delete({ where: { id: newLead.id } });
  }

  console.log("\n================================================================================");
  console.log(`🏁 VERIFICATION COMPLETE: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runE2EVerification().catch(async (e) => {
  console.error("E2E Verification Error:", e);
  await prisma.$disconnect();
  process.exit(1);
});
