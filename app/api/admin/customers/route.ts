
import { NextRequest, NextResponse } from "next/server";
import { randomUUID, randomBytes } from "crypto";
import { getServerSession } from "next-auth";
import { hash } from "bcryptjs";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const customerSchema = z.object({
  name: z.string().trim().min(2, "Customer name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  contactName: z.string().trim().min(2, "Contact name is required"),
  phone: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  billingEmail: z.string().trim().email().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]).default("ACTIVE"),
  notes: z.string().trim().optional().nullable(),
});

async function authorizeAdmin() {
  const session = await getServerSession(authOptions);

  const allowedRoles = [
    "SUPER_ADMIN",
    "ADMIN",
    "SUPPORT",
    "BILLING",
  ];

  if (!session?.user || !allowedRoles.includes(session.user.role)) {
    return null;
  }

  return session;
}

// GET /api/admin/customers
// Retrieve all customers.
export async function GET() {
  try {
    const session = await authorizeAdmin();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const customers = await prisma.customer.findMany({
      orderBy: {
        createdAt: "desc",
      },
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
        mustChangePassword: true,
        temporaryPasswordExpiresAt: true,
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
      customers,
    });
  } catch (error) {
    console.error("Customer retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve customers." },
      { status: 500 }
    );
  }
}

// POST /api/admin/customers
// Create a new customer with a temporary password.
export async function POST(request: NextRequest) {
  try {
    const session = await authorizeAdmin();

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = customerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid customer information.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Generate a cryptographically secure temporary password.
    const temporaryPassword = randomBytes(18).toString("base64url");

    // Store only the bcrypt hash.
    const passwordHash = await hash(temporaryPassword, 12);

    // Temporary password expires after 48 hours.
    const temporaryPasswordExpiresAt = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    );

    const customer = await prisma.customer.create({
      data: {
        customerCode: `CUS-${randomUUID().slice(0, 8).toUpperCase()}`,
        name: data.name,
        email: data.email.toLowerCase(),
        contactName: data.contactName,
        phone: data.phone || null,
        country: data.country || null,
        billingEmail: data.billingEmail
          ? data.billingEmail.toLowerCase()
          : null,
        status: data.status,
        notes: data.notes || null,

        // Customer login credentials
        passwordHash,
        mustChangePassword: true,
        temporaryPasswordExpiresAt,
      },
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
        mustChangePassword: true,
        temporaryPasswordExpiresAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Customer created successfully.",
        customer,

        // Returned only during customer creation.
        temporaryPassword,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
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

    console.error("Customer creation failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to create customer." },
      { status: 500 }
    );
  }
}
