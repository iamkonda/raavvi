
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Verify admin session
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Read filters
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );
    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("pageSize") || "25", 10) || 25
      )
    );

    // Build database filters
    const where: Prisma.UsageRecordWhereInput = {};

    if (status === "SUCCESS" || status === "FAILED") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { requestId: { contains: search, mode: "insensitive" } },
        { operation: { contains: search, mode: "insensitive" } },
        {
          customer: {
            is: {
              name: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          customer: {
            is: {
              customerCode: { contains: search, mode: "insensitive" },
            },
          },
        },
        {
          customer: {
            is: {
              email: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const successWhere: Prisma.UsageRecordWhereInput = {
      ...where,
      status: "SUCCESS",
    };

    // Retrieve records and summary metrics
    const [records, totalRecords, successfulRequests, failedRequests, charges] =
      await Promise.all([
        prisma.usageRecord.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                customerCode: true,
                name: true,
                email: true,
              },
            },
            apiKey: {
              select: {
                id: true,
                name: true,
                prefix: true,
                environment: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),

        prisma.usageRecord.count({ where }),

        prisma.usageRecord.count({
          where: successWhere,
        }),

        prisma.usageRecord.count({
          where: {
            ...where,
            status: "FAILED",
          },
        }),

        prisma.usageRecord.aggregate({
          where: successWhere,
          _sum: {
            totalAmount: true,
          },
        }),
      ]);

    return NextResponse.json({
      success: true,

      stats: {
        totalRecords,
        successfulRequests,
        failedRequests,
        totalCharges: charges._sum.totalAmount?.toString() || "0.00",
      },

      pagination: {
        page,
        pageSize,
        totalRecords,
        totalPages: Math.ceil(totalRecords / pageSize),
      },

      records: records.map((record) => ({
        id: record.id,
        requestId: record.requestId,
        operation: record.operation,
        endpoint: record.endpoint,
        quantity: record.quantity,
        unitPrice: record.unitPrice.toString(),
        totalAmount: record.totalAmount.toString(),
        currency: record.currency,
        status: record.status,
        responseCode: record.responseCode,
        processingMs: record.processingMs,
        billingPeriod: record.billingPeriod,
        createdAt: record.createdAt.toISOString(),

        customer: record.customer,

        apiKey: record.apiKey
          ? {
              id: record.apiKey.id,
              name: record.apiKey.name,
              prefix: record.apiKey.prefix,
              environment: record.apiKey.environment,
            }
          : null,
      })),
    });
  } catch (error) {
    console.error("Admin usage API error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to retrieve usage records.",
      },
      { status: 500 }
    );
  }
}
