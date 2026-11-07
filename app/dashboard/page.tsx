
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  ArrowUpRight,
  Activity,
  Zap,
  CreditCard,
  KeyRound,
  Search,
  FileSearch,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function formatMoney(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatOperation(operation: string) {
  const normalized = operation.toUpperCase();

  if (normalized === "SEARCH") return "Search";
  if (normalized === "EXTRACT") return "Extract";

  return operation.charAt(0).toUpperCase() + operation.slice(1).toLowerCase();
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    redirect("/login");
  }

  const customerId = session.user.id;

  const now = new Date();
  const billingPeriod = `${now.getUTCFullYear()}-${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}`;

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 29);
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);

  // Fetch all overview data for the authenticated customer.
  const [
    totalRequests,
    successfulRequests,
    estimatedBill,
    activeApiKeys,
    operationBreakdown,
    recentActivity,
    last30Days,
  ] = await Promise.all([
    prisma.usageRecord.count({
      where: {
        customerId,
        billingPeriod,
      },
    }),

    prisma.usageRecord.count({
      where: {
        customerId,
        billingPeriod,
        status: "SUCCESS",
      },
    }),

    prisma.usageRecord.aggregate({
      where: {
        customerId,
        billingPeriod,
        status: "SUCCESS",
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.apiKey.count({
      where: {
        customerId,
        status: "ACTIVE",
      },
    }),

    prisma.usageRecord.groupBy({
      by: ["operation"],
      where: {
        customerId,
        billingPeriod,
        status: "SUCCESS",
      },
      _count: {
        _all: true,
      },
      _sum: {
        totalAmount: true,
      },
    }),

    prisma.usageRecord.findMany({
      where: {
        customerId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
      select: {
        id: true,
        operation: true,
        totalAmount: true,
        status: true,
        responseCode: true,
        createdAt: true,
        apiKey: {
          select: {
            name: true,
          },
        },
      },
    }),

    prisma.usageRecord.findMany({
      where: {
        customerId,
        createdAt: {
          gte: thirtyDaysAgo,
          lte: now,
        },
      },
      select: {
        createdAt: true,
        status: true,
      },
    }),
  ]);

  const billAmount = Number(
    estimatedBill._sum.totalAmount ?? 0
  );

  // Prepare the last 30 days for the usage chart.
  const dailyUsage = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(thirtyDaysAgo);
    date.setUTCDate(date.getUTCDate() + index);

    return {
      date,
      key: date.toISOString().slice(0, 10),
      requests: 0,
    };
  });

  const dailyUsageMap = new Map(
    dailyUsage.map((day) => [day.key, day])
  );

  last30Days.forEach((record) => {
    const key = record.createdAt.toISOString().slice(0, 10);
    const day = dailyUsageMap.get(key);

    if (day) {
      day.requests += 1;
    }
  });

  const maxRequests = Math.max(
    ...dailyUsage.map((day) => day.requests),
    1
  );

  const total30DayRequests = last30Days.length;

  // Prepare operation breakdown.
  const operations = [
    {
      name: "Search",
      icon: Search,
      requests: 0,
      amount: 0,
    },
    {
      name: "Extract",
      icon: FileSearch,
      requests: 0,
      amount: 0,
    },
  ];

  operationBreakdown.forEach((operation) => {
    const name = formatOperation(operation.operation);

    const matchingOperation = operations.find(
      (item) => item.name.toLowerCase() === name.toLowerCase()
    );

    if (matchingOperation) {
      matchingOperation.requests = operation._count._all;
      matchingOperation.amount = Number(
        operation._sum.totalAmount ?? 0
      );
    }
  });

  const stats = [
    {
      label: "Estimated bill",
      value: formatMoney(billAmount),
      change: "Current billing period",
      icon: CreditCard,
    },
    {
      label: "Total API requests",
      value: totalRequests.toLocaleString("en-US"),
      change: "Current billing period",
      icon: Activity,
    },
    {
      label: "Successful requests",
      value: successfulRequests.toLocaleString("en-US"),
      change:
        totalRequests > 0
          ? `${((successfulRequests / totalRequests) * 100).toFixed(1)}% success rate`
          : "No activity yet",
      icon: Zap,
    },
    {
      label: "Active API keys",
      value: activeApiKeys.toLocaleString("en-US"),
      change: "Manage your keys",
      icon: KeyRound,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171923]">
            Overview
          </h1>
          <p className="mt-1 text-sm text-[#737987]">
            Monitor your API usage and billing activity.
          </p>
        </div>

        <div className="rounded-lg border border-[#e8eaf0] bg-white px-3 py-2 text-xs text-[#737987]">
          Current billing period
        </div>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.label}
              className="rounded-xl border border-[#e8eaf0] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#737987]">{stat.label}</p>
                <div className="rounded-lg bg-[#f3f5f8] p-2">
                  <Icon size={17} className="text-[#555f70]" />
                </div>
              </div>

              <h2 className="mt-5 text-2xl font-semibold tracking-tight">
                {stat.value}
              </h2>

              <p className="mt-2 text-xs text-[#9298a4]">
                {stat.change}
              </p>
            </div>
          );
        })}
      </div>

      {/* Usage chart and breakdown */}
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-xl border border-[#e8eaf0] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">API usage</h2>
              <p className="mt-1 text-xs text-[#9298a4]">
                Your request activity over the last 30 days
              </p>
            </div>

            <span className="rounded-lg border border-[#e8eaf0] px-3 py-2 text-xs text-[#737987]">
              Last 30 days
            </span>
          </div>

          {total30DayRequests > 0 ? (
            <div className="mt-8">
              <div className="flex h-[190px] items-end gap-1">
                {dailyUsage.map((day) => (
                  <div
                    key={day.key}
                    className="group relative flex h-full flex-1 items-end justify-center"
                    title={`${day.key}: ${day.requests} requests`}
                  >
                    <div
                      className="w-full max-w-[18px] rounded-t-sm bg-[#155EEF] transition hover:bg-[#7214ED]"
                      style={{
                        height:
                          day.requests > 0
                            ? `${Math.max(
                                (day.requests / maxRequests) * 100,
                                4
                              )}%`
                            : "2px",
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-between text-[10px] text-[#9298a4]">
                <span>
                  {thirtyDaysAgo.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
                <span>
                  {now.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </span>
              </div>

              <p className="mt-5 text-xs text-[#9298a4]">
                {total30DayRequests.toLocaleString("en-US")} total requests
                during this period
              </p>
            </div>
          ) : (
            <div className="flex h-[240px] flex-col items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3f5f8]">
                <Activity size={22} className="text-[#8c95a4]" />
              </div>
              <p className="mt-4 text-sm font-medium">
                No usage data yet
              </p>
              <p className="mt-1 text-center text-xs text-[#9298a4]">
                API activity will appear here once you start using Raavvi.
              </p>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-[#e8eaf0] bg-white p-5">
          <h2 className="font-semibold">Usage breakdown</h2>
          <p className="mt-1 text-xs text-[#9298a4]">
            Successful consumption by operation
          </p>

          <div className="mt-6 space-y-5">
            {operations.map((operation) => {
              const Icon = operation.icon;

              const percentage =
                successfulRequests > 0
                  ? (operation.requests / successfulRequests) * 100
                  : 0;

              return (
                <div key={operation.name}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon size={16} className="text-[#737987]" />
                      <span className="text-sm">{operation.name}</span>
                    </div>

                    <span className="text-xs text-[#737987]">
                      {formatMoney(operation.amount)}
                    </span>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#f0f1f4]">
                    <div
                      className="h-full rounded-full bg-[#155EEF]"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <p className="mt-2 text-[11px] text-[#9298a4]">
                    {operation.requests.toLocaleString("en-US")} requests
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <section className="overflow-hidden rounded-xl border border-[#e8eaf0] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8eaf0] p-5">
          <div>
            <h2 className="font-semibold">Recent API activity</h2>
            <p className="mt-1 text-xs text-[#9298a4]">
              Your latest requests and charges
            </p>
          </div>

          <Link
            href="/dashboard/history"
            className="text-xs font-medium text-[#465b92] hover:text-[#155EEF]"
          >
            View history →
          </Link>
        </div>

        {recentActivity.length > 0 ? (
          <div className="divide-y divide-[#e8eaf0]">
            {recentActivity.map((record) => (
              <div
                key={record.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f3f5f8]">
                    <Activity size={17} className="text-[#64728A]" />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#171923]">
                      {formatOperation(record.operation)}
                    </p>

                    <p className="mt-1 text-xs text-[#9298a4]">
                      {record.apiKey?.name || "API request"} ·{" "}
                      {record.createdAt.toLocaleString("en-US")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:justify-end">
                  <div className="flex items-center gap-1.5">
                    {record.status === "SUCCESS" ? (
                      <CheckCircle2
                        size={14}
                        className="text-emerald-600"
                      />
                    ) : (
                      <XCircle size={14} className="text-red-500" />
                    )}

                    <span
                      className={`text-xs ${
                        record.status === "SUCCESS"
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {record.status === "SUCCESS" ? "Success" : "Failed"}
                    </span>
                  </div>

                  <span className="min-w-[75px] text-right text-sm font-medium text-[#171923]">
                    {formatMoney(Number(record.totalAmount))}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-[150px] flex-col items-center justify-center">
            <Clock size={22} className="text-[#a1a7b2]" />
            <p className="mt-3 text-sm font-medium">No requests yet</p>
            <p className="mt-1 text-xs text-[#9298a4]">
              Your API requests will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
