import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";

const AttendanceActionSchema = z.object({
  action: z.enum(["SIGN_IN", "SIGN_OUT"]),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

/**
 * GET /api/field/attendance
 * Retrieves today's attendance record and DPDP live tracking status for the employee.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const attendance = await prisma.fieldAttendance.findUnique({
      where: {
        userId_attendanceDate: {
          userId: auth.userId,
          attendanceDate: today,
        },
      },
    });

    return NextResponse.json({
      success: true,
      attendance,
      isGpsTrackingLive: attendance?.isGpsTrackingLive ?? false,
      isSignedIn: !!attendance && !attendance.signedOutAt,
    });
  } catch (err: any) {
    console.error("GET /api/field/attendance error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch attendance" }, { status: 500 });
  }
}

/**
 * POST /api/field/attendance
 * Manages employee work-hours attendance and enforces the DPDP Act 2023 privacy kill-switch.
 * - SIGN_IN: Activates isGpsTrackingLive: true during work hours.
 * - SIGN_OUT: Immediately kills tracking (isGpsTrackingLive: false) outside work hours.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const validated = AttendanceActionSchema.parse(body);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    if (validated.action === "SIGN_IN") {
      const existing = await prisma.fieldAttendance.findUnique({
        where: {
          userId_attendanceDate: {
            userId: auth.userId,
            attendanceDate: today,
          },
        },
      });

      if (existing) {
        if (existing.signedOutAt) {
          return NextResponse.json(
            { error: "You have already completed sign-out for today." },
            { status: 400 }
          );
        }
        return NextResponse.json({
          success: true,
          message: "Already signed in for today.",
          attendance: existing,
        });
      }

      // Create attendance and record day worked in MonthlyHrReport atomically
      const result = await prisma.$transaction(async (tx) => {
        const attendance = await tx.fieldAttendance.create({
          data: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            attendanceDate: today,
            signedInAt: now,
            signInLat: validated.lat,
            signInLng: validated.lng,
            isGpsTrackingLive: true, // Work hours GPS tracking active
          },
        });

        // Initialize or update MonthlyHrReport daysWorked
        const user = await tx.user.findUnique({
          where: { id: auth.userId },
          select: { baseSalaryInr: true },
        });

        await tx.monthlyHrReport.upsert({
          where: {
            userId_monthYear: {
              userId: auth.userId,
              monthYear,
            },
          },
          update: {
            daysWorked: { increment: 1 },
          },
          create: {
            tenantId: auth.tenantId,
            userId: auth.userId,
            monthYear,
            daysWorked: 1,
            ratePerKmInr: 10.0,
            netPayableInr: user?.baseSalaryInr ?? 0,
          },
        });

        return attendance;
      });

      await logImmutableAudit({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        entityType: "FieldAttendance",
        entityId: result.id,
        action: "FIELD_ATTENDANCE_SIGN_IN",
        oldValueJson: null,
        newValueJson: {
          action: "SIGN_IN",
          signInLat: validated.lat,
          signInLng: validated.lng,
          isGpsTrackingLive: true,
          dpdpConsentEnforced: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: "Work-hours attendance signed in. GPS tracking enabled for field route verification.",
        attendance: result,
      });
    }

    if (validated.action === "SIGN_OUT") {
      const attendance = await prisma.fieldAttendance.findUnique({
        where: {
          userId_attendanceDate: {
            userId: auth.userId,
            attendanceDate: today,
          },
        },
      });

      if (!attendance) {
        return NextResponse.json(
          { error: "Cannot sign out without signing in first for today." },
          { status: 400 }
        );
      }

      if (attendance.signedOutAt) {
        return NextResponse.json(
          { error: "Attendance sign-out has already been recorded for today." },
          { status: 400 }
        );
      }

      // Record sign-out and immediately kill live GPS tracking
      const updated = await prisma.fieldAttendance.update({
        where: { id: attendance.id },
        data: {
          signedOutAt: now,
          signOutLat: validated.lat,
          signOutLng: validated.lng,
          isGpsTrackingLive: false, // DPDP Privacy Kill-Switch: 0 tracking off work hours
        },
      });

      await logImmutableAudit({
        tenantId: auth.tenantId,
        actorId: auth.userId,
        entityType: "FieldAttendance",
        entityId: updated.id,
        action: "FIELD_ATTENDANCE_SIGN_OUT_GPS_KILLED",
        oldValueJson: { isGpsTrackingLive: true },
        newValueJson: {
          action: "SIGN_OUT",
          signOutLat: validated.lat,
          signOutLng: validated.lng,
          isGpsTrackingLive: false,
          privacyRule: "DPDP Act 2023 Work-Hours GPS Kill-Switch Enforced",
        },
      });

      return NextResponse.json({
        success: true,
        message: "Work-hours attendance signed out. DPDP privacy kill-switch engaged: GPS tracking permanently stopped for today.",
        attendance: updated,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Attendance POST error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to process attendance" }, { status: 500 });
  }
}
