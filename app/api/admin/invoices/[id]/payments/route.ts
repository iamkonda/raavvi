
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, InvoiceStatus } from "@prisma/client";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["SUPER_ADMIN", "ADMIN", "BILLING"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        invoiceNumber: true,
        currency: true,
        totalAmount: true,
        amountPaid: true,
        status: true,
        payments: {
          orderBy: { receivedAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        currency: invoice.currency,
        totalAmount: invoice.totalAmount.toString(),
        amountPaid: invoice.amountPaid.toString(),
        balanceDue: invoice.totalAmount.minus(invoice.amountPaid).toString(),
        status: invoice.status,
      },
      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount.toString(),
        currency: payment.currency,
        reference: payment.reference,
        notes: payment.notes,
        receivedAt: payment.receivedAt,
        createdAt: payment.createdAt,
      })),
    });
  } catch (error) {
    console.error("Payment history error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve payment history." },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!["SUPER_ADMIN", "ADMIN", "BILLING"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const amountValue = body.amount;

    if (
      (typeof amountValue !== "string" && typeof amountValue !== "number") ||
      !/^\d+(\.\d{1,8})?$/.test(String(amountValue))
    ) {
      return NextResponse.json(
        { success: false, message: "Enter a valid payment amount." },
        { status: 400 }
      );
    }

    const amount = new Prisma.Decimal(String(amountValue));

    if (!amount.isFinite() || amount.lte(0)) {
      return NextResponse.json(
        { success: false, message: "Payment amount must be greater than zero." },
        { status: 400 }
      );
    }

    const reference =
      typeof body.reference === "string"
        ? body.reference.trim().slice(0, 150)
        : null;

    const notes =
      typeof body.notes === "string"
        ? body.notes.trim().slice(0, 1000)
        : null;

    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id },
      });

      if (!invoice) {
        throw new Error("INVOICE_NOT_FOUND");
      }

      if (
        invoice.status === InvoiceStatus.DRAFT ||
        invoice.status === InvoiceStatus.CANCELLED
      ) {
        throw new Error("INVOICE_NOT_PAYABLE");
      }

      const balanceDue = invoice.totalAmount.minus(invoice.amountPaid);

      if (amount.gt(balanceDue)) {
        throw new Error("PAYMENT_EXCEEDS_BALANCE");
      }

      const payment = await tx.payment.create({
        data: {
          amount,
          currency: invoice.currency,
          reference,
          notes,
          invoiceId: invoice.id,
        },
      });

      const newAmountPaid = invoice.amountPaid.plus(amount);
      const fullyPaid = newAmountPaid.gte(invoice.totalAmount);

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          amountPaid: newAmountPaid,
          status: fullyPaid ? InvoiceStatus.PAID : invoice.status,
          paidAt: fullyPaid ? new Date() : null,
        },
      });

      return {
        payment,
        invoice: updatedInvoice,
      };
    });

    return NextResponse.json({
      success: true,
      message: "Payment recorded successfully.",
      payment: {
        id: result.payment.id,
        amount: result.payment.amount.toString(),
        currency: result.payment.currency,
        reference: result.payment.reference,
        receivedAt: result.payment.receivedAt,
      },
      invoice: {
        id: result.invoice.id,
        status: result.invoice.status,
        totalAmount: result.invoice.totalAmount.toString(),
        amountPaid: result.invoice.amountPaid.toString(),
        balanceDue: result.invoice.totalAmount
          .minus(result.invoice.amountPaid)
          .toString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (message === "INVOICE_NOT_FOUND") {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 }
      );
    }

    if (message === "INVOICE_NOT_PAYABLE") {
      return NextResponse.json(
        { success: false, message: "Payments can only be recorded against issued or overdue invoices." },
        { status: 409 }
      );
    }

    if (message === "PAYMENT_EXCEEDS_BALANCE") {
      return NextResponse.json(
        { success: false, message: "Payment exceeds the outstanding balance." },
        { status: 400 }
      );
    }

    console.error("Payment recording error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to record payment." },
      { status: 500 }
    );
  }
}
