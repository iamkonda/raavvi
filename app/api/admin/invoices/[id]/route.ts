
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

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
    // 1. Authenticate admin
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Check permissions
    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "BILLING"];

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // 3. Get invoice ID
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Invoice ID is required." },
        { status: 400 }
      );
    }

    // 4. Retrieve invoice with customer and usage details
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            customerCode: true,
            name: true,
            email: true,
            billingEmail: true,
            contactName: true,
            phone: true,
            country: true,
          },
        },
        usageRecords: {
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
            pricingRuleId: true,
            pricingVersion: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 }
      );
    }

    // 5. Calculate outstanding balance
    const balanceDue = invoice.totalAmount.minus(
      invoice.amountPaid
    );

    // 6. Return invoice details
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        billingPeriod: invoice.billingPeriod,
        currency: invoice.currency,

        subtotal: invoice.subtotal.toString(),
        taxAmount: invoice.taxAmount.toString(),
        totalAmount: invoice.totalAmount.toString(),
        amountPaid: invoice.amountPaid.toString(),
        balanceDue: balanceDue.toString(),

        status: invoice.status,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        paidAt: invoice.paidAt,
        notes: invoice.notes,

        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,

        customer: invoice.customer,

        usageRecords: invoice.usageRecords.map((record) => ({
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
          pricingRuleId: record.pricingRuleId,
          pricingVersion: record.pricingVersion,
          createdAt: record.createdAt,
        })),

        usageRecordCount: invoice.usageRecords.length,
      },
    });
  } catch (error) {
    console.error("Invoice details API error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to retrieve invoice details.",
      },
      { status: 500 }
    );
  }
}


export async function PATCH(
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

    const allowedRoles = ["SUPER_ADMIN", "ADMIN", "BILLING"];

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (
      typeof body.dueDate !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(body.dueDate)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid due date is required (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    const dueDate = new Date(`${body.dueDate}T00:00:00.000Z`);

    if (
      Number.isNaN(dueDate.getTime()) ||
      dueDate.toISOString().slice(0, 10) !== body.dueDate
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid due date." },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { success: false, message: "Invoice not found." },
        { status: 404 }
      );
    }

    if (invoice.status !== "DRAFT") {
      return NextResponse.json(
        {
          success: false,
          message: "Only draft invoices can be issued.",
        },
        { status: 409 }
      );
    }

    const now = new Date();

    if (dueDate.getTime() < Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )) {
      return NextResponse.json(
        {
          success: false,
          message: "Due date cannot be in the past.",
        },
        { status: 400 }
      );
    }

    const updated = await prisma.invoice.updateMany({
      where: {
        id,
        status: "DRAFT",
      },
      data: {
        status: "ISSUED",
        issueDate: now,
        dueDate,
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        {
          success: false,
          message: "Invoice status changed. Refresh and try again.",
        },
        { status: 409 }
      );
    }

    const updatedInvoice = await prisma.invoice.findUnique({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Invoice issued successfully.",
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error("Invoice issuing error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to issue invoice.",
      },
      { status: 500 }
    );
  }
}
