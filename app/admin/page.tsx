
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Activity,
  DollarSign,
  Receipt,
  Search,
  UserPlus,
  KeyRound,
  Clock3,
  CircleCheck,
  AlertCircle,
  TrendingUp,
  RefreshCw,
  FileText,
} from "lucide-react";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  requests: number;
  amount: number;
  status: string;
  createdAt: string;
};

type UsageDay = {
  date: string;
  requests: number;
  successful: number;
  failed: number;
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  amount: number;
  status: string;
  time: string;
};

type OverviewData = {
  period: string;
  generatedAt: string;
  stats: {
    totalCustomers: number;
    activeCustomers: number;
    totalRequests: number;
    successfulRequests: number;
    revenue: number;
    outstanding: number;
    overdue: number;
    unpaidInvoiceCount: number;
  };
  usageChart: UsageDay[];
  customers: Customer[];
  activity: ActivityItem[];
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);

const formatPeriod = (period: string) => {
  const [year, month] = period.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const avatarColors = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
];

function activityIcon(type: string, status: string) {
  if (type === "PAYMENT") {
    return {
      Icon: CircleCheck,
      color: "text-emerald-600 bg-emerald-50",
    };
  }

  if (type === "INVOICE") {
    return {
      Icon: FileText,
      color: "text-violet-600 bg-violet-50",
    };
  }

  if (status === "FAILED") {
    return {
      Icon: AlertCircle,
      color: "text-orange-600 bg-orange-50",
    };
  }

  return {
    Icon: Activity,
    color: "text-blue-600 bg-blue-50",
  };
}

export default function AdminOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [chartPeriod, setChartPeriod] = useState("30");

  async function loadOverview() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/admin/overview", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Unable to load platform overview."
        );
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!data) return [];

    return data.customers.filter(
      (customer) =>
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.customerCode.toLowerCase().includes(term)
    );
  }, [data, search]);

  const chartData = useMemo(() => {
    if (!data) return [];

    return data.usageChart.slice(-Number(chartPeriod));
  }, [data, chartPeriod]);

  const maxRequests = Math.max(
    1,
    ...chartData.map((day) => day.requests)
  );

  const stats = data
    ? [
        {
          label: "Total Customers",
          value: data.stats.totalCustomers.toLocaleString("en-US"),
          change: `${data.stats.activeCustomers} active customers`,
          icon: Users,
        },
        {
          label: "Total API Requests",
          value: data.stats.totalRequests.toLocaleString("en-US"),
          change: "Requests recorded this month",
          icon: Activity,
        },
        {
          label: "Billable Usage Revenue",
          value: money(data.stats.revenue),
          change: "Successful billable usage this month",
          icon: DollarSign,
        },
        {
          label: "Outstanding Bills",
          value: money(data.stats.outstanding),
          change: `${data.stats.unpaidInvoiceCount} unpaid invoices`,
          icon: Receipt,
        },
      ]
    : [];

  return (
    <div className="space-y-7 pb-10">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-[#07132F]">
              Platform Overview
            </h1>

            <span className="rounded-md bg-[#EDF3FF] px-2 py-1 text-[10px] font-semibold text-[#155EEF]">
              ADMIN
            </span>
          </div>

          <p className="mt-1 text-sm text-[#8290A6]">
            Monitor customers, API activity and platform revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <div className="rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-xs text-[#64728A]">
              {formatPeriod(data.period)}
            </div>
          )}

          <button
            onClick={loadOverview}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-3 py-2.5 text-xs font-medium text-[#64728A] transition hover:bg-[#FAFBFD] disabled:opacity-50"
          >
            <RefreshCw
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <Link
            href="/admin/customers"
            className="rounded-lg bg-gradient-to-r from-[#155EEF] to-[#7214ED] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
          >
            + Customers
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <span>{error}</span>
          <button
            onClick={loadOverview}
            className="font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.length > 0
          ? stats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-xl border border-[#E8EDF5] bg-white p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-[#8290A6]">
                      {stat.label}
                    </p>

                    <div className="rounded-lg bg-[#F1F5FC] p-2.5">
                      <Icon size={18} className="text-[#155EEF]" />
                    </div>
                  </div>

                  <h2 className="mt-5 text-2xl font-semibold tracking-tight text-[#07132F]">
                    {loading ? "—" : stat.value}
                  </h2>

                  <p className="mt-2 text-xs text-[#8290A6]">
                    {stat.change}
                  </p>
                </div>
              );
            })
          : Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-36 animate-pulse rounded-xl border border-[#E8EDF5] bg-white"
              />
            ))}
      </div>

      {/* Charts and revenue */}
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <section className="rounded-xl border border-[#E8EDF5] bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-[#07132F]">
                Platform Usage
              </h2>

              <p className="mt-1 text-xs text-[#8290A6]">
                Actual API request volume across all customers
              </p>
            </div>

            <select
              value={chartPeriod}
              onChange={(event) => setChartPeriod(event.target.value)}
              className="rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-xs text-[#64728A] outline-none"
            >
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
            </select>
          </div>

          <div className="mt-7 flex h-[225px] items-end gap-1.5 border-b border-[#E8EDF5] px-1 sm:gap-2">
            {!loading &&
              chartData.map((day) => {
                const height = (day.requests / maxRequests) * 100;

                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.requests} requests (${day.successful} successful, ${day.failed} failed)`}
                    className="group relative flex h-full flex-1 items-end"
                  >
                    <div
                      style={{
                        height: `${Math.max(height, day.requests ? 3 : 0)}%`,
                      }}
                      className={`w-full rounded-t-sm transition ${
                        day.failed > 0
                          ? "bg-gradient-to-t from-orange-500 to-orange-300"
                          : "bg-gradient-to-t from-[#155EEF] to-[#8B5CF6]"
                      } opacity-80 group-hover:opacity-100`}
                    />
                  </div>
                );
              })}

            {loading &&
              Array.from({ length: Number(chartPeriod) }).map((_, index) => (
                <div
                  key={index}
                  className="h-full flex-1 animate-pulse rounded-t-sm bg-[#F1F5FC]"
                />
              ))}
          </div>

          <div className="mt-3 flex justify-between text-[10px] text-[#9AA5B8]">
            {chartData.length > 0 && (
              <>
                <span>{formatDate(chartData[0].date)}</span>
                {chartData.length > 2 && (
                  <span>
                    {formatDate(
                      chartData[Math.floor(chartData.length / 2)].date
                    )}
                  </span>
                )}
                <span>{formatDate(chartData[chartData.length - 1].date)}</span>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-5 text-xs text-[#8290A6]">
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#155EEF]" />
              Successful requests
            </span>

            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              Failed requests
            </span>
          </div>
        </section>

        {/* Revenue overview */}
        <section className="rounded-xl border border-[#E8EDF5] bg-white p-5">
          <h2 className="font-semibold text-[#07132F]">
            Revenue Overview
          </h2>

          <p className="mt-1 text-xs text-[#8290A6]">
            Current billing period
          </p>

          <div className="mt-7">
            <p className="text-xs text-[#8290A6]">
              Successful billable usage
            </p>

            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-[#07132F]">
              {loading ? "—" : money(data?.stats.revenue ?? 0)}
            </h3>

            <p className="mt-2 flex items-center gap-1 text-xs text-[#8290A6]">
              <TrendingUp size={14} />
              Actual usage charges
            </p>
          </div>

          <div className="mt-7 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-[#64728A]">
                  Outstanding invoices
                </span>

                <span className="font-medium text-[#07132F]">
                  {loading
                    ? "—"
                    : money(data?.stats.outstanding ?? 0)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#F0F3F8]">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all"
                  style={{
                    width: `${
                      data && data.stats.revenue > 0
                        ? Math.min(
                            (data.stats.outstanding / data.stats.revenue) *
                              100,
                            100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-[#64728A]">
                  Overdue invoices
                </span>

                <span className="font-medium text-[#07132F]">
                  {loading
                    ? "—"
                    : money(data?.stats.overdue ?? 0)}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-[#F0F3F8]">
                <div
                  className="h-full rounded-full bg-red-500 transition-all"
                  style={{
                    width: `${
                      data && data.stats.revenue > 0
                        ? Math.min(
                            (data.stats.overdue / data.stats.revenue) * 100,
                            100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <Link
            href="/admin/billing"
            className="mt-6 inline-block text-xs font-semibold text-[#155EEF] hover:text-[#7214ED]"
          >
            View billing details →
          </Link>
        </section>
      </div>

      {/* Customer table */}
      <section className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E8EDF5] p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Recent Customers
            </h2>

            <p className="mt-1 text-xs text-[#8290A6]">
              Latest customer accounts and current-period usage
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border border-[#E8EDF5] px-3 py-2">
              <Search size={14} className="text-[#9AA5B8]" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers"
                className="w-full text-xs outline-none sm:w-36"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead className="bg-[#FAFBFD]">
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-[#9AA5B8]">
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">API Requests</th>
                <th className="px-5 py-3">Current Usage Bill</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E8EDF5]">
              {!loading &&
                filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className="transition hover:bg-[#FAFBFD]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                            avatarColors[index % avatarColors.length]
                          }`}
                        >
                          {initials(customer.name)}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-[#07132F]">
                            {customer.name}
                          </p>

                          <p className="mt-0.5 text-xs text-[#9AA5B8]">
                            {customer.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#475569]">
                      {customer.requests.toLocaleString("en-US")}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium text-[#07132F]">
                      {money(customer.amount)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                          customer.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : customer.status === "SUSPENDED"
                              ? "bg-red-50 text-red-600"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {customer.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/customers/${customer.id}`}
                        className="text-xs font-medium text-[#155EEF] hover:text-[#7214ED]"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && filteredCustomers.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#8290A6]"
                  >
                    {search
                      ? "No customers match your search."
                      : "No customers found."}
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-[#8290A6]"
                  >
                    Loading customers...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-[#E8EDF5] px-5 py-4">
          <p className="text-xs text-[#9AA5B8]">
            Showing {filteredCustomers.length} of{" "}
            {data?.customers.length ?? 0} recent customers
          </p>

          <Link
            href="/admin/customers"
            className="text-xs font-semibold text-[#155EEF]"
          >
            View all customers →
          </Link>
        </div>
      </section>

      {/* Recent activity */}
      <section className="rounded-xl border border-[#E8EDF5] bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Recent Platform Activity
            </h2>

            <p className="mt-1 text-xs text-[#8290A6]">
              Latest recorded usage, invoice and payment events
            </p>
          </div>

          <Clock3 size={18} className="text-[#9AA5B8]" />
        </div>

        <div className="mt-6 space-y-5">
          {loading && (
            <p className="text-sm text-[#8290A6]">
              Loading recent activity...
            </p>
          )}

          {!loading &&
            data?.activity.map((item) => {
              const { Icon, color } = activityIcon(
                item.type,
                item.status
              );

              return (
                <div key={item.id} className="flex items-start gap-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${color}`}
                  >
                    <Icon size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#07132F]">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs text-[#8290A6]">
                      {item.description}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    {item.amount > 0 && (
                      <p className="text-xs font-semibold text-[#34415B]">
                        {money(item.amount)}
                      </p>
                    )}

                    <span className="mt-1 block whitespace-nowrap text-[10px] text-[#9AA5B8]">
                      {item.time}
                    </span>
                  </div>
                </div>
              );
            })}

          {!loading && data?.activity.length === 0 && (
            <p className="text-sm text-[#8290A6]">
              No platform activity recorded yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
