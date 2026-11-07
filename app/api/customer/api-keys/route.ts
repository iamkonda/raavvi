
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export async function GET() {
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

    const customer = await prisma.customer.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });

    if (!customer || customer.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Customer account is inactive." },
        { status: 403 }
      );
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        customerId: session.user.id,
        environment: "LIVE",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      apiKeys,
    });
  } catch (error) {
    console.error("Customer API key retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve API keys." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid API key name.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!customer || customer.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, message: "Customer account is inactive." },
        { status: 403 }
      );
    }

    // Customers can only create LIVE API keys.
    const secret = randomBytes(32).toString("hex");
    const prefix = "rv_live";
    const fullKey = `${prefix}_${secret}`;

    // Store only the SHA-256 hash of the complete key.
    const keyHash = createHash("sha256")
      .update(fullKey)
      .digest("hex");

    const apiKey = await prisma.apiKey.create({
      data: {
        name: validation.data.name,
        prefix: `${prefix}_${secret.slice(0, 8)}`,
        keyHash,
        environment: "LIVE",
        customerId: customer.id,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "LIVE API key created successfully. Copy it now; it cannot be displayed again.",
        apiKey,
        secretKey: fullKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Customer API key creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create API key." },
      { status: 500 }
    );
  }
}
