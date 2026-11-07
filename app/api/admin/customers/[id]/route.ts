
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function authorizeAdmin() {
  const session = await getServerSession(authOptions);

  const allowedRoles = [
    "SUPER_ADMIN",
    "ADMIN",
    "SUPPORT",
    "BILLING",
  ];

  return !!(
    session?.user &&
    allowedRoles.includes(session.user.role)
  );
}

const updateCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().email().max(255).optional(),
  contactName: z.string().trim().max(200).nullable().optional(),
  phone: z.string().trim().max(50).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  billingEmail: z
    .union([z.string().trim().email().max(255), z.literal("")])
    .nullable()
    .optional(),
  notes: z.string().trim().max(5000).nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await authorizeAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { customerCode: id },
      select: {
        id: true,
        customerCode: true,
        name: true,
        email: true,
        contactName: true,
        phone: true,
        country: true,
        billingEmail: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            apiKeys: true,
            usageRecords: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, customer });
  } catch (error) {
    console.error("Customer retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve customer details." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await authorizeAdmin())) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const validation = updateCustomerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Please check the submitted customer details.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { customerCode: id },
      select: { id: true },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, message: "Customer not found." },
        { status: 404 }
      );
    }

    const updateData = validation.data;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "No changes were submitted." },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { customerCode: id },
      data: updateData,
      select: {
        id: true,
        customerCode: true,
        name: true,
        email: true,
        contactName: true,
        phone: true,
        country: true,
        billingEmail: true,
        notes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            apiKeys: true,
            usageRecords: true,
            invoices: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Customer updated successfully.",
      customer,
    });
  } catch (error) {
    console.error("Customer update failed:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A customer with this email address already exists.",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: "Unable to update customer." },
      { status: 500 }
    );
  }
}
