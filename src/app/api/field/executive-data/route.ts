import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Find Rahul Sharma in demo tenant
    const user = await prisma.user.findFirst({
      where: { email: "rahul@korbit.in" },
      include: {
        tenant: true,
        zone: true,
        stateRegion: true,
        division: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Field Executive Rahul Sharma not found. Please run seed." }, { status: 404 });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Today's attendance
    const attendance = await prisma.fieldAttendance.findUnique({
      where: {
        userId_attendanceDate: {
          userId: user.id,
          attendanceDate: today,
        },
      },
    });

    // 2. Executive's clients
    const clients = await prisma.client.findMany({
      where: { createdById: user.id },
      include: {
        deals: {
          include: {
            lineItems: { include: { product: true } },
            discountRequests: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 3. Active / Recent visits
    const visits = await prisma.fieldMeetingVisit.findMany({
      where: { userId: user.id },
      include: { client: true },
      orderBy: { journeyStartedAt: "desc" },
      take: 5,
    });

    // 4. Products master
    const products = await prisma.product.findMany({
      where: { tenantId: user.tenantId, isActive: true },
      orderBy: { productCode: "asc" },
    });

    // 5. Monthly HR Report
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const hrReport = await prisma.monthlyHrReport.findUnique({
      where: {
        userId_monthYear: {
          userId: user.id,
          monthYear,
        },
      },
    });

    return NextResponse.json({
      success: true,
      user,
      tenant: user.tenant,
      attendance,
      clients,
      visits,
      products,
      hrReport,
    });
  } catch (err: any) {
    console.error("Executive data error:", err);
    return NextResponse.json({ error: err.message || "Failed to load executive data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toggleFreeze } = body;

    const user = await prisma.user.findFirst({
      where: { email: "rahul@korbit.in" },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        isResignationFrozen: toggleFreeze !== undefined ? toggleFreeze : !user.isResignationFrozen,
      },
    });

    return NextResponse.json({
      success: true,
      isResignationFrozen: updated.isResignationFrozen,
      message: updated.isResignationFrozen
        ? "Resignation Freeze activated for testing: mutations other than Add Client and Remarks will be blocked."
        : "Resignation Freeze cleared: standard operational permissions restored.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
