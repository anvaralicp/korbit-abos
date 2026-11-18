import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import {
  calculateHaversineDistanceMeters,
  calculateRoadDistanceKm,
} from "@/lib/geo-utils";
import { logImmutableAudit } from "@/lib/audit";
import { VehicleType, RoleLevel } from "@prisma/client";

const StartJourneySchema = z.object({
  action: z.literal("START_JOURNEY"),
  clientId: z.string().min(1, "Client ID is required"),
  originLat: z.coerce.number().min(-90).max(90),
  originLng: z.coerce.number().min(-180).max(180),
});

const CheckInSchema = z.object({
  action: z.literal("CHECK_IN"),
  visitId: z.string().min(1, "Visit ID is required"),
  checkInLat: z.coerce.number().min(-90).max(90),
  checkInLng: z.coerce.number().min(-180).max(180),
  liveVerificationPhotoUrl: z.string().optional(),
  geoFenceOverrideReason: z.string().optional(),
});

const CheckOutSchema = z.object({
  action: z.literal("CHECK_OUT"),
  visitId: z.string().min(1, "Visit ID is required"),
  checkOutLat: z.coerce.number().min(-90).max(90),
  checkOutLng: z.coerce.number().min(-180).max(180),
  meetingRemarks: z.string().optional(),
});

const VisitActionSchema = z.discriminatedUnion("action", [
  StartJourneySchema,
  CheckInSchema,
  CheckOutSchema,
]);

/**
 * GET /api/field/visits
 * Lists field meeting visits.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const where: any = {
      tenantId: auth.tenantId,
    };

    if (auth.roleLevel !== RoleLevel.LAYER_01_ADMIN) {
      where.userId = auth.userId;
    }

    if (clientId) where.clientId = clientId;

    const visits = await prisma.fieldMeetingVisit.findMany({
      where,
      include: {
        client: {
          select: { id: true, clientCode: true, companyName: true, city: true },
        },
        user: {
          select: { id: true, fullName: true, employeeCode: true },
        },
      },
      orderBy: { journeyStartedAt: "desc" },
    });

    return NextResponse.json({ success: true, visits });
  } catch (err: any) {
    console.error("GET /api/field/visits error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch visits" }, { status: 500 });
  }
}

/**
 * POST /api/field/visits
 * 3-Point Field Meeting Check-In/Out & Automated Travel Allowance Engine.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const data = VisitActionSchema.parse(body);
    const now = new Date();

    // =========================================================================
    // POINT 1: START JOURNEY (Origin Point)
    // =========================================================================
    if (data.action === "START_JOURNEY") {
      const client = await prisma.client.findUnique({
        where: { id: data.clientId },
      });

      if (!client || client.tenantId !== auth.tenantId) {
        return NextResponse.json({ error: "Client not found in tenant records." }, { status: 404 });
      }

      const visit = await prisma.fieldMeetingVisit.create({
        data: {
          tenantId: auth.tenantId,
          userId: auth.userId,
          clientId: client.id,
          originLat: data.originLat,
          originLng: data.originLng,
          journeyStartedAt: now,
        },
      });

      await logImmutableAudit({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        entityType: "FieldMeetingVisit",
        entityId: visit.id,
        action: "FIELD_VISIT_START_JOURNEY",
        oldValueJson: null,
        newValueJson: {
          clientId: client.id,
          originLat: data.originLat,
          originLng: data.originLng,
          startedAt: now.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        step: "START_JOURNEY",
        message: "Journey origin point recorded. Proceed to client premises.",
        visit,
      });
    }

    // =========================================================================
    // POINT 2: CHECK-IN AT CLIENT PREMISES (Geo-Fence <= 100m + Verification)
    // =========================================================================
    if (data.action === "CHECK_IN") {
      const visit = await prisma.fieldMeetingVisit.findUnique({
        where: { id: data.visitId },
        include: { client: true },
      });

      if (!visit || visit.userId !== auth.userId) {
        return NextResponse.json({ error: "Visit not found or unauthorized." }, { status: 404 });
      }

      if (visit.checkedInAt) {
        return NextResponse.json({ error: "Check-in has already been completed for this visit." }, { status: 400 });
      }

      let distanceFromClientMeters = 0;
      const client = visit.client;

      if (client.gpsLat == null || client.gpsLng == null) {
        // First recorded visit to client premises establishes the geo-fence coordinate baseline
        await prisma.client.update({
          where: { id: client.id },
          data: {
            gpsLat: data.checkInLat,
            gpsLng: data.checkInLng,
          },
        });
        distanceFromClientMeters = 0;
      } else {
        // Enforce 100m geo-fence radius
        distanceFromClientMeters = calculateHaversineDistanceMeters(
          data.checkInLat,
          data.checkInLng,
          client.gpsLat,
          client.gpsLng
        );

        if (distanceFromClientMeters > 100 && !data.geoFenceOverrideReason) {
          return NextResponse.json(
            {
              error: `Geo-Fence Violation: You are ${distanceFromClientMeters}m away from the client premises (max 100m allowed). If client location has moved or meeting is off-site, please supply a geoFenceOverrideReason.`,
              distanceFromClientMeters,
              radiusCapMeters: 100,
            },
            { status: 400 }
          );
        }
      }

      const updatedVisit = await prisma.fieldMeetingVisit.update({
        where: { id: visit.id },
        data: {
          checkedInAt: now,
          checkInLat: data.checkInLat,
          checkInLng: data.checkInLng,
          distanceFromClientMeters,
          liveVerificationPhotoUrl: data.liveVerificationPhotoUrl,
          isMockLocationPassed: true,
        },
      });

      await logImmutableAudit({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        entityType: "FieldMeetingVisit",
        entityId: visit.id,
        action: "FIELD_VISIT_CHECK_IN",
        oldValueJson: { checkedInAt: null },
        newValueJson: {
          checkInLat: data.checkInLat,
          checkInLng: data.checkInLng,
          distanceFromClientMeters,
          geoFencePassed: distanceFromClientMeters <= 100,
          overrideReason: data.geoFenceOverrideReason ?? null,
          photoUploaded: !!data.liveVerificationPhotoUrl,
        },
      });

      return NextResponse.json({
        success: true,
        step: "CHECK_IN",
        message: "Check-in verified at client premises. Meeting in progress.",
        visit: updatedVisit,
        distanceFromClientMeters,
      });
    }

    // =========================================================================
    // POINT 3: CHECK-OUT & AUTOMATED TRAVEL ALLOWANCE
    // =========================================================================
    if (data.action === "CHECK_OUT") {
      const visit = await prisma.fieldMeetingVisit.findUnique({
        where: { id: data.visitId },
        include: {
          user: true,
        },
      });

      if (!visit || visit.userId !== auth.userId) {
        return NextResponse.json({ error: "Visit not found or unauthorized." }, { status: 404 });
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: visit.tenantId },
      });

      if (!tenant) {
        return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
      }

      if (!visit.checkedInAt) {
        return NextResponse.json({ error: "Cannot check out without completing check-in first." }, { status: 400 });
      }

      if (visit.checkedOutAt) {
        return NextResponse.json({ error: "Check-out has already been completed for this visit." }, { status: 400 });
      }

      // Calculate actual road distance from Origin to Client check-in point
      const originLat = visit.originLat;
      const originLng = visit.originLng;
      const destLat = visit.checkInLat ?? data.checkOutLat;
      const destLng = visit.checkInLng ?? data.checkOutLng;

      const roadResult = await calculateRoadDistanceKm(originLat, originLng, destLat, destLng);

      const journeyDurationMinutes = Math.max(
        1,
        Math.round((now.getTime() - visit.journeyStartedAt.getTime()) / 60000)
      );

      // Determine vehicle rate per km
      const isTwoWheeler = visit.user.vehicleType === VehicleType.TWO_WHEELER;
      const ratePerKm = isTwoWheeler
        ? Number(tenant.travelRateTwoWheelerInr)
        : Number(tenant.travelRateFourWheelerInr);

      const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Atomic execution: update visit record and recalculate MonthlyHrReport
      const result = await prisma.$transaction(async (tx) => {
        const updatedVisit = await tx.fieldMeetingVisit.update({
          where: { id: visit.id },
          data: {
            checkedOutAt: now,
            checkOutLat: data.checkOutLat,
            checkOutLng: data.checkOutLng,
            roadDistanceKm: roadResult.distanceKm,
            travelDurationMinutes: journeyDurationMinutes,
            meetingRemarks: data.meetingRemarks ?? visit.meetingRemarks,
          },
        });

        // Fetch or create MonthlyHrReport for employee
        const existingReport = await tx.monthlyHrReport.findUnique({
          where: {
            userId_monthYear: {
              userId: auth.userId,
              monthYear,
            },
          },
        });

        const prevDistance = existingReport ? Number(existingReport.totalTravelDistanceKm) : 0;
        const prevVisits = existingReport ? existingReport.totalFieldVisits : 0;
        const newTotalDistance = Number((prevDistance + roadResult.distanceKm).toFixed(2));
        const newVisits = prevVisits + 1;

        const newTravelAllowance = Number((newTotalDistance * ratePerKm).toFixed(2));
        const baseSalary = Number(visit.user.baseSalaryInr);
        const incentives = existingReport ? Number(existingReport.incentivesInr) : 0;
        const newNetPayable = Number((baseSalary + newTravelAllowance + incentives).toFixed(2));

        const updatedReport = await tx.monthlyHrReport.upsert({
          where: {
            userId_monthYear: {
              userId: auth.userId,
              monthYear,
            },
          },
          update: {
            totalFieldVisits: newVisits,
            totalTravelDistanceKm: newTotalDistance,
            ratePerKmInr: ratePerKm,
            travelAllowanceInr: newTravelAllowance,
            netPayableInr: newNetPayable,
          },
          create: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            monthYear,
            daysWorked: 1,
            totalFieldVisits: newVisits,
            totalTravelDistanceKm: newTotalDistance,
            ratePerKmInr: ratePerKm,
            travelAllowanceInr: newTravelAllowance,
            incentivesInr: 0,
            netPayableInr: newNetPayable,
          },
        });

        return { visit: updatedVisit, hrReport: updatedReport };
      });

      await logImmutableAudit({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        entityType: "FieldMeetingVisit",
        entityId: visit.id,
        action: "FIELD_VISIT_CHECK_OUT_ALLOWANCE_COMPUTED",
        oldValueJson: { checkedOutAt: null },
        newValueJson: {
          roadDistanceKm: roadResult.distanceKm,
          isFallbackRoute: roadResult.isFallback,
          ratePerKmInr: ratePerKm,
          totalTravelDistanceKmMonth: result.hrReport.totalTravelDistanceKm,
          travelAllowanceInrMonth: result.hrReport.travelAllowanceInr,
          netPayableInrMonth: result.hrReport.netPayableInr,
        },
      });

      return NextResponse.json({
        success: true,
        step: "CHECK_OUT",
        message: "Meeting checked out. Travel allowance and HR payroll report updated automatically.",
        visit: result.visit,
        roadDistanceKm: roadResult.distanceKm,
        travelDurationMinutes: journeyDurationMinutes,
        travelAllowanceUpdate: {
          monthYear,
          ratePerKmInr: ratePerKm,
          totalVisits: result.hrReport.totalFieldVisits,
          totalDistanceKm: result.hrReport.totalTravelDistanceKm,
          totalAllowanceInr: result.hrReport.travelAllowanceInr,
          netPayableInr: result.hrReport.netPayableInr,
        },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Visits POST error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to process visit action" }, { status: 500 });
  }
}
