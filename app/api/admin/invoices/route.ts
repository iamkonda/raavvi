
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { InvoiceStatus, Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "BILLING"];

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "";
    const billingPeriod = searchParams.get("billingPeriod") || "";
    const customerId = searchParams.get("customerId") || "";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "50", 10) || 50
      )
    );

    if (status && !Object.values(InvoiceStatus).includes(status as InvoiceStatus)) {
      return NextResponse.json(
        { success: false, message: "Invalid invoice status." },
        { status: 400 }
      );
    }

    if (
      billingPeriod &&
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid billing period." },
        { status: 400 }
      );
    }

    const where: Prisma.InvoiceWhereInput = {
      ...(status ? { status: status as InvoiceStatus } : {}),
      ...(billingPeriod ? { billingPeriod } : {}),
      ...(customerId ? { customerId } : {}),
      ...(search
        ? {
            OR: [
              {
                invoiceNumber: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                customer: {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                customer: {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
              {
                customer: {
                  customerCode: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [invoices, totalCount, customers, statusCounts, financials] =
      await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            customer: {
              select: {
                id: true,
                customerCode: true,
                name: true,
                email: true,
                billingEmail: true,
                country: true,
              },
            },
            _count: {
              select: {
                usageRecords: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip: (page - 1) * limit,
          take: limit,
        }),

        prisma.invoice.count({ where }),

        prisma.customer.findMany({
          select: {
            id: true,
            customerCode: true,
            name: true,
            email: true,
          },
          orderBy: {
            name: "asc",
          },
        }),

        prisma.invoice.groupBy({
          by: ["status"],
          _count: {
            _all: true,
          },
        }),

        prisma.invoice.aggregate({
          _sum: {
            totalAmount: true,
            amountPaid: true,
          },
          _count: {
            _all: true,
          },
        }),
      ]);

    const outstanding = new Prisma.Decimal(
      financials._sum.totalAmount || 0
    ).minus(
      new Prisma.Decimal(financials._sum.amountPaid || 0)
    );

    return NextResponse.json({
      success: true,
      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingPeriod: invoice.billingPeriod,
        currency: invoice.currency,
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        totalAmount: invoice.totalAmount.toString(),
        amountPaid: invoice.amountPaid.toString(),
        balanceDue: invoice.totalAmount
          .minus(invoice.amountPaid)
          .toString(),
        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        customer: invoice.customer,
        usageRecordCount: invoice._count.usageRecords,
      })),
      customers,
      summary: {
        invoiceCount: financials._count._all,
        totalInvoiced: (
          financials._sum.totalAmount || new Prisma.Decimal(0)
        ).toString(),
        totalPaid: (
          financials._sum.amountPaid || new Prisma.Decimal(0)
        ).toString(),
        outstanding: outstanding.toString(),
        statusCounts: statusCounts.reduce(
          (acc, item) => {
            acc[item.status] = item._count._all;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Admin invoice retrieval error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve invoices.",
      },
      { status: 500 }
    );
  }
}
