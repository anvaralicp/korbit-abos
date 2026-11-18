import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth-utils";
import { SA_COOKIE_NAME, signSuperAdminSession } from "@/lib/super-admin-auth";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = LoginSchema.parse(body);

    const superAdmin = await prisma.superAdmin.findUnique({
      where: { email: validated.email },
    });

    if (!superAdmin || !superAdmin.isActive) {
      return NextResponse.json(
        { error: "Invalid credentials or account inactive." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(validated.password, superAdmin.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials." },
        { status: 401 }
      );
    }

    // Update lastLoginAt
    await prisma.superAdmin.update({
      where: { id: superAdmin.id },
      data: { lastLoginAt: new Date() },
    });

    const token = signSuperAdminSession({
      id: superAdmin.id,
      email: superAdmin.email,
      fullName: superAdmin.fullName,
    });

    const res = NextResponse.json({
      success: true,
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        fullName: superAdmin.fullName,
      },
    });

    res.cookies.set({
      name: SA_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 3600,
    });

    return res;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
