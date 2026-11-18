import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthContext } from "@/lib/auth-context";
import { SupportTicketStatus } from "@prisma/client";

const ReplySchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthContext(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const validated = ReplySchema.parse(body);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket || ticket.tenantId !== auth.tenantId) {
      return NextResponse.json({ error: "Ticket not found or forbidden." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.supportTicketMessage.create({
        data: {
          ticketId: id,
          senderRole: "TENANT_USER",
          senderName: auth.fullName,
          message: validated.message,
        },
      });

      return tx.supportTicket.update({
        where: { id },
        data: {
          status: SupportTicketStatus.OPEN, // Re-opens or keeps open on tenant reply
          updatedAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
