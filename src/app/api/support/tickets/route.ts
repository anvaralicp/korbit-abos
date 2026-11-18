import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { SupportTicketCategory, SupportTicketPriority } from "@prisma/client";

const CreateTicketSchema = z.object({
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  category: z.nativeEnum(SupportTicketCategory),
  priority: z.nativeEnum(SupportTicketPriority).default(SupportTicketPriority.MEDIUM),
  message: z.string().min(5, "Initial message must be at least 5 characters"),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tickets = await prisma.supportTicket.findMany({
      where: { tenantId: auth.tenantId },
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: {
          select: {
            fullName: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ success: true, tickets });
  } catch (error: unknown) {
    console.error("Support tickets list error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = CreateTicketSchema.parse(body);

    const ticketNumber = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        tenantId: auth.tenantId,
        createdById: auth.userId,
        subject: validated.subject,
        category: validated.category,
        priority: validated.priority,
        messages: {
          create: [
            {
              senderRole: "TENANT_USER",
              senderName: auth.fullName,
              message: validated.message,
            },
          ],
        },
      },
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ success: true, ticket });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
