import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { getSubordinateVisibilityFilter } from "@/lib/dld-hierarchy";
import { calculateGstBreakdown } from "@/lib/gst-calculator";
import { logImmutableAudit } from "@/lib/audit";
import { PipelineStage, CallNature, RoleLevel } from "@prisma/client";

const LineItemInputSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.coerce.number().positive("Quantity must be > 0"),
  expectedClientRateInr: z.coerce.number().optional(),
  offeredUnitPriceInr: z.coerce.number().optional(),
});

const CreateDealSchema = z.object({
  clientId: z.string().min(1, "Client ID is required"),
  stage: z.nativeEnum(PipelineStage).default(PipelineStage.STAGE_2_INTRODUCTORY),
  natureOfCall: z.nativeEnum(CallNature).default(CallNature.COLD),
  nextFollowUpDate: z.string().datetime().optional(),
  lineItems: z.array(LineItemInputSchema).min(1, "At least 1 line item is required"),
});

/**
 * GET /api/deals
 * Lists deals according to DLD hierarchy permissions.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const stage = searchParams.get("stage") as PipelineStage | null;
    const clientId = searchParams.get("clientId");

    // DLD Visibility Filter: Admin sees all; officers see deals owned by their chain of command
    const visibilityFilter =
      auth.roleLevel === RoleLevel.LAYER_01_ADMIN
        ? {}
        : getSubordinateVisibilityFilter(auth);

    const where: any = {
      tenantId: auth.tenantId,
      ...visibilityFilter,
    };

    if (stage) where.stage = stage;
    if (clientId) where.clientId = clientId;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            clientCode: true,
            companyName: true,
            city: true,
            stateRegion: { select: { stateName: true } },
          },
        },
        owner: {
          select: { id: true, fullName: true, employeeCode: true, designation: true },
        },
        lineItems: {
          include: {
            product: { select: { id: true, productCode: true, name: true, unit: true, hsnSacCode: true } },
          },
        },
        discountRequests: {
          select: { id: true, status: true, currentApprovalLevel: true, slaExpiresAt: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, deals });
  } catch (err: any) {
    console.error("GET /api/deals error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch deals" }, { status: 500 });
  }
}

/**
 * POST /api/deals
 * Creates a deal with line items and automatic GST breakdown.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const body = await req.json();
    const validated = CreateDealSchema.parse(body);

    // Fetch client and tenant to determine tax jurisdictions
    const client = await prisma.client.findUnique({
      where: { id: validated.clientId },
      include: { stateRegion: true },
    });

    if (!client || client.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Client not found in tenant records." }, { status: 404 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: auth.tenantId },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found." }, { status: 404 });
    }

    // Fetch product details for line items
    const productIds = validated.lineItems.map((li) => li.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, tenantId: auth.tenantId },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Calculate line items financial totals
    let dealSubtotal = 0;
    let dealCgst = 0;
    let dealSgst = 0;
    let dealIgst = 0;
    let dealTotalWithGst = 0;

    const processedLineItems = [];

    for (const item of validated.lineItems) {
      const prod = productMap.get(item.productId);
      if (!prod) {
        return NextResponse.json(
          { error: `Product with ID ${item.productId} not found in catalog.` },
          { status: 400 }
        );
      }

      const actualPrice = Number(prod.unitPriceInr);
      const offeredPrice = item.offeredUnitPriceInr ?? actualPrice;
      const discountPercent =
        actualPrice > 0 ? Math.max(0, ((actualPrice - offeredPrice) / actualPrice) * 100) : 0;

      const lineSubtotal = Math.round(offeredPrice * item.quantity);
      const gstRate = Number(prod.gstRatePercent);

      const tax = calculateGstBreakdown(
        lineSubtotal,
        gstRate,
        tenant.operatingState,
        client.stateRegion.stateName
      );

      dealSubtotal += tax.subtotalInr;
      dealCgst += tax.cgstInr;
      dealSgst += tax.sgstInr;
      dealIgst += tax.igstInr;
      dealTotalWithGst += tax.totalWithGstInr;

      processedLineItems.push({
        productId: prod.id,
        quantity: item.quantity,
        actualUnitPriceInr: actualPrice,
        expectedClientRateInr: item.expectedClientRateInr ?? null,
        offeredUnitPriceInr: offeredPrice,
        discountPercent: Number(discountPercent.toFixed(2)),
        gstRatePercent: gstRate,
        lineSubtotalInr: tax.subtotalInr,
        lineTotalWithGstInr: tax.totalWithGstInr,
      });
    }

    const dealCode = `DEAL-${Date.now().toString().slice(-6)}`;

    const deal = await prisma.deal.create({
      data: {
        tenantId: auth.tenantId,
        dealCode,
        clientId: client.id,
        ownerId: auth.userId,
        stage: validated.stage,
        natureOfCall: validated.natureOfCall,
        subtotalInr: dealSubtotal,
        cgstInr: dealCgst,
        sgstInr: dealSgst,
        igstInr: dealIgst,
        totalAmountInr: dealTotalWithGst,
        nextFollowUpDate: validated.nextFollowUpDate ? new Date(validated.nextFollowUpDate) : null,
        lineItems: {
          create: processedLineItems,
        },
      },
      include: {
        lineItems: { include: { product: true } },
      },
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Deal",
      entityId: deal.id,
      action: "CREATE_DEAL",
      oldValueJson: null,
      newValueJson: {
        dealCode: deal.dealCode,
        clientId: deal.clientId,
        totalAmountInr: deal.totalAmountInr,
        stage: deal.stage,
      },
    });

    return NextResponse.json({ success: true, deal }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/deals error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to create deal" }, { status: 500 });
  }
}
