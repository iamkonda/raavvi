
import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export type ApiKeyAuthResult =
  | {
      authenticated: true;
      customer: {
        id: string;
        customerCode: string;
        name: string;
        email: string;
      };
      apiKey: {
        id: string;
        name: string;
        environment: "LIVE" | "TEST";
      };
    }
  | {
      authenticated: false;
      status: number;
      message: string;
    };

export async function authenticateApiKey(
  request: Request
): Promise<ApiKeyAuthResult> {
  try {
    const authorization = request.headers.get("authorization");

    if (!authorization) {
      return {
        authenticated: false,
        status: 401,
        message: "Missing API key. Provide a Bearer token.",
      };
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return {
        authenticated: false,
        status: 401,
        message: "Invalid authorization format.",
      };
    }

    const suppliedKey = match[1].trim();

    if (!suppliedKey || suppliedKey.length > 200) {
      return {
        authenticated: false,
        status: 401,
        message: "Invalid API key.",
      };
    }

    const keyHash = createHash("sha256")
      .update(suppliedKey)
      .digest("hex");

    const storedKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        name: true,
        status: true,
        environment: true,
        expiresAt: true,
        customer: {
          select: {
            id: true,
            customerCode: true,
            name: true,
            email: true,
            status: true,
          },
        },
      },
    });

    if (!storedKey) {
      return {
        authenticated: false,
        status: 401,
        message: "Invalid API key.",
      };
    }

    if (storedKey.environment !== "LIVE") {
      return {
        authenticated: false,
        status: 403,
        message: "TEST API keys are not permitted on this endpoint.",
      };
    }

    if (storedKey.status !== "ACTIVE") {
      return {
        authenticated: false,
        status: 401,
        message: "This API key is not active.",
      };
    }

    if (storedKey.expiresAt && storedKey.expiresAt <= new Date()) {
      await prisma.apiKey.updateMany({
        where: {
          id: storedKey.id,
          status: "ACTIVE",
        },
        data: {
          status: "EXPIRED",
        },
      });

      return {
        authenticated: false,
        status: 401,
        message: "This API key has expired.",
      };
    }

    if (storedKey.customer.status !== "ACTIVE") {
      return {
        authenticated: false,
        status: 403,
        message: "This customer account is not active.",
      };
    }

    await prisma.apiKey.updateMany({
      where: {
        id: storedKey.id,
        status: "ACTIVE",
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    return {
      authenticated: true,
      customer: {
        id: storedKey.customer.id,
        customerCode: storedKey.customer.customerCode,
        name: storedKey.customer.name,
        email: storedKey.customer.email,
      },
      apiKey: {
        id: storedKey.id,
        name: storedKey.name,
        environment: storedKey.environment,
      },
    };
  } catch (error) {
    console.error("API key authentication failed:", error);

    return {
      authenticated: false,
      status: 500,
      message: "Unable to authenticate API request.",
    };
  }
}
