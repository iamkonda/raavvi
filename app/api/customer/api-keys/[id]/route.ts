
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      session.user.role !== "CUSTOMER"
    ) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        customerId: session.user.id,
        environment: "LIVE",
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "API key not found." },
        { status: 404 }
      );
    }

    if (apiKey.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "This API key is not active.",
        },
        { status: 400 }
      );
    }

    await prisma.apiKey.update({
      where: {
        id: apiKey.id,
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "API key revoked successfully.",
    });
  } catch (error) {
    console.error("Customer API key revocation failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to revoke API key.",
      },
      { status: 500 }
    );
  }
}
