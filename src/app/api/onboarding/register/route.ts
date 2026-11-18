import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Razorpay from "razorpay";
import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/pricing";
import { hashPassword } from "@/lib/auth-utils";
import { seedDefaultApprovalMatrix } from "@/lib/discount-escalation";
import { logImmutableAudit } from "@/lib/audit";
import {
  DepartmentType,
  RoleLevel,
  BillingCycle,
  SubscriptionStatus,
} from "@prisma/client";

const RegisterSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  adminFullName: z.string().min(2, "Admin full name is required"),
  adminEmail: z.string().email("Invalid admin email address"),
  adminDesignation: z.string().min(2, "Admin designation is required"),
  adminContactNumber: z.string().min(10, "Valid 10-digit contact number is required"),
  declaredEmployeeCount: z.coerce.number().int().positive("Employee count must be > 0"),
  countryRegion: z.string().default("India"),
  operatingState: z.string().default("Kerala"),
  industryType: z.string().min(2, "Industry type is required"),
  billingCycle: z.nativeEnum(BillingCycle).default(BillingCycle.MONTHLY),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = RegisterSchema.parse(body);

    // 1. Check if email is already registered
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.adminEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "An administrator with this email address is already registered." },
        { status: 400 }
      );
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { adminEmail: validated.adminEmail },
    });
    if (existingTenant) {
      return NextResponse.json(
        { error: "A tenant organization with this admin email already exists." },
        { status: 400 }
      );
    }

    // 2. Compute dynamic pricing tier & totals
    const pricing = calculatePricing(
      validated.declaredEmployeeCount,
      validated.billingCycle
    );

    // 3. Create Tenant and Admin User inside an atomic transaction
    const { tenant, adminUser } = await prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          companyName: validated.companyName,
          adminEmail: validated.adminEmail,
          adminDesignation: validated.adminDesignation,
          adminContactNumber: validated.adminContactNumber,
          declaredEmployeeCount: pricing.declaredEmployeeCount,
          countryRegion: validated.countryRegion,
          operatingState: validated.operatingState,
          industryType: validated.industryType,
          planTier: pricing.planTier,
          billingCycle: validated.billingCycle,
          pricePerUserInr: pricing.pricePerUserMonthlyInr,
          subscriptionStatus: SubscriptionStatus.PENDING_PAYMENT,
          isTeamSetupUnlocked: false,
        },
      });

      // Layer 01 Admin
      const createdAdmin = await tx.user.create({
        data: {
          tenantId: createdTenant.id,
          employeeCode: `ADM-${Date.now().toString().slice(-4)}`,
          fullName: validated.adminFullName,
          email: validated.adminEmail,
          mobile: validated.adminContactNumber,
          designation: validated.adminDesignation,
          passwordHash: hashPassword(validated.password),
          department: DepartmentType.ADMIN,
          roleLevel: RoleLevel.LAYER_01_ADMIN,
          layerDepth: 1,
          materializedPath: "/TEMP/",
          mustResetPassword: false,
        },
      });

      // Materialized path: "/<adminId>/"
      const finalAdmin = await tx.user.update({
        where: { id: createdAdmin.id },
        data: {
          materializedPath: `/${createdAdmin.id}/`,
        },
      });

      return { tenant: createdTenant, adminUser: finalAdmin };
    });

    // 4. Seed the 6 Dual-Gate discount rules for the new tenant
    await seedDefaultApprovalMatrix(tenant.id);

    // 5. Create Razorpay order (with seamless local dev fallback)
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let razorpayOrderId = `order_mock_${Date.now()}`;

    if (
      keyId &&
      keySecret &&
      !keyId.includes("placeholder") &&
      !keySecret.includes("placeholder")
    ) {
      try {
        const razorpay = new Razorpay({
          key_id: keyId,
          key_secret: keySecret,
        });

        const order = await razorpay.orders.create({
          amount: pricing.totalPayablePaise,
          currency: "INR",
          receipt: `rcpt_${tenant.id.slice(0, 10)}`,
          notes: {
            tenantId: tenant.id,
            companyName: tenant.companyName,
            planTier: pricing.planTier,
          },
        });
        razorpayOrderId = order.id;
      } catch (rzpErr) {
        console.warn("Razorpay API live call failed, falling back to mock order ID:", rzpErr);
      }
    }

    // Update Tenant with razorpayOrderId
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { razorpayOrderId },
    });

    // Record PlatformPaymentLog for Layer 00 ledger
    await prisma.platformPaymentLog.create({
      data: {
        tenantId: tenant.id,
        gatewayProvider: "RAZORPAY",
        gatewayOrderId: razorpayOrderId,
        amountInr: pricing.totalPayablePaise / 100,
        planTier: pricing.planTier,
        billingCycle: validated.billingCycle,
        employeeCount: pricing.declaredEmployeeCount,
        status: "INITIATED",
        rawMetadataJson: {
          subtotalInr: pricing.subtotalInr,
          gstInr: pricing.gstAmountInr,
          totalPayableInr: pricing.totalPayableInr,
          discountInr: pricing.discountAmountInr,
        },
      },
    });

    // 6. Log immutable audit entry
    await logImmutableAudit({
      tenantId: tenant.id,
      actorId: adminUser.id,
      entityType: "Tenant",
      entityId: tenant.id,
      action: "TENANT_REGISTERED",
      oldValueJson: null,
      newValueJson: {
        companyName: tenant.companyName,
        planTier: pricing.planTier,
        billingCycle: tenant.billingCycle,
        employeeCount: tenant.declaredEmployeeCount,
        pricing,
        razorpayOrderId,
      },
    });

    return NextResponse.json({
      success: true,
      tenantId: tenant.id,
      adminId: adminUser.id,
      orderId: razorpayOrderId,
      pricing,
      razorpayKeyId: keyId ?? "rzp_test_placeholder",
    });
  } catch (error: unknown) {
    console.error("Onboarding register error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
