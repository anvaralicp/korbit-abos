import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { logImmutableAudit } from "@/lib/audit";
import { ProductUnit, RoleLevel, DepartmentType } from "@prisma/client";

const ProductSchema = z.object({
  productCode: z.string().min(2, "Product code is required (e.g. PROD-001)"),
  name: z.string().min(2, "Product/Service name is required"),
  unit: z.nativeEnum(ProductUnit).default(ProductUnit.UNIT),
  unitPriceInr: z.coerce.number().positive("Unit price must be > 0"),
  hsnSacCode: z.string().min(4, "HSN/SAC code must be at least 4 digits"),
  gstRatePercent: z.coerce.number().min(0).max(100).default(18.0),
  description: z.string().optional(),
  deliverables: z.string().min(5, "Scope deliverables required for Proposal PDF auto-population"),
  termsAndConditions: z.string().min(5, "Terms & conditions required for Proposal PDF auto-population"),
  isActive: z.boolean().default(true),
});

/**
 * GET /api/products
 * Read access for all authenticated tenant users.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    const where: any = {
      tenantId: auth.tenantId,
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { productCode: { contains: search, mode: "insensitive" } },
        { hsnSacCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, products });
  } catch (err: any) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch products" }, { status: 500 });
  }
}

/**
 * POST /api/products
 * Restricted strictly to LAYER_01_ADMIN and LAYER_02_DEPT_HEAD (SALES).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    // Role check: Only Admin or Sales Head can add products to Master Catalog
    const isAuthorized =
      auth.roleLevel === RoleLevel.LAYER_01_ADMIN ||
      (auth.roleLevel === RoleLevel.LAYER_02_DEPT_HEAD && auth.department === DepartmentType.SALES);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Only LAYER_01_ADMIN or LAYER_02_DEPT_HEAD (Sales) can manage Product Master Catalog." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = ProductSchema.parse(body);

    const existing = await prisma.product.findUnique({
      where: {
        tenantId_productCode: {
          tenantId: auth.tenantId,
          productCode: validated.productCode,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Product code "${validated.productCode}" already exists in tenant catalog.` },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId: auth.tenantId,
        productCode: validated.productCode,
        name: validated.name,
        unit: validated.unit,
        unitPriceInr: validated.unitPriceInr,
        hsnSacCode: validated.hsnSacCode,
        gstRatePercent: validated.gstRatePercent,
        description: validated.description,
        deliverables: validated.deliverables,
        termsAndConditions: validated.termsAndConditions,
        isActive: validated.isActive,
      },
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Product",
      entityId: product.id,
      action: "CREATE_PRODUCT_MASTER",
      oldValueJson: null,
      newValueJson: product,
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/products error:", err);
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: err.flatten().fieldErrors }, { status: 422 });
    }
    return NextResponse.json({ error: err.message || "Failed to create product" }, { status: 500 });
  }
}

/**
 * PUT /api/products
 * Restricted strictly to LAYER_01_ADMIN and LAYER_02_DEPT_HEAD (SALES).
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
    }

    const isAuthorized =
      auth.roleLevel === RoleLevel.LAYER_01_ADMIN ||
      (auth.roleLevel === RoleLevel.LAYER_02_DEPT_HEAD && auth.department === DepartmentType.SALES);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Forbidden: Only LAYER_01_ADMIN or LAYER_02_DEPT_HEAD (Sales) can modify Product Master Catalog." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: "Product ID is required for updates" }, { status: 400 });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing || existing.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Product not found in tenant catalog" }, { status: 404 });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    await logImmutableAudit({
      tenantId: auth.tenantId,
      actorId: auth.userId,
      entityType: "Product",
      entityId: id,
      action: "UPDATE_PRODUCT_MASTER",
      oldValueJson: existing,
      newValueJson: updated,
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (err: any) {
    console.error("PUT /api/products error:", err);
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}
