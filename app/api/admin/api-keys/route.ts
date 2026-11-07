
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { createHash, randomBytes } from "crypto";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function getSession() {
  return getServerSession(authOptions);
}

const createApiKeySchema = z.object({
  name: z.string().trim().min(1).max(100),
  customerCode: z.string().trim().min(1),
  environment: z.enum(["LIVE", "TEST"]),
});

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const keys = await prisma.apiKey.findMany({
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
        customer: {
          select: {
            customerCode: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      apiKeys: keys,
    });
  } catch (error) {
    console.error("API key retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve API keys." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (
      !session?.user ||
      !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { success: false, message: "You are not authorized to create API keys." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createApiKeySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid API key details.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, customerCode, environment } = validation.data;

    const customer = await prisma.customer.findUnique({
      where: { customerCode },
      select: {
        id: true,
        customerCode: true,
        name: true,
        status: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    if (customer.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "API keys can only be created for active customers.",
        },
        { status: 400 }
      );
    }

    const secret = randomBytes(32).toString("hex");
    const prefix = environment === "LIVE" ? "rv_live" : "rv_test";
    const fullKey = `${prefix}_${secret}`;

    const keyHash = createHash("sha256")
      .update(fullKey)
      .digest("hex");

    const apiKey = await prisma.apiKey.create({
      data: {
        name,
        prefix: `${prefix}_${secret.slice(0, 8)}`,
        keyHash,
        environment,
        customerId: customer.id,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        environment: true,
        status: true,
        createdAt: true,
        customer: {
          select: {
            customerCode: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "API key created successfully. Copy it now; it cannot be displayed again.",
        apiKey,
        secretKey: fullKey,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API key creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create API key." },
      { status: 500 }
    );
  }
}
