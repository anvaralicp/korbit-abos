import { PrismaClient, PlanTier, BillingCycle, SubscriptionStatus, DepartmentType, RoleLevel, ZoneCode, ProductUnit, PipelineStage, CallNature, ApprovalStatus, CorrectionActionType, CorrectionStatus, VehicleType, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus, PaymentGatewayProvider, PaymentLogStatus, MarketingLeadStatus } from "@prisma/client";
import { hashPassword } from "../src/lib/auth-utils";
import { seedDefaultApprovalMatrix } from "../src/lib/discount-escalation";
import { logImmutableAudit } from "../src/lib/audit";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting KORBIT ABOS Demo Seeder...");

  // 1. Clean existing demo data if re-seeding
  const existingTenant = await prisma.tenant.findFirst({
    where: { adminEmail: "admin@korbit.in" },
  });

  if (existingTenant) {
    console.log("Cleaning previous demo tenant data...");
    await prisma.supportTicketMessage.deleteMany({ where: { ticket: { tenantId: existingTenant.id } } });
    await prisma.supportTicket.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.platformPaymentLog.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.fieldMeetingVisit.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.fieldAttendance.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.monthlyHrReport.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.discountApprovalRequest.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.dealLineItem.deleteMany({ where: { deal: { tenantId: existingTenant.id } } });
    await prisma.deal.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.clientCorrectionRequest.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.client.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.salesTarget.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.product.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.approvalMatrixRule.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.stateDivision.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.stateRegion.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.zone.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.immutableAuditLog.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.user.deleteMany({ where: { tenantId: existingTenant.id } });
    await prisma.tenant.delete({ where: { id: existingTenant.id } });
  }

  // 2. Create Demo Tenant
  const tenant = await prisma.tenant.create({
    data: {
      companyName: "KORBIT Enterprise Demo Pvt Ltd",
      adminEmail: "admin@korbit.in",
      adminDesignation: "Chief Executive Officer",
      adminContactNumber: "+91 9847001001",
      declaredEmployeeCount: 150,
      operatingState: "Kerala",
      industryType: "Manufacturing & Distribution",
      planTier: PlanTier.PREMIUM,
      billingCycle: BillingCycle.ANNUAL,
      pricePerUserInr: 999.0,
      subscriptionStatus: SubscriptionStatus.ACTIVE,
      isTeamSetupUnlocked: true,
      travelRateTwoWheelerInr: 6.0,
      travelRateFourWheelerInr: 10.0,
    },
  });

  console.log(`✅ Tenant created: ${tenant.companyName} (${tenant.id})`);

  // Seed 6 Dual-Gate rules for tenant
  await seedDefaultApprovalMatrix(tenant.id);

  // 3. Create South Zone -> Kerala -> 4 Mandatory Divisions
  const zone = await prisma.zone.create({
    data: {
      tenantId: tenant.id,
      zoneCode: ZoneCode.SOUTH,
      name: "South Zone",
    },
  });

  const stateRegion = await prisma.stateRegion.create({
    data: {
      tenantId: tenant.id,
      zoneId: zone.id,
      stateName: "Kerala",
    },
  });

  const [divKochi, divKozhikode, divThrissur, divTrivandrum] = await Promise.all([
    prisma.stateDivision.create({
      data: { tenantId: tenant.id, stateRegionId: stateRegion.id, divisionName: "Kochi Division" },
    }),
    prisma.stateDivision.create({
      data: { tenantId: tenant.id, stateRegionId: stateRegion.id, divisionName: "Kozhikode Division" },
    }),
    prisma.stateDivision.create({
      data: { tenantId: tenant.id, stateRegionId: stateRegion.id, divisionName: "Thrissur Division" },
    }),
    prisma.stateDivision.create({
      data: { tenantId: tenant.id, stateRegionId: stateRegion.id, divisionName: "Trivandrum Division" },
    }),
  ]);

  console.log(`✅ Geographic Zone (South) & 4 Divisions created.`);

  const defaultPasswordHash = hashPassword("Korbit#Demo2026");

  // 4. Build Full 6-Layer Hierarchy Tree
  // Layer 01: Admin
  const admin = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      employeeCode: "ADM-001",
      fullName: "Rajesh Menon (Admin)",
      email: "admin@korbit.in",
      mobile: "+91 9847001001",
      designation: "Chief Executive Officer",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.ADMIN,
      roleLevel: RoleLevel.LAYER_01_ADMIN,
      layerDepth: 1,
      materializedPath: "/TEMP/",
      mustResetPassword: false,
    },
  });
  await prisma.user.update({
    where: { id: admin.id },
    data: { materializedPath: `/${admin.id}/` },
  });

  // Layer 02: Department Heads
  const salesHead = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: admin.id,
      employeeCode: "SAL-001",
      fullName: "Vikram Rathore (Sales Head)",
      email: "saleshead@korbit.in",
      mobile: "+91 9847002001",
      designation: "Vice President - Commercial Sales",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.SALES,
      roleLevel: RoleLevel.LAYER_02_DEPT_HEAD,
      layerDepth: 2,
      materializedPath: `/${admin.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 120000,
    },
  });
  await prisma.user.update({
    where: { id: salesHead.id },
    data: { materializedPath: `/${admin.id}/${salesHead.id}/` },
  });

  const hrHead = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: admin.id,
      employeeCode: "HRD-001",
      fullName: "Ananya Sen (HR Head)",
      email: "hr@korbit.in",
      mobile: "+91 9847002002",
      designation: "Head of Human Resources",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.HR,
      roleLevel: RoleLevel.LAYER_02_DEPT_HEAD,
      layerDepth: 2,
      materializedPath: `/${admin.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 110000,
    },
  });
  await prisma.user.update({
    where: { id: hrHead.id },
    data: { materializedPath: `/${admin.id}/${hrHead.id}/` },
  });

  const commercialHead = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: admin.id,
      employeeCode: "COM-001",
      fullName: "Siddharth Roy (Commercial Head)",
      email: "commercial@korbit.in",
      mobile: "+91 9847002003",
      designation: "Head of Commercial & Finance",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.COMMERCIAL,
      roleLevel: RoleLevel.LAYER_02_DEPT_HEAD,
      layerDepth: 2,
      materializedPath: `/${admin.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 115000,
    },
  });
  await prisma.user.update({
    where: { id: commercialHead.id },
    data: { materializedPath: `/${admin.id}/${commercialHead.id}/` },
  });

  // Layer 03: South Zone Manager
  const zoneMgr = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: salesHead.id,
      zoneId: zone.id,
      employeeCode: "ZON-001",
      fullName: "Arun Krishnan (Zone Head)",
      email: "southzone@korbit.in",
      mobile: "+91 9847003001",
      designation: "Zonal Sales Manager - South",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.SALES,
      roleLevel: RoleLevel.LAYER_03_ZONE_MANAGER,
      layerDepth: 3,
      materializedPath: `/${admin.id}/${salesHead.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 85000,
    },
  });
  await prisma.user.update({
    where: { id: zoneMgr.id },
    data: { materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/` },
  });
  await prisma.zone.update({
    where: { id: zone.id },
    data: { zoneHeadId: zoneMgr.id },
  });

  // Layer 04: Kerala Region Manager
  const regionMgr = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: zoneMgr.id,
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      employeeCode: "REG-001",
      fullName: "Deepak Nair (Region Manager)",
      email: "kerala@korbit.in",
      mobile: "+91 9847004001",
      designation: "Regional Sales Manager - Kerala",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.SALES,
      roleLevel: RoleLevel.LAYER_04_REGION_MANAGER,
      layerDepth: 4,
      materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 65000,
    },
  });
  await prisma.user.update({
    where: { id: regionMgr.id },
    data: { materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/${regionMgr.id}/` },
  });

  // Layer 05: Kochi City Manager
  const cityMgr = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: regionMgr.id,
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      divisionId: divKochi.id,
      employeeCode: "CTY-001",
      fullName: "Manoj Varma (City Manager)",
      email: "kochi@korbit.in",
      mobile: "+91 9847005001",
      designation: "City Sales Manager - Kochi",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.SALES,
      roleLevel: RoleLevel.LAYER_05_CITY_MANAGER,
      layerDepth: 5,
      materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/${regionMgr.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 50000,
    },
  });
  await prisma.user.update({
    where: { id: cityMgr.id },
    data: { materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/${regionMgr.id}/${cityMgr.id}/` },
  });

  // Layer 06: Field Executive (Rahul Sharma)
  const rahul = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      managerId: cityMgr.id,
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      divisionId: divKochi.id,
      employeeCode: "EMP0234",
      fullName: "Rahul Sharma",
      email: "rahul@korbit.in",
      mobile: "+91 9847006001",
      designation: "Senior Field Sales Executive",
      passwordHash: defaultPasswordHash,
      department: DepartmentType.SALES,
      roleLevel: RoleLevel.LAYER_06_EXECUTIVE,
      layerDepth: 6,
      materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/${regionMgr.id}/${cityMgr.id}/TEMP/`,
      mustResetPassword: false,
      baseSalaryInr: 35000,
      vehicleType: VehicleType.FOUR_WHEELER,
    },
  });
  await prisma.user.update({
    where: { id: rahul.id },
    data: { materializedPath: `/${admin.id}/${salesHead.id}/${zoneMgr.id}/${regionMgr.id}/${cityMgr.id}/${rahul.id}/` },
  });

  console.log(`✅ 6-Layer DLD Hierarchy established.`);

  // 5. Create Product Master Catalog (4 items @ 18% GST)
  const [prodA, prodB, servX, servY] = await Promise.all([
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        productCode: "PROD-A01",
        name: "Product A",
        unit: ProductUnit.UNIT,
        unitPriceInr: 1000.0,
        hsnSacCode: "84713000",
        gstRatePercent: 18.0,
        description: "Heavy-duty industrial polymer enclosure units",
        deliverables: "High-grade IP67 polymer units, standard packaging, factory QC certificate",
        termsAndConditions: "Payment 30 days net from invoice date. 1-year replacement warranty against manufacturing defects.",
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        productCode: "PROD-B02",
        name: "Product B",
        unit: ProductUnit.UNIT,
        unitPriceInr: 500.0,
        hsnSacCode: "84713010",
        gstRatePercent: 18.0,
        description: "Standard auxiliary steel mounting brackets and fasteners",
        deliverables: "Zinc-plated stainless mounting brackets with hardware accessories",
        termsAndConditions: "15 days net credit. Ex-factory dispatch within 3 business days of PO.",
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        productCode: "SERV-X01",
        name: "Service X",
        unit: ProductUnit.HOUR,
        unitPriceInr: 2000.0,
        hsnSacCode: "998313",
        gstRatePercent: 18.0,
        description: "On-site preventative telemetry calibration & diagnostics",
        deliverables: "Certified technician on-site audit, electrical calibration, diagnostic health report",
        termsAndConditions: "Billed quarterly in advance. Service SLA: 4 hours emergency dispatch.",
      },
    }),
    prisma.product.create({
      data: {
        tenantId: tenant.id,
        productCode: "SERV-Y02",
        name: "Service Y",
        unit: ProductUnit.MONTH,
        unitPriceInr: 15000.0,
        hsnSacCode: "998314",
        gstRatePercent: 18.0,
        description: "Enterprise 24/7 AI telemetry monitoring & ERP sync",
        deliverables: "Dedicated cloud sync pipeline, automated anomaly alerting, weekly executive review",
        termsAndConditions: "Minimum 12 months subscription contract. 50% quarterly advance billing.",
      },
    }),
  ]);

  console.log(`✅ 4 Master Products created.`);

  // 6. Seed Quarterly Sales Targets
  const now = new Date();
  const qStart = new Date(now.getFullYear(), 0, 1);
  const qEnd = new Date(now.getFullYear(), 11, 31);

  await Promise.all([
    prisma.salesTarget.create({
      data: {
        tenantId: tenant.id,
        assignedById: admin.id,
        assignedToId: salesHead.id,
        periodType: "YEARLY",
        periodLabel: "FY2026-27",
        startDate: qStart,
        endDate: qEnd,
        targetAmountInr: 50000000,
        achievedAmountInr: 43500000,
      },
    }),
    prisma.salesTarget.create({
      data: {
        tenantId: tenant.id,
        assignedById: salesHead.id,
        assignedToId: zoneMgr.id,
        periodType: "YEARLY",
        periodLabel: "FY2026-27",
        startDate: qStart,
        endDate: qEnd,
        targetAmountInr: 20000000,
        achievedAmountInr: 16800000,
      },
    }),
    prisma.salesTarget.create({
      data: {
        tenantId: tenant.id,
        assignedById: zoneMgr.id,
        assignedToId: regionMgr.id,
        periodType: "YEARLY",
        periodLabel: "FY2026-27",
        startDate: qStart,
        endDate: qEnd,
        targetAmountInr: 8000000,
        achievedAmountInr: 6100000,
      },
    }),
    prisma.salesTarget.create({
      data: {
        tenantId: tenant.id,
        assignedById: regionMgr.id,
        assignedToId: cityMgr.id,
        periodType: "YEARLY",
        periodLabel: "FY2026-27",
        startDate: qStart,
        endDate: qEnd,
        targetAmountInr: 3000000,
        achievedAmountInr: 2200000,
      },
    }),
    prisma.salesTarget.create({
      data: {
        tenantId: tenant.id,
        assignedById: cityMgr.id,
        assignedToId: rahul.id,
        periodType: "YEARLY",
        periodLabel: "FY2026-27",
        startDate: qStart,
        endDate: qEnd,
        targetAmountInr: 1000000,
        achievedAmountInr: 650000,
      },
    }),
  ]);

  // 7. Seed Sample Clients & Deals
  // Client 1: Fosroc India (Proposal Stage)
  const clientFosroc = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      clientCode: "FOS240315",
      companyName: "Fosroc Chemicals India Pvt Ltd",
      address: "Plot 42, Willingdon Island Industrial Belt",
      city: "Kochi",
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      divisionId: divKochi.id,
      contactName: "Rajesh Ramachandran",
      contactDesignation: "Head of Infrastructure Procurement",
      contactEmail: "rajesh.r@fosroc.com",
      contactMobile: "+91 9847111222",
      gstNumber: "32AAACF1234F1Z5",
      panNumber: "AAACF1234F",
      gpsLat: 9.9482,
      gpsLng: 76.2754,
      currentStage: PipelineStage.STAGE_4_PROPOSAL,
      statusLabel: "Proposal stage",
      createdById: rahul.id,
      isLocked: true,
      latestRemarks: "Client requested itemized Proposal PDF for 100 units of Product A with 30-day payment term.",
    },
  });

  const dealFosroc = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      dealCode: "DEAL-2026-0001",
      clientId: clientFosroc.id,
      ownerId: rahul.id,
      stage: PipelineStage.STAGE_4_PROPOSAL,
      natureOfCall: CallNature.WARM,
      subtotalInr: 100000.0,
      cgstInr: 9000.0,
      sgstInr: 9000.0,
      igstInr: 0.0,
      totalAmountInr: 118000.0,
      proposalValidUntil: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      proposalSentAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      lineItems: {
        create: [
          {
            productId: prodA.id,
            quantity: 100,
            actualUnitPriceInr: 1000.0,
            offeredUnitPriceInr: 1000.0,
            discountPercent: 0.0,
            gstRatePercent: 18.0,
            lineSubtotalInr: 100000.0,
            lineTotalWithGstInr: 118000.0,
          },
        ],
      },
    },
    include: { lineItems: true },
  });

  // Client 2: Apollo Tyres (Negotiation Stage with Pending 12% Discount Request)
  const clientApollo = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      clientCode: "APL261110",
      companyName: "Apollo Tyres Manufacturing Hub",
      address: "NH 544, Perambra",
      city: "Thrissur",
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      divisionId: divThrissur.id,
      contactName: "Sunil Kulkarni",
      contactDesignation: "General Manager - Maintenance",
      contactEmail: "sunil.kulkarni@apollotyres.com",
      contactMobile: "+91 9847222333",
      gstNumber: "32AAACA5678A1Z1",
      panNumber: "AAACA5678A",
      gpsLat: 10.3642,
      gpsLng: 76.3218,
      currentStage: PipelineStage.STAGE_5_NEGOTIATION,
      statusLabel: "Negotiation stage - 12% Discount Pending",
      createdById: rahul.id,
      isLocked: true,
      latestRemarks: "Client requires 5 months of Service Y at ₹13,200/mo (12% off master rate of ₹15,000). Total order ₹75,000.",
    },
  });

  const dealApollo = await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      dealCode: "DEAL-2026-0002",
      clientId: clientApollo.id,
      ownerId: rahul.id,
      stage: PipelineStage.STAGE_5_NEGOTIATION,
      natureOfCall: CallNature.HOT,
      subtotalInr: 66000.0,
      cgstInr: 5940.0,
      sgstInr: 5940.0,
      igstInr: 0.0,
      totalAmountInr: 77880.0,
      lineItems: {
        create: [
          {
            productId: servY.id,
            quantity: 5,
            actualUnitPriceInr: 15000.0,
            offeredUnitPriceInr: 13200.0,
            discountPercent: 12.0,
            gstRatePercent: 18.0,
            lineSubtotalInr: 66000.0,
            lineTotalWithGstInr: 77880.0,
          },
        ],
      },
    },
    include: { lineItems: true },
  });

  // Pending 12% Discount Approval Request for Apollo Tyres line item
  // 12% discount exceeds Level 4 (10%) -> Escalates to Level 3 (Region Manager: Deepak Nair) with 8h SLA
  const lineItemApollo = dealApollo.lineItems[0];
  const slaExpiresAt = new Date(Date.now() + 5.5 * 3600 * 1000); // 5h 30m remaining

  await prisma.discountApprovalRequest.create({
    data: {
      tenantId: tenant.id,
      dealId: dealApollo.id,
      dealLineItemId: lineItemApollo.id,
      requestedById: rahul.id,
      currentApproverId: regionMgr.id,
      currentApprovalLevel: 3, // Level 3: Region Manager
      actualPriceInr: 15000.0,
      expectedPriceInr: 13200.0,
      offeredPriceInr: 13200.0,
      discountPercent: 12.0,
      totalDiscountValueInr: 9000.0,
      status: ApprovalStatus.PENDING,
      slaHoursAllocated: 8,
      slaExpiresAt,
      escalationHistoryJson: [
        {
          timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
          note: "Submitted by Rahul Sharma. 12% discount exceeds City Manager threshold. Routed directly to Level 3 (Region Manager).",
        },
      ],
    },
  });

  // Client 3: Carborundum Universal (Stage 6 Closed Won - Commercial Handoff)
  const clientCarbo = await prisma.client.create({
    data: {
      tenantId: tenant.id,
      clientCode: "CUM261005",
      companyName: "Carborundum Universal Limited",
      address: "Kalamassery High-Tech Industrial Zone",
      city: "Kochi",
      zoneId: zone.id,
      stateRegionId: stateRegion.id,
      divisionId: divKochi.id,
      contactName: "Mathew Kurian",
      contactDesignation: "Director - Plant Engineering",
      contactEmail: "kurian.m@carborundum.com",
      contactMobile: "+91 9847333444",
      gstNumber: "32AAACC9988C1Z3",
      panNumber: "AAACC9988C",
      gpsLat: 10.0528,
      gpsLng: 76.3312,
      currentStage: PipelineStage.STAGE_6_CLOSED_WON,
      statusLabel: "Sale Confirmed - Commercial KYC Handoff",
      createdById: rahul.id,
      isLocked: true,
      latestRemarks: "Sale closed won! PO #PO-CUM-887 received. All 3 KYC documents attached for Commercial team verification.",
    },
  });

  await prisma.deal.create({
    data: {
      tenantId: tenant.id,
      dealCode: "DEAL-2026-0003",
      clientId: clientCarbo.id,
      ownerId: rahul.id,
      stage: PipelineStage.STAGE_6_CLOSED_WON,
      natureOfCall: CallNature.HOT,
      subtotalInr: 300000.0,
      cgstInr: 27000.0,
      sgstInr: 27000.0,
      igstInr: 0.0,
      totalAmountInr: 354000.0,
      isSaleConfirmed: true,
      confirmedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      handedOffToCommercial: true,
      requiredKycDocsList: ["GST Certificate", "PAN Card", "Cancelled Cheque"],
      lineItems: {
        create: [
          {
            productId: prodA.id,
            quantity: 300,
            actualUnitPriceInr: 1000.0,
            offeredUnitPriceInr: 1000.0,
            discountPercent: 0.0,
            gstRatePercent: 18.0,
            lineSubtotalInr: 300000.0,
            lineTotalWithGstInr: 354000.0,
          },
        ],
      },
    },
  });

  // 8. Pending Client Correction Request for Admin Queue
  await prisma.clientCorrectionRequest.create({
    data: {
      tenantId: tenant.id,
      clientId: clientFosroc.id,
      requestedById: cityMgr.id,
      actionType: CorrectionActionType.UPDATE_CLIENT,
      originalValuesJson: {
        companyName: clientFosroc.companyName,
        gstNumber: clientFosroc.gstNumber,
        officeNumber: null,
      },
      requestedValuesJson: {
        gstNumber: "32AAACF1234F1Z8",
        officeNumber: "+91 484 2668000",
      },
      reason: "Client GSTIN updated post corporate merger. Requires admin unlock to update master record.",
      status: CorrectionStatus.PENDING_ADMIN,
    },
  });

  // 9. Monthly HR Travel Allowance Report for Rahul Sharma (12 visits, 385.6 km, ₹3,856)
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  await prisma.monthlyHrReport.create({
    data: {
      tenantId: tenant.id,
      userId: rahul.id,
      monthYear: currentMonthYear,
      daysWorked: 18,
      leavesTaken: 1,
      totalFieldVisits: 12,
      totalTravelDistanceKm: 385.6,
      ratePerKmInr: 10.0,
      travelAllowanceInr: 3856.0,
      incentivesInr: 15000.0,
      netPayableInr: 53856.0, // Base ₹35,000 + ₹3,856 + ₹15,000
    },
  });

  // 10. Immutable Audit Ledger Sample Records
  await logImmutableAudit({
    tenantId: tenant.id,
    actorId: admin.id,
    entityType: "Tenant",
    entityId: tenant.id,
    action: "TENANT_REGISTERED",
    oldValueJson: null,
    newValueJson: { companyName: tenant.companyName, planTier: tenant.planTier },
  });

  await logImmutableAudit({
    tenantId: tenant.id,
    actorId: admin.id,
    entityType: "Tenant",
    entityId: tenant.id,
    action: "ORGANIZATION_SETUP_COMPLETED",
    oldValueJson: null,
    newValueJson: { zonesCount: 1, divisionsCount: 4, departmentHeads: 3 },
  });

  await logImmutableAudit({
    tenantId: tenant.id,
    actorId: rahul.id,
    entityType: "Client",
    entityId: clientFosroc.id,
    action: "CLIENT_INTAKE_CREATED",
    oldValueJson: null,
    newValueJson: { clientCode: clientFosroc.clientCode, isLocked: true },
  });

  // 13. Create / Upsert Layer 00 Super Admin
  const superAdminPasswordHash = hashPassword("Korbit#SuperAdmin2026");
  const superAdmin = await prisma.superAdmin.upsert({
    where: { email: "superadmin@korbit.in" },
    update: {
      fullName: "KORBIT Platform Owner",
      passwordHash: superAdminPasswordHash,
      isActive: true,
    },
    create: {
      email: "superadmin@korbit.in",
      fullName: "KORBIT Platform Owner",
      passwordHash: superAdminPasswordHash,
      isActive: true,
    },
  });

  // 14. Create Sample Platform Payment Log
  await prisma.platformPaymentLog.create({
    data: {
      tenantId: tenant.id,
      amountInr: 1618380.0,
      gatewayProvider: PaymentGatewayProvider.RAZORPAY,
      status: PaymentLogStatus.SUCCESS,
      gatewayOrderId: "order_demo_annual_2026",
      gatewayPaymentId: "pay_demo_success_99812",
      planTier: tenant.planTier,
      billingCycle: tenant.billingCycle,
      employeeCount: tenant.declaredEmployeeCount,
      rawMetadataJson: { note: "Annual subscription payment for KORBIT Enterprise Demo Pvt Ltd" },
    },
  });

  // 15. Create Sample Support Ticket & Thread
  await prisma.supportTicket.create({
    data: {
      ticketNumber: "TKT-1001",
      tenantId: tenant.id,
      createdById: admin.id,
      subject: "GST Invoice copy request for Annual Premium Plan",
      category: SupportTicketCategory.BILLING,
      priority: SupportTicketPriority.HIGH,
      status: SupportTicketStatus.OPEN,
      messages: {
        create: [
          {
            senderRole: "TENANT_USER",
            senderName: admin.fullName,
            message: "Hello team, we have completed our annual subscription payment. Could you please send our B2B tax invoice with GSTIN included?",
          },
          {
            senderRole: "SUPER_ADMIN",
            senderName: superAdmin.fullName,
            message: "Greetings! We have verified your transaction. The GST B2B invoice will be issued to your billing portal shortly.",
          },
        ],
      },
    },
  });

  // 16. Upsert Singleton Layer 00 Platform Branding Configuration
  await prisma.platformBrandingConfig.upsert({
    where: { id: "default_platform_brand" },
    update: {
      platformName: "KORBIT",
      badgeText: "ABOS",
      tagline: "The Autonomous Business Operating System",
      commandBgHex: "#0B1120",
      primaryColorHex: "#2563EB",
      accentColorHex: "#10B981",
      surfaceBgHex: "#F8FAFC",
      headingFontFamily: "Plus Jakarta Sans",
      monoFontFamily: "JetBrains Mono",
    },
    create: {
      id: "default_platform_brand",
      platformName: "KORBIT",
      badgeText: "ABOS",
      tagline: "The Autonomous Business Operating System",
      supportEmail: "support@korbit.in",
      footerCopyright: "© 2026 KORBIT ABOS Technologies. All rights reserved.",
      commandBgHex: "#0B1120",
      primaryColorHex: "#2563EB",
      accentColorHex: "#10B981",
      surfaceBgHex: "#F8FAFC",
      headingFontFamily: "Plus Jakarta Sans",
      monoFontFamily: "JetBrains Mono",
      useDynamicOrbitalSvg: true,
      allowTenantPdfLogo: true,
      showPoweredByFooter: true,
    },
  });

  // 17. Seed Sample Marketing Simulation Leads (Phase 9)
  await prisma.marketingSimulationLead.deleteMany({});
  await prisma.marketingSimulationLead.createMany({
    data: [
      {
        businessEmail: "vikram@apexmanufacturing.in",
        organisationName: "Apex Heavy Industries Pvt Ltd",
        city: "Coimbatore",
        state: "Tamil Nadu",
        country: "India",
        employeeCount: 180,
        recommendedTier: PlanTier.PREMIUM,
        configuredIndustry: "Manufacturing & Industrial",
        selectedModulesJson: ["Sales", "Manufacturing", "Commercial", "AI"],
        unlockedSimulator: true,
        status: MarketingLeadStatus.NEW_LEAD,
        superAdminNotes: "Interested in automated dual-gate discount workflow for regional dealers.",
      },
      {
        businessEmail: "meera.nair@malabardistributors.com",
        organisationName: "Malabar FMCG Distribution Network",
        city: "Kochi",
        state: "Kerala",
        country: "India",
        employeeCount: 45,
        recommendedTier: PlanTier.ADVANCED,
        configuredIndustry: "FMCG & Multi-State Distribution",
        selectedModulesJson: ["Sales", "HR", "Commercial"],
        unlockedSimulator: true,
        status: MarketingLeadStatus.DEMO_SCHEDULED,
        superAdminNotes: "Demo scheduled for Friday 3 PM with Managing Director. Focus on 100m GPS field check-in.",
      },
    ],
  });

  console.log("✅ Seed complete! All demo nodes, products, deals, and reports populated.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Seeding error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
