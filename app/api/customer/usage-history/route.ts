
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["SUCCESS", "FAILED"]).optional(),
  requestId: z.string().trim().max(100).optional(),
  apiKeyId: z.string().trim().max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: session.user.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account is not active." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const validation = querySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      requestId: searchParams.get("requestId") ?? undefined,
      apiKeyId: searchParams.get("apiKeyId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, message: "Invalid filters." },
        { status: 400 }
      );
    }

    const filters = validation.data;
    const skip = (filters.page - 1) * filters.limit;

    const createdAt: Prisma.DateTimeFilter = {};

    if (filters.from) {
      const from = new Date(filters.from);

      if (Number.isNaN(from.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid start date." },
          { status: 400 }
        );
      }

      createdAt.gte = from;
    }

    if (filters.to) {
      const to = new Date(filters.to);

      if (Number.isNaN(to.getTime())) {
        return NextResponse.json(
          { success: false, message: "Invalid end date." },
          { status: 400 }
        );
      }

      to.setUTCHours(23, 59, 59, 999);
      createdAt.lte = to;
    }

    if (
      filters.from &&
      filters.to &&
      new Date(filters.from) > new Date(filters.to)
    ) {
      return NextResponse.json(
        { success: false, message: "Start date cannot be after end date." },
        { status: 400 }
      );
    }

    const where: Prisma.UsageRecordWhereInput = {
      customerId: customer.id,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.requestId
        ? { requestId: { contains: filters.requestId, mode: "insensitive" } }
        : {}),
      ...(filters.apiKeyId ? { apiKeyId: filters.apiKeyId } : {}),
      ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
    };

    const [
      records,
      totalRecords,
      successfulRequests,
      failedRequests,
      totalCharges,
    ] = await Promise.all([
      prisma.usageRecord.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: filters.limit,
        select: {
          id: true,
          requestId: true,
          operation: true,
          endpoint: true,
          quantity: true,
          unitPrice: true,
          totalAmount: true,
          currency: true,
          status: true,
          responseCode: true,
          processingMs: true,
          billingPeriod: true,
          createdAt: true,
          apiKey: {
            select: {
              id: true,
              name: true,
              prefix: true,
            },
          },
        },
      }),

      prisma.usageRecord.count({ where }),

      prisma.usageRecord.count({
        where: { ...where, status: "SUCCESS" },
      }),

      prisma.usageRecord.count({
        where: { ...where, status: "FAILED" },
      }),

      prisma.usageRecord.aggregate({
        where: { ...where, status: "SUCCESS" },
        _sum: { totalAmount: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      summary: {
        totalRequests: totalRecords,
        successfulRequests,
        failedRequests,
        totalCharges: totalCharges._sum.totalAmount?.toString() ?? "0.00000000",
        currency: "USD",
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / filters.limit),
      },
      records: records.map((record) => ({
        ...record,
        unitPrice: record.unitPrice.toString(),
        totalAmount: record.totalAmount.toString(),
        createdAt: record.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Customer usage history error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve usage history.",
      },
      { status: 500 }
    );
  }
}
