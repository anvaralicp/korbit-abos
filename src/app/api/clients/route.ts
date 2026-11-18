import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { assertNotResignationFrozen, requestOrApplyClientModification } from "@/lib/security-guards";
import { getClientVisibilityFilter } from "@/lib/dld-hierarchy";
import { logImmutableAudit } from "@/lib/audit";
import { sendClientIntroductoryEmail } from "@/lib/mailer";
import {
  PipelineStage,
  CallNature,
  LeadSource,
  RoleLevel,
} from "@prisma/client";

const CreateClientSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  address: z.string().min(3, "Address is required"),
  zoneId: z.string().min(1, "Zone ID is required"),
  stateRegionId: z.string().min(1, "State Region ID is required"),
  divisionId: z.string().min(1, "Division ID is required"),
  city: z.string().min(2, "City is required"),
  officeNumber: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),

  // Primary Contact
  contactName: z.string().min(2, "Contact name is required"),
  contactDesignation: z.string().min(2, "Contact designation is required"),
  contactEmail: z.string().email("Valid email is required"),
  contactMobile: z.string().min(10, "Valid 10-digit mobile is required"),

  // Optional KYC / Tax info
  gstNumber: z.string().optional(),
  panNumber: z.string().optional(),

  leadSource: z.nativeEnum(LeadSource).default(LeadSource.COLD_CALL),
  natureOfCall: z.nativeEnum(CallNature).default(CallNature.COLD),
  meetingScheduledAtFirstCall: z.boolean().default(false),
  meetingDate: z.string().datetime().optional(),
  initialRemarks: z.string().optional(),
});

function generateClientCode(companyName: string, countToday: number): string {
  const prefix = companyName
    .replace(/[^A-Za-z]/g, "")
    .slice(0, 3)
    .toUpperCase()
    .padEnd(3, "X");

  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const seq = String(countToday + 1).padStart(2, "0");

  return `${prefix}${yy}${mm}${dd}${seq}`;
}

/**
 * GET /api/clients
 * Returns client records respecting DLD hierarchy visibility.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") as PipelineStage | null;
    const search = searchParams.get("search");

    // DLD visibility: Admin sees all; officers see clients created by their subordinate chain
    const visibilityFilter =
      auth.roleLevel === RoleLevel.LAYER_01_ADMIN
        ? {}
        : getClientVisibilityFilter(auth);

    const where: any = {
      tenantId: auth.tenantId,
      ...visibilityFilter,
    };

    if (stage) {
      where.currentStage = stage;
    }

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { clientCode: { contains: search, mode: "insensitive" } },
        { contactName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      include: {
        zone: { select: { name: true, zoneCode: true } },
        stateRegion: { select: { stateName: true } },
        division: { select: { divisionName: true } },
        createdBy: { select: { id: true, fullName: true, employeeCode: true } },
        deals: {
          select: { id: true, dealCode: true, stage: true, totalAmountInr: true },
          take: 3,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, clients });
  } catch (err: any) {
    console.error("GET /api/clients error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch clients" }, { status: 500 });
  }
}

/**
 * POST /api/clients
 * Client intake workflow with resignation freeze check and automatic deal generation.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Enforce Resignation Freeze guard (permits ADD_CLIENT)
    await assertNotResignationFrozen(auth.userId, "ADD_CLIENT");

    const body = await req.json();
    const validated = CreateClientSchema.parse(body);

    // 2. Generate client code: 3-letter prefix + YYMMDD + 2-digit sequence
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const countToday = await prisma.client.count({
      where: {
        tenantId: auth.tenantId,
        createdAt: { gte: startOfToday },
      },
    });

    const clientCode = generateClientCode(validated.companyName, countToday);

    const hasMeeting = validated.meetingScheduledAtFirstCall;
    const statusLabel = hasMeeting ? "Meeting Fixed" : "Introductory Email Sent";
    const initialStage = hasMeeting
      ? PipelineStage.STAGE_3_MEETING
      : PipelineStage.STAGE_2_INTRODUCTORY;

    // 3. Create Client and initial Deal in an atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          tenantId: auth.tenantId,
          clientCode,
          companyName: validated.companyName,
          address: validated.address,
          zoneId: validated.zoneId,
          stateRegionId: validated.stateRegionId,
          divisionId: validated.divisionId,
          city: validated.city,
          officeNumber: validated.officeNumber,
          gpsLat: validated.gpsLat,
          gpsLng: validated.gpsLng,
          contactName: validated.contactName,
          contactDesignation: validated.contactDesignation,
          contactEmail: validated.contactEmail,
          contactMobile: validated.contactMobile,
          gstNumber: validated.gstNumber,
          panNumber: validated.panNumber,
          leadSource: validated.leadSource,
          natureOfCall: validated.natureOfCall,
          currentStage: initialStage,
          statusLabel,
          nextFollowUpDate: validated.meetingDate ? new Date(validated.meetingDate) : null,
          latestRemarks: validated.initialRemarks,
          createdById: auth.userId,
          isLocked: true, // Data lock active
        },
      });

      // Automatically create the initial Deal
      const dealCode = `DEAL-${Date.now().toString().slice(-6)}`;
      const deal = await tx.deal.create({
        data: {
          tenantId: auth.tenantId,
          dealCode,
          clientId: client.id,
          ownerId: auth.userId,
          stage: initialStage,
          natureOfCall: validated.natureOfCall,
          nextFollowUpDate: validated.meetingDate ? new Date(validated.meetingDate) : null,
        },
      });

      return { client, deal };
    });

    // 4. Append-only Immutable Audit Log
    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Client",
      entityId: result.client.id,
      action: "CLIENT_INTAKE_CREATED",
      oldValueJson: null,
      newValueJson: {
        clientCode: result.client.clientCode,
        companyName: result.client.companyName,
        stage: initialStage,
        statusLabel,
        initialDealId: result.deal.id,
        isLocked: true,
      },
    });

    // 5. Send automated Client Introductory Email
    (async () => {
      try {
        const tenant = await prisma.tenant.findUnique({
          where: { id: auth.tenantId },
          select: { companyName: true },
        });
        const sender = await prisma.user.findUnique({
          where: { id: auth.userId },
          select: { fullName: true, mobile: true },
        });
        await sendClientIntroductoryEmail({
          recipientEmail: result.client.contactEmail,
          contactPerson: result.client.contactName,
          clientCompanyName: result.client.companyName,
          senderCompanyName: tenant?.companyName || "Our Company",
          salespersonName: sender?.fullName || auth.fullName,
          salespersonMobile: sender?.mobile || "",
        });
      } catch (mailErr) {
        console.warn("Client intro email failed:", mailErr);
      }
    })();

    return NextResponse.json(
      {
        success: true,
        client: result.client,
        deal: result.deal,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/clients error:", err);
    if (err.name === "ResignationFreezeError") {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to create client" }, { status: 500 });
  }
}

/**
 * PATCH /api/clients
 * Enforces Section 13.1 Data Protection Protocol:
 * If caller is not Admin, mutation is diverted to a ClientCorrectionRequest.
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const { clientId, reason, ...requestedChanges } = body;

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    if (!reason || String(reason).trim().length < 5) {
      return NextResponse.json(
        { error: "A detailed reason (min 5 characters) is required for client data modification." },
        { status: 400 }
      );
    }

    const result = await requestOrApplyClientModification(
      {
        id: auth.userId,
        tenantId: auth.tenantId,
        roleLevel: auth.roleLevel,
      },
      clientId,
      requestedChanges,
      reason
    );

    return NextResponse.json({
      success: true,
      applied: result.applied,
      message: result.message,
      client: result.client,
      correctionRequest: result.correctionRequest,
    });
  } catch (err: any) {
    console.error("PATCH /api/clients error:", err);
    return NextResponse.json({ error: err.message || "Failed to modify client" }, { status: 500 });
  }
}
