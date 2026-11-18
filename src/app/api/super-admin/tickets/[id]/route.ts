import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSuperAdminFromCookie } from "@/lib/super-admin-auth";
import { SupportTicketStatus, SupportTicketPriority } from "@prisma/client";

const UpdateTicketSchema = z.object({
  status: z.nativeEnum(SupportTicketStatus).optional(),
  priority: z.nativeEnum(SupportTicketPriority).optional(),
  replyMessage: z.string().min(1).optional(),
});

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminFromCookie(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized Super Admin session." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = await req.json();
    const validated = UpdateTicketSchema.parse(body);

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
    });

    if (!ticket) {
      return NextResponse.json({ error: "Support ticket not found." }, { status: 404 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (validated.replyMessage) {
        await tx.supportTicketMessage.create({
          data: {
            ticketId: id,
            senderRole: "SUPER_ADMIN",
            senderName: session.fullName || "KORBIT Support Desk",
            message: validated.replyMessage,
          },
        });
      }

      return tx.supportTicket.update({
        where: { id },
        data: {
          ...(validated.status && {
            status: validated.status,
            resolvedAt: validated.status === SupportTicketStatus.RESOLVED ? new Date() : undefined,
          }),
          ...(validated.priority && { priority: validated.priority }),
          updatedAt: new Date(),
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      ticket: updated,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.flatten().fieldErrors }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
