
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(128),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only authenticated customers can change their passwords.
    if (
      !session?.user?.id ||
      session.user.role !== "CUSTOMER"
    ) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const validation = passwordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Password must contain between 12 and 128 characters.",
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const customer = await prisma.customer.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        passwordHash: true,
        mustChangePassword: true,
        temporaryPasswordExpiresAt: true,
        status: true,
      },
    });

    if (
      !customer ||
      customer.status !== "ACTIVE" ||
      !customer.passwordHash
    ) {
      return NextResponse.json(
        { error: "Customer account not found or inactive." },
        { status: 404 }
      );
    }

    // Verify the temporary/current password.
    const passwordMatches = await bcrypt.compare(
      currentPassword,
      customer.passwordHash
    );

    if (!passwordMatches) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 }
      );
    }

    // Temporary passwords must still be valid.
    if (customer.mustChangePassword) {
      const expiry = customer.temporaryPasswordExpiresAt;

      if (!expiry || expiry.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error: "Your temporary password has expired. Please contact your administrator.",
          },
          { status: 403 }
        );
      }
    }

    // Do not allow reuse of the current password.
    if (currentPassword === newPassword) {
      return NextResponse.json(
        {
          error: "Your new password must be different from your current password.",
        },
        { status: 400 }
      );
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    await prisma.customer.update({
      where: {
        id: customer.id,
      },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
        temporaryPasswordExpiresAt: null,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    console.error("Customer password change error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
