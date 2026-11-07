
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authenticateApiKey } from "@/lib/api-key-auth";
import { prisma } from "@/lib/prisma";

const searchSchema = z.object({
  query: z.string().trim().min(2).max(400),
  search_depth: z.enum(["basic", "advanced"]).default("basic"),
  topic: z.enum(["general", "news", "finance"]).default("general"),
  max_results: z.number().int().min(1).max(10).default(5),
  include_answer: z.boolean().default(false),
});

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 1. Authenticate the Raavvi API key
  const auth = await authenticateApiKey(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { success: false, error: auth.message },
      { status: auth.status }
    );
  }

  // 2. Check Tavily configuration
  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    return NextResponse.json(
      { success: false, error: "Search service is not configured." },
      { status: 503 }
    );
  }

  // 3. Validate request
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON request body." },
      { status: 400 }
    );
  }

  const validation = searchSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid search parameters.",
        details: validation.error.flatten(),
      },
      { status: 400 }
    );
  }

  const {
    query,
    search_depth,
    topic,
    max_results,
    include_answer,
  } = validation.data;

  // 4. Resolve the applicable pricing rule
  const now = new Date();
  let pricingRule: {
    id: string;
    unitPrice: Prisma.Decimal;
    currency: string;
    version: number;
  } | null = null;

  const isTestKey = auth.apiKey.environment === "TEST";

  if (!isTestKey) {
    const effectivePricingFilter = {
      operation: "search",
      isActive: true,
      effectiveFrom: { lte: now },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: now } },
      ],
    };

    try {
      // Customer-specific pricing takes priority.
      pricingRule = await prisma.pricingRule.findFirst({
        where: {
          ...effectivePricingFilter,
          scope: "CUSTOMER",
          customerId: auth.customer.id,
        },
        select: {
          id: true,
          unitPrice: true,
          currency: true,
          version: true,
        },
        orderBy: [
          { effectiveFrom: "desc" },
          { version: "desc" },
        ],
      });

      // Fall back to default pricing when no customer rate applies.
      if (!pricingRule) {
        pricingRule = await prisma.pricingRule.findFirst({
          where: {
            ...effectivePricingFilter,
            scope: "DEFAULT",
            customerId: null,
          },
          select: {
            id: true,
            unitPrice: true,
            currency: true,
            version: true,
          },
          orderBy: [
            { effectiveFrom: "desc" },
            { version: "desc" },
          ],
        });
      }
    } catch (error) {
      console.error("Pricing lookup failed:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Unable to determine the applicable pricing.",
        },
        { status: 503 }
      );
    }

    if (!pricingRule) {
      return NextResponse.json(
        {
          success: false,
          error: "No active pricing rule is configured for Web Search. Please contact support.",
        },
        { status: 503 }
      );
    }

    if (pricingRule.currency !== "USD") {
      return NextResponse.json(
        {
          success: false,
          error: "The configured search pricing currency is not supported by this billing endpoint.",
        },
        { status: 503 }
      );
    }
  }

  // TEST requests are free. LIVE requests use the resolved database price.
  const unitPrice = isTestKey
    ? new Prisma.Decimal(0)
    : pricingRule!.unitPrice;

  const currency = isTestKey
    ? "USD"
    : pricingRule!.currency;

  const totalAmount = unitPrice;

  // 5. Call Tavily
  let data: {
    query?: string;
    answer?: string | null;
    response_time?: number;
    results?: Array<{
      title?: string;
      url?: string;
      content?: string;
      score?: number;
      published_date?: string;
    }>;
  };

  try {
    const tavilyResponse = await fetch(
      "https://api.tavily.com/search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query,
          search_depth,
          topic,
          max_results,
          include_answer,
        }),
        cache: "no-store",
        signal: AbortSignal.timeout(30000),
      }
    );

    if (!tavilyResponse.ok) {
      console.error("Tavily error status:", tavilyResponse.status);

      return NextResponse.json(
        {
          success: false,
          error: "The search provider could not complete your request.",
        },
        { status: 502 }
      );
    }

    data = await tavilyResponse.json();
  } catch (error) {
    console.error("Tavily request failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete the search request.",
      },
      { status: 502 }
    );
  }

  // 6. Prepare usage record
  const requestId = randomUUID();
  const processingMs = Date.now() - startedAt;

  const billingPeriod =
    `${now.getUTCFullYear()}-${String(
      now.getUTCMonth() + 1
    ).padStart(2, "0")}`;

  // 7. Save usage and pricing snapshot in PostgreSQL
  try {
    await prisma.usageRecord.create({
      data: {
        requestId,
        operation: "search",
        endpoint: "/api/v1/search",
        quantity: 1,
        unitPrice,
        totalAmount,
        currency,
        status: "SUCCESS",
        responseCode: 200,
        processingMs,
        billingPeriod,
        pricingRuleId: pricingRule?.id ?? null,
        pricingVersion: pricingRule?.version ?? null,
        customerId: auth.customer.id,
        apiKeyId: auth.apiKey.id,
      },
    });
  } catch (error) {
    console.error("Failed to record search usage:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Search completed, but usage recording failed. Please contact support before retrying.",
      },
      { status: 503 }
    );
  }

  // 8. Return search response and billing details
  return NextResponse.json({
    success: true,
    requestId,
    billing: {
      operation: "search",
      quantity: 1,
      unitPrice: unitPrice.toString(),
      totalAmount: totalAmount.toString(),
      currency,
      billable: unitPrice.greaterThan(0),
      pricingRuleId: pricingRule?.id ?? null,
      pricingVersion: pricingRule?.version ?? null,
    },
    search: {
      query: data.query ?? query,
      answer: data.answer ?? null,
      responseTime: data.response_time ?? null,
      results: (data.results ?? []).map((result) => ({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score,
        publishedDate: result.published_date ?? null,
      })),
    },
  });
}
