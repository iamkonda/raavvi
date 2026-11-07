
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const pricingSchema = z.object({
  name: z.string().trim().min(2).max(100),
  operation: z.string().trim().min(2).max(100),
  scope: z.enum(["DEFAULT", "CUSTOMER"]),
  customerId: z.string().optional().nullable(),
  unitPrice: z.number().positive().max(1000000),
  currency: z.string().length(3).default("USD"),
  effectiveFrom: z.string().min(10),
  effectiveTo: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const [rules, customers] = await Promise.all([
      prisma.pricingRule.findMany({
        include: {
          customer: {
            select: {
              id: true,
              customerCode: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { operation: "asc" },
          { version: "desc" },
          { createdAt: "desc" },
        ],
      }),

      prisma.customer.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          customerCode: true,
          name: true,
          email: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      rules: rules.map((rule) => ({
        id: rule.id,
        name: rule.name,
        operation: rule.operation,
        scope: rule.scope,
        unitPrice: rule.unitPrice.toString(),
        currency: rule.currency,
        isActive: rule.isActive,
        effectiveFrom: rule.effectiveFrom.toISOString(),
        effectiveTo: rule.effectiveTo?.toISOString() ?? null,
        version: rule.version,
        createdAt: rule.createdAt.toISOString(),
        customer: rule.customer,
      })),
      customers,
    });
  } catch (error) {
    console.error("Admin pricing GET error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to retrieve pricing rules." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.id ||
      !["SUPER_ADMIN", "ADMIN"].includes(session.user.role)
    ) {
      return NextResponse.json(
        { success: false, error: "You are not authorized to manage pricing." },
        { status: 403 }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const validation = pricingSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid pricing details.",
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const input = validation.data;

    if (input.scope === "CUSTOMER" && !input.customerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Select a customer for customer-specific pricing.",
        },
        { status: 400 }
      );
    }

    if (input.scope === "DEFAULT" && input.customerId) {
      return NextResponse.json(
        {
          success: false,
          error: "Default pricing cannot be assigned to a customer.",
        },
        { status: 400 }
      );
    }

    const effectiveFrom = new Date(input.effectiveFrom);
    const effectiveTo = input.effectiveTo
      ? new Date(input.effectiveTo)
      : null;

    if (
      Number.isNaN(effectiveFrom.getTime()) ||
      (effectiveTo && Number.isNaN(effectiveTo.getTime()))
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid effective date." },
        { status: 400 }
      );
    }

    if (effectiveTo && effectiveTo < effectiveFrom) {
      return NextResponse.json(
        {
          success: false,
          error: "The end date cannot be earlier than the start date.",
        },
        { status: 400 }
      );
    }

    if (input.scope === "CUSTOMER") {
      const customer = await prisma.customer.findUnique({
        where: { id: input.customerId! },
        select: { id: true, status: true },
      });

      if (!customer || customer.status !== "ACTIVE") {
        return NextResponse.json(
          { success: false, error: "Active customer not found." },
          { status: 404 }
        );
      }
    }

    // Determine the next version without modifying historical rules.
    const previousRule = await prisma.pricingRule.findFirst({
      where: {
        operation: input.operation,
        scope: input.scope,
        customerId: input.scope === "CUSTOMER" ? input.customerId : null,
      },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (previousRule?.version ?? 0) + 1;

    const rule = await prisma.pricingRule.create({
      data: {
        name: input.name,
        operation: input.operation,
        scope: input.scope,
        customerId:
          input.scope === "CUSTOMER" ? input.customerId! : null,
        unitPrice: new Prisma.Decimal(input.unitPrice),
        currency: input.currency.toUpperCase(),
        isActive: input.isActive,
        effectiveFrom,
        effectiveTo,
        version: nextVersion,
      },
      include: {
        customer: {
          select: {
            id: true,
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
        message: "Pricing rule created successfully.",
        rule: {
          id: rule.id,
          name: rule.name,
          operation: rule.operation,
          scope: rule.scope,
          unitPrice: rule.unitPrice.toString(),
          currency: rule.currency,
          isActive: rule.isActive,
          effectiveFrom: rule.effectiveFrom.toISOString(),
          effectiveTo: rule.effectiveTo?.toISOString() ?? null,
          version: rule.version,
          customer: rule.customer,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin pricing POST error:", error);

    return NextResponse.json(
      { success: false, error: "Unable to create pricing rule." },
      { status: 500 }
    );
  }
}
