
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    const tableCount = await prisma.customer.count();

    return NextResponse.json({
      success: true,
      message: "Raavvi successfully connected to Neon PostgreSQL.",
      database: "Connected",
      customerRecords: tableCount,
    });
  } catch (error) {
    console.error("Database connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Database connection failed.",
      },
      { status: 500 }
    );
  }
}
