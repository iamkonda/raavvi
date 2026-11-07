
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SUPER_ADMIN", "ADMIN", "BILLING"];

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return Number(value ?? 0);
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!allowedRoles.includes(session.user.role ?? "")) {
      return NextResponse.json(
        { error: "You do not have permission to view billing data." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const requestedPeriod = searchParams.get("period");

    const now = new Date();

    // Get all available periods from usage and invoices.
    const [usagePeriods, invoicePeriods] = await Promise.all([
      prisma.usageRecord.findMany({
        where: {
          status: "SUCCESS",
          totalAmount: { gt: 0 },
        },
        select: { billingPeriod: true },
        distinct: ["billingPeriod"],
        orderBy: { billingPeriod: "desc" },
      }),

      prisma.invoice.findMany({
        select: { billingPeriod: true },
        distinct: ["billingPeriod"],
        orderBy: { billingPeriod: "desc" },
      }),
    ]);

    const periods = Array.from(
      new Set([
        ...usagePeriods.map((item) => item.billingPeriod),
        ...invoicePeriods.map((item) => item.billingPeriod),
      ])
    ).sort((a, b) => b.localeCompare(a));

    const period =
      requestedPeriod && /^\d{4}-\d{2}$/.test(requestedPeriod)
        ? requestedPeriod
        : periods[0] ?? now.toISOString().slice(0, 7);

    // Get billable usage totals for the selected period.
    const usageSummary = await prisma.usageRecord.aggregate({
      where: {
        billingPeriod: period,
        status: "SUCCESS",
        totalAmount: { gt: 0 },
      },
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    // Get invoices and their associated customer and usage details.
    const invoices = await prisma.invoice.findMany({
      where: {
        billingPeriod: period,
      },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            name: true,
            email: true,
            billingEmail: true,
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
    });

    const records = invoices.map((invoice) => {
      const amount = decimalToNumber(invoice.totalAmount);
      const paid = decimalToNumber(invoice.amountPaid);
      const balance = Math.max(amount - paid, 0);

      let status = invoice.status;

      // Derive overdue status for issued invoices whose due date has passed.
      if (
        balance > 0 &&
        invoice.dueDate &&
        invoice.dueDate < now &&
        (status === "ISSUED" || status === "OVERDUE")
      ) {
        status = "OVERDUE";
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customer.id,
        customerCode: invoice.customer.customerCode,
        customer: invoice.customer.name,
        email:
          invoice.customer.billingEmail ||
          invoice.customer.email,
        period: invoice.billingPeriod,
        requests: invoice._count.usageRecords,
        amount,
        paid,
        outstanding: balance,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        status,
        currency: invoice.currency,
      };
    });

    // Exclude cancelled invoices from financial totals.
    const activeRecords = records.filter(
      (record) => record.status !== "CANCELLED"
    );

    const totalBilled = activeRecords.reduce(
      (sum, record) => sum + record.amount,
      0
    );

    const totalPaid = activeRecords.reduce(
      (sum, record) => sum + record.paid,
      0
    );

    const outstanding = activeRecords.reduce(
      (sum, record) => sum + record.outstanding,
      0
    );

    const overdue = activeRecords
      .filter((record) => record.status === "OVERDUE")
      .reduce((sum, record) => sum + record.outstanding, 0);

    const statusCounts = {
      PAID: records.filter((r) => r.status === "PAID").length,
      ISSUED: records.filter((r) => r.status === "ISSUED").length,
      OVERDUE: records.filter((r) => r.status === "OVERDUE").length,
      DRAFT: records.filter((r) => r.status === "DRAFT").length,
      CANCELLED: records.filter((r) => r.status === "CANCELLED").length,
    };

    // Count successful billable usage that has not yet been invoiced.
    const unbilledUsage = await prisma.usageRecord.aggregate({
      where: {
        billingPeriod: period,
        status: "SUCCESS",
        totalAmount: { gt: 0 },
        invoiceId: null,
      },
      _sum: {
        quantity: true,
        totalAmount: true,
      },
      _count: {
        _all: true,
      },
    });

    return NextResponse.json({
      period,
      periods,
      summary: {
        totalRequests: Number(usageSummary._sum.quantity ?? 0),
        billableUsageAmount: decimalToNumber(
          usageSummary._sum.totalAmount
        ),
        totalBilled,
        totalPaid,
        outstanding,
        overdue,
        invoiceCount: records.length,
        statusCounts,
        unbilledRequests: Number(
          unbilledUsage._sum.quantity ?? 0
        ),
        unbilledAmount: decimalToNumber(
          unbilledUsage._sum.totalAmount
        ),
        unbilledRecordCount: unbilledUsage._count._all,
      },
      records,
    });
  } catch (error) {
    console.error("Billing dashboard error:", error);

    return NextResponse.json(
      { error: "Unable to load billing information." },
      { status: 500 }
    );
  }
}
