
import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-key-auth";

export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      {
        success: false,
        error: auth.message,
      },
      { status: auth.status }
    );
  }

  return NextResponse.json({
    success: true,
    message: "API authentication successful.",
    account: {
      customerCode: auth.customer.customerCode,
      name: auth.customer.name,
      email: auth.customer.email,
    },
    credentials: {
      keyName: auth.apiKey.name,
      environment: auth.apiKey.environment,
    },
  });
}
