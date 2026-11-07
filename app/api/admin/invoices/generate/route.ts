
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma, InvoiceStatus, UsageStatus } from "@prisma/client";
import { randomUUID } from "crypto";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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

    // 3. Validate request
    const body = await request.json();

    const billingPeriod = body.billingPeriod;
    const customerId = body.customerId;

    if (
      typeof billingPeriod !== "string" ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(billingPeriod)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid billing period. Use YYYY-MM format.",
        },
        { status: 400 }
      );
    }

    if (
      customerId !== undefined &&
      (typeof customerId !== "string" || customerId.trim() === "")
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid customer ID." },
        { status: 400 }
      );
    }

    // 4. Find customers and currencies with unbilled usage
    const groups = await prisma.usageRecord.findMany({
      where: {
        billingPeriod,
        status: UsageStatus.SUCCESS,
        totalAmount: { gt: 0 },
        invoiceId: null,
        ...(customerId ? { customerId } : {}),
      },
      select: {
        customerId: true,
        currency: true,
      },
      distinct: ["customerId", "currency"],
    });

    if (groups.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unbilled usage records found.",
        billingPeriod,
        created: 0,
        updated: 0,
        skipped: 0,
        invoices: [],
      });
    }

    const results: Array<{
      invoiceId: string;
      invoiceNumber: string;
      customerId: string;
      currency: string;
      amount: string;
      usageRecords: number;
      action: "created" | "updated";
    }> = [];

    let skipped = 0;

    // 5. Process each customer and currency
    for (const group of groups) {
      try {
        const result = await prisma.$transaction(
          async (tx) => {
            // Fetch usage records that are still unbilled
            const usageRecords = await tx.usageRecord.findMany({
              where: {
                customerId: group.customerId,
                currency: group.currency,
                billingPeriod,
                status: UsageStatus.SUCCESS,
                totalAmount: { gt: 0 },
                invoiceId: null,
              },
            });

            if (usageRecords.length === 0) {
              return null;
            }

            // Calculate the new usage amount
            const usageTotal = usageRecords.reduce(
              (sum, record) => sum.plus(record.totalAmount),
              new Prisma.Decimal(0)
            );

            // Check whether a draft invoice already exists
            const existingDraft = await tx.invoice.findFirst({
              where: {
                customerId: group.customerId,
                billingPeriod,
                currency: group.currency,
                status: InvoiceStatus.DRAFT,
              },
            });

            // Do not create another invoice if one has already
            // been issued, paid, or otherwise finalized.
            if (!existingDraft) {
              const existingInvoice = await tx.invoice.findFirst({
                where: {
                  customerId: group.customerId,
                  billingPeriod,
                  currency: group.currency,
                },
              });

              if (existingInvoice) {
                return null;
              }
            }

            let invoice;

            if (existingDraft) {
              // Add new usage to the existing draft
              const newSubtotal =
                existingDraft.subtotal.plus(usageTotal);

              const newTotal = newSubtotal.plus(
                existingDraft.taxAmount
              );

              invoice = await tx.invoice.update({
                where: { id: existingDraft.id },
                data: {
                  subtotal: newSubtotal,
                  totalAmount: newTotal,
                },
              });
            } else {
              // Create a new draft invoice
              const invoiceNumber =
                `RV-${billingPeriod.replace("-", "")}-` +
                `${group.customerId.slice(-6).toUpperCase()}-` +
                randomUUID().slice(0, 6).toUpperCase();

              invoice = await tx.invoice.create({
                data: {
                  invoiceNumber,
                  billingPeriod,
                  currency: group.currency,
                  subtotal: usageTotal,
                  taxAmount: new Prisma.Decimal(0),
                  totalAmount: usageTotal,
                  amountPaid: new Prisma.Decimal(0),
                  status: InvoiceStatus.DRAFT,
                  customerId: group.customerId,
                },
              });
            }

            // Link usage records to the invoice
            const linked = await tx.usageRecord.updateMany({
              where: {
                id: {
                  in: usageRecords.map((record) => record.id),
                },
                invoiceId: null,
              },
              data: {
                invoiceId: invoice.id,
              },
            });

            // Roll back if any record was not linked
            if (linked.count !== usageRecords.length) {
              throw new Error(
                "Usage records changed during invoice generation."
              );
            }

            return {
              invoiceId: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerId: group.customerId,
              currency: group.currency,
              amount: usageTotal.toString(),
              usageRecords: linked.count,
              action: existingDraft ? "updated" as const : "created" as const,
            };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          }
        );

        if (result) {
          results.push(result);
        } else {
          skipped++;
        }
      } catch (error) {
        console.error(
          `Invoice generation failed for customer ${group.customerId}:`,
          error
        );

        throw error;
      }
    }

    // 6. Return results
    const created = results.filter(
      (invoice) => invoice.action === "created"
    ).length;

    const updated = results.filter(
      (invoice) => invoice.action === "updated"
    ).length;

    return NextResponse.json({
      success: true,
      message: "Invoice generation completed.",
      billingPeriod,
      created,
      updated,
      skipped,
      invoices: results,
    });
  } catch (error) {
    console.error("Invoice generation error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Invoice generation failed. Please try again.",
      },
      { status: 500 }
    );
  }
}
