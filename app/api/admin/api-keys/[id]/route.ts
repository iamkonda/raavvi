
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existingKey = await prisma.apiKey.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingKey) {
      return NextResponse.json(
        { success: false, message: "API key not found." },
        { status: 404 }
      );
    }

    if (existingKey.status === "REVOKED") {
      return NextResponse.json(
        { success: false, message: "This API key has already been revoked." },
        { status: 409 }
      );
    }

    const apiKey = await prisma.apiKey.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        revokedAt: true,
        customer: {
          select: {
            customerCode: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully.",
      apiKey,
    });
  } catch (error) {
    console.error("API key revocation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to revoke API key." },
      { status: 500 }
    );
  }
}
