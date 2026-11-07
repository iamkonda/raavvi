
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
      select: {
        id: true,
        name: true,
        email: true,
        billingEmail: true,
        country: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account is not active." },
        { status: 403 }
      );
    }

    const invoices = await prisma.invoice.findMany({
      where: {
        customerId: customer.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        invoiceNumber: true,
        billingPeriod: true,
        currency: true,
        subtotal: true,
        taxAmount: true,
        totalAmount: true,
        amountPaid: true,
        status: true,
        issueDate: true,
        dueDate: true,
        paidAt: true,
        notes: true,
        createdAt: true,
        payments: {
          orderBy: {
            receivedAt: "desc",
          },
          select: {
            id: true,
            amount: true,
            currency: true,
            reference: true,
            notes: true,
            receivedAt: true,
          },
        },
        _count: {
          select: {
            usageRecords: true,
          },
        },
      },
    });

    const totalInvoiced = invoices
      .filter((invoice) => invoice.status !== "CANCELLED")
      .reduce(
        (sum, invoice) => sum + Number(invoice.totalAmount),
        0
      );

    const totalPaid = invoices.reduce(
      (sum, invoice) => sum + Number(invoice.amountPaid),
      0
    );

    const outstandingBalance = invoices
      .filter((invoice) =>
        ["ISSUED", "OVERDUE"].includes(invoice.status)
      )
      .reduce(
        (sum, invoice) =>
          sum +
          Math.max(
            0,
            Number(invoice.totalAmount) - Number(invoice.amountPaid)
          ),
        0
      );

    const currency = invoices[0]?.currency ?? "USD";

    return NextResponse.json({
      success: true,

      customer,

      summary: {
        totalInvoiced: totalInvoiced.toFixed(8),
        totalPaid: totalPaid.toFixed(8),
        outstandingBalance: outstandingBalance.toFixed(8),
        invoiceCount: invoices.length,
        unpaidInvoiceCount: invoices.filter((invoice) =>
          ["ISSUED", "OVERDUE"].includes(invoice.status)
        ).length,
        currency,
      },

      invoices: invoices.map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingPeriod: invoice.billingPeriod,
        currency: invoice.currency,
        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        totalAmount: invoice.totalAmount.toString(),
        amountPaid: invoice.amountPaid.toString(),
        outstandingAmount: Math.max(
          0,
          Number(invoice.totalAmount) - Number(invoice.amountPaid)
        ).toFixed(8),
        status: invoice.status,
        issueDate: invoice.issueDate?.toISOString() ?? null,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        paidAt: invoice.paidAt?.toISOString() ?? null,
        notes: invoice.notes,
        createdAt: invoice.createdAt.toISOString(),
        usageRecordCount: invoice._count.usageRecords,

        payments: invoice.payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount.toString(),
          currency: payment.currency,
          reference: payment.reference,
          notes: payment.notes,
          receivedAt: payment.receivedAt.toISOString(),
        })),
      })),
    });
  } catch (error) {
    console.error("Customer billing API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve billing information.",
      },
      { status: 500 }
    );
  }
}
