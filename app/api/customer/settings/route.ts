
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(100),
  contactName: z.string().trim().max(100).nullable(),
  phone: z.string().trim().max(30).nullable(),
  country: z.string().trim().max(100).nullable(),
  billingEmail: z.union([
    z.string().trim().email().max(254),
    z.literal(""),
    z.null(),
  ]),
});

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
        customerCode: true,
        name: true,
        email: true,
        contactName: true,
        phone: true,
        country: true,
        billingEmail: true,
        status: true,
        createdAt: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account is not active." },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      settings: {
        ...customer,
        createdAt: customer.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("Customer settings retrieval failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to retrieve settings." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "CUSTOMER") {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = settingsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid settings information.",
          errors: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: session.user.id,
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer account is not active." },
        { status: 403 }
      );
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        name: validation.data.name,
        contactName: validation.data.contactName || null,
        phone: validation.data.phone || null,
        country: validation.data.country || null,
        billingEmail: validation.data.billingEmail || null,
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
        status: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully.",
      settings: updatedCustomer,
    });
  } catch (error) {
    console.error("Customer settings update failed:", error);

    return NextResponse.json(
      { success: false, message: "Unable to update settings." },
      { status: 500 }
    );
  }
}
