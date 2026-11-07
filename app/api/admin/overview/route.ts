
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const allowedRoles = ["SUPER_ADMIN", "ADMIN", "BILLING", "SUPPORT"];

function money(value: unknown) {
  return Number(value ?? 0);
}

function relativeTime(date: Date) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export async function GET() {
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
        { error: "You do not have permission to view this dashboard." },
        { status: 403 }
      );
    }

    const now = new Date();

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const nextMonthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
    );

    const currentPeriod = `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

    const chartStart = new Date(now);
    chartStart.setUTCDate(chartStart.getUTCDate() - 29);
    chartStart.setUTCHours(0, 0, 0, 0);

    const [
      totalCustomers,
      activeCustomers,
      monthlyRequestCount,
      monthlyUsage,
      outstandingInvoices,
      recentCustomers,
      customerUsage,
      chartUsage,
      recentUsage,
      recentInvoices,
      recentPayments,
    ] = await Promise.all([
      // Customer statistics
      prisma.customer.count(),

      prisma.customer.count({
        where: { status: "ACTIVE" },
      }),

      // API requests this month, including failed requests
      prisma.usageRecord.count({
        where: {
          createdAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      }),

      // Successful billable usage this month
      prisma.usageRecord.aggregate({
        where: {
          billingPeriod: currentPeriod,
          status: "SUCCESS",
          totalAmount: { gt: 0 },
        },
        _sum: {
          totalAmount: true,
          quantity: true,
        },
      }),

      // All issued and overdue invoices with outstanding balances
      prisma.invoice.findMany({
        where: {
          status: { in: ["ISSUED", "OVERDUE"] },
        },
        select: {
          totalAmount: true,
          amountPaid: true,
          dueDate: true,
        },
      }),

      // Latest customers
      prisma.customer.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          customerCode: true,
          name: true,
          email: true,
          billingEmail: true,
          status: true,
          createdAt: true,
        },
      }),

      // Usage grouped by customer for this billing period
      prisma.usageRecord.groupBy({
        by: ["customerId"],
        where: {
          billingPeriod: currentPeriod,
          status: "SUCCESS",
        },
        _sum: {
          quantity: true,
          totalAmount: true,
        },
      }),

      // Usage for the last 30 days
      prisma.usageRecord.findMany({
        where: {
          createdAt: { gte: chartStart },
        },
        select: {
          createdAt: true,
          status: true,
          quantity: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      // Latest usage activity
      prisma.usageRecord.findMany({
        take: 6,
        orderBy: { createdAt: "desc" },
        include: {
          customer: {
            select: { name: true },
          },
        },
      }),

      // Latest invoice activity
      prisma.invoice.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: {
          customer: {
            select: { name: true },
          },
        },
      }),

      // Latest recorded payments
      prisma.payment.findMany({
        take: 5,
        orderBy: { receivedAt: "desc" },
        include: {
          invoice: {
            include: {
              customer: {
                select: { name: true },
              },
            },
          },
        },
      }),
    ]);

    // Calculate outstanding balances.
    const outstanding = outstandingInvoices.reduce(
      (sum, invoice) =>
        sum +
        Math.max(
          money(invoice.totalAmount) - money(invoice.amountPaid),
          0
        ),
      0
    );

    const overdue = outstandingInvoices.reduce((sum, invoice) => {
      if (!invoice.dueDate || invoice.dueDate >= now) return sum;

      return (
        sum +
        Math.max(
          money(invoice.totalAmount) - money(invoice.amountPaid),
          0
        )
      );
    }, 0);

    const unpaidInvoiceCount = outstandingInvoices.filter(
      (invoice) =>
        money(invoice.totalAmount) - money(invoice.amountPaid) > 0
    ).length;

    // Map customer usage to the latest customer list.
    const usageByCustomer = new Map(
      customerUsage.map((item) => [
        item.customerId,
        {
          requests: Number(item._sum.quantity ?? 0),
          amount: money(item._sum.totalAmount),
        },
      ])
    );

    const customers = recentCustomers.map((customer) => {
      const usage = usageByCustomer.get(customer.id);

      return {
        id: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
        email: customer.billingEmail || customer.email,
        requests: usage?.requests ?? 0,
        amount: usage?.amount ?? 0,
        status: customer.status,
        createdAt: customer.createdAt,
      };
    });

    // Build a 30-day usage chart.
    const dailyUsage = new Map<
      string,
      { requests: number; successful: number; failed: number }
    >();

    for (let i = 0; i < 30; i++) {
      const date = new Date(chartStart);
      date.setUTCDate(chartStart.getUTCDate() + i);

      dailyUsage.set(date.toISOString().slice(0, 10), {
        requests: 0,
        successful: 0,
        failed: 0,
      });
    }

    for (const record of chartUsage) {
      const dateKey = record.createdAt.toISOString().slice(0, 10);
      const day = dailyUsage.get(dateKey);

      if (!day) continue;

      const quantity = Number(record.quantity ?? 1);

      day.requests += quantity;

      if (record.status === "SUCCESS") {
        day.successful += quantity;
      } else {
        day.failed += quantity;
      }
    }

    const usageChart = Array.from(dailyUsage.entries()).map(
      ([date, values]) => ({
        date,
        ...values,
      })
    );

    // Build recent activity from actual database records.
    const activity = [
      ...recentUsage.map((record) => ({
        id: `usage-${record.id}`,
        type: "USAGE",
        title:
          record.status === "SUCCESS"
            ? "API request completed"
            : "API request failed",
        description: `${record.customer.name} · ${record.operation}`,
        amount: money(record.totalAmount),
        status: record.status,
        createdAt: record.createdAt,
        time: relativeTime(record.createdAt),
      })),

      ...recentInvoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        type: "INVOICE",
        title: `Invoice ${invoice.status.toLowerCase()}`,
        description: `${invoice.customer.name} · ${invoice.invoiceNumber}`,
        amount: money(invoice.totalAmount),
        status: invoice.status,
        createdAt: invoice.updatedAt,
        time: relativeTime(invoice.updatedAt),
      })),

      ...recentPayments.map((payment) => ({
        id: `payment-${payment.id}`,
        type: "PAYMENT",
        title: "Payment recorded",
        description: `${payment.invoice.customer.name} · ${payment.invoice.invoiceNumber}`,
        amount: money(payment.amount),
        status: "RECORDED",
        createdAt: payment.receivedAt,
        time: relativeTime(payment.receivedAt),
      })),
    ]
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime()
      )
      .slice(0, 8)
      .map(({ createdAt, ...item }) => item);

    return NextResponse.json({
      period: currentPeriod,
      generatedAt: now.toISOString(),

      stats: {
        totalCustomers,
        activeCustomers,
        totalRequests: monthlyRequestCount,
        successfulRequests: Number(
          monthlyUsage._sum.quantity ?? 0
        ),
        revenue: money(monthlyUsage._sum.totalAmount),
        outstanding,
        overdue,
        unpaidInvoiceCount,
      },

      usageChart,

      customers,

      activity,
    });
  } catch (error) {
    console.error("Overview dashboard error:", error);

    return NextResponse.json(
      { error: "Unable to load overview dashboard." },
      { status: 500 }
    );
  }
}
