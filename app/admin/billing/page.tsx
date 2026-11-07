
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownToLine,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  FileText,
  Search,
  SlidersHorizontal,
  TrendingUp,
  Wallet,
  RefreshCw,
} from "lucide-react";

type InvoiceStatus =
  | "PAID"
  | "ISSUED"
  | "OVERDUE"
  | "DRAFT"
  | "CANCELLED";

type BillingRecord = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerCode: string;
  customer: string;
  email: string;
  period: string;
  requests: number;
  amount: number;
  paid: number;
  outstanding: number;
  dueDate: string | null;
  status: InvoiceStatus;
  currency: string;
};

type BillingSummary = {
  totalRequests: number;
  billableUsageAmount: number;
  totalBilled: number;
  totalPaid: number;
  outstanding: number;
  overdue: number;
  invoiceCount: number;
  statusCounts: Record<InvoiceStatus, number>;
  unbilledRequests: number;
  unbilledAmount: number;
  unbilledRecordCount: number;
};

type BillingResponse = {
  period: string;
  periods: string[];
  summary: BillingSummary;
  records: BillingRecord[];
};

const emptySummary: BillingSummary = {
  totalRequests: 0,
  billableUsageAmount: 0,
  totalBilled: 0,
  totalPaid: 0,
  outstanding: 0,
  overdue: 0,
  invoiceCount: 0,
  statusCounts: {
    PAID: 0,
    ISSUED: 0,
    OVERDUE: 0,
    DRAFT: 0,
    CANCELLED: 0,
  },
  unbilledRequests: 0,
  unbilledAmount: 0,
  unbilledRecordCount: 0,
};

const money = (value: number, currency = "USD") =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);

const formatPeriod = (period: string) => {
  if (!/^\d{4}-\d{2}$/.test(period)) return period;

  const [year, month] = period.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const formatDate = (date: string | null) => {
  if (!date) return "Not set";

  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const statusLabels: Record<InvoiceStatus, string> = {
  PAID: "Paid",
  ISSUED: "Pending",
  OVERDUE: "Overdue",
  DRAFT: "Draft",
  CANCELLED: "Cancelled",
};

const statusStyles: Record<InvoiceStatus, string> = {
  PAID: "bg-emerald-50 text-emerald-700",
  ISSUED: "bg-blue-50 text-blue-700",
  OVERDUE: "bg-red-50 text-red-700",
  DRAFT: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-slate-100 text-slate-500",
};

export default function BillingPage() {
  const [data, setData] = useState<BillingResponse | null>(null);
  const [period, setPeriod] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBilling() {
      try {
        setLoading(true);
        setError("");

        const query = period
          ? `?period=${encodeURIComponent(period)}`
          : "";

        const response = await fetch(`/api/admin/billing${query}`, {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "Unable to load billing information."
          );
        }

        if (cancelled) return;

        setData(result);

        if (!period && result.period) {
          setPeriod(result.period);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong while loading billing."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadBilling();

    return () => {
      cancelled = true;
    };
  }, [period]);

  const summary = data?.summary ?? emptySummary;
  const records = data?.records ?? [];

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.customer.toLowerCase().includes(normalizedSearch) ||
        record.customerCode.toLowerCase().includes(normalizedSearch) ||
        record.invoiceNumber.toLowerCase().includes(normalizedSearch) ||
        record.email.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "All statuses" ||
        statusLabels[record.status] === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  const selectedCurrency =
    records.find((record) => record.currency)?.currency ?? "USD";

  const exportCsv = () => {
    const headers = [
      "Invoice Number",
      "Customer Code",
      "Customer",
      "Email",
      "Billing Period",
      "Usage Records",
      "Amount",
      "Paid",
      "Outstanding",
      "Due Date",
      "Status",
      "Currency",
    ];

    const rows = filteredRecords.map((record) => [
      record.invoiceNumber,
      record.customerCode,
      record.customer,
      record.email,
      record.period,
      record.requests,
      record.amount,
      record.paid,
      record.outstanding,
      record.dueDate ? formatDate(record.dueDate) : "",
      statusLabels[record.status],
      record.currency,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `raavvi-billing-${period || "all-periods"}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const collectionPercentage =
    summary.totalBilled > 0
      ? Math.min(
          (summary.totalPaid / summary.totalBilled) * 100,
          100
        )
      : 0;

  return (
    <div className="space-y-7 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-[#8290a6]">
            <span>Administration</span>
            <span>/</span>
            <span className="text-[#155eef]">Billing</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
            Billing Management
          </h1>

          <p className="mt-1 text-sm text-[#71809a]">
            Monitor actual customer usage, invoices and outstanding balances.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPeriod((current) => current)}
            disabled={loading}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e8edf5] bg-white px-4 text-sm font-semibold text-[#34415b] shadow-sm transition hover:bg-[#f7f9fd] disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={exportCsv}
            disabled={filteredRecords.length === 0}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-[#e8edf5] bg-white px-4 text-sm font-semibold text-[#34415b] shadow-sm transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDownToLine size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Data notice */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="mt-0.5 rounded-lg bg-white p-2 text-[#155eef]">
          <FileText size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#173b77]">
            Live billing data
          </p>
          <p className="mt-1 text-xs leading-5 text-[#58709a]">
            Figures are retrieved from Raavvi&apos;s PostgreSQL database.
            Payments represent amounts manually recorded in Raavvi after
            verification with your payment provider.
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e8edf5] bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[#eef4ff] p-2.5 text-[#155eef]">
            <CalendarDays size={19} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#07132f]">
              Billing period
            </p>
            <p className="text-xs text-[#8290a6]">
              View customer billing for a selected month
            </p>
          </div>
        </div>

        <div className="relative">
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
            disabled={!data || data.periods.length === 0}
            className="h-10 min-w-48 appearance-none rounded-xl border border-[#e8edf5] bg-[#fbfcff] pl-3 pr-9 text-sm font-semibold text-[#34415b] outline-none focus:border-[#155eef] disabled:opacity-50"
          >
            {data?.periods.map((item) => (
              <option key={item} value={item}>
                {formatPeriod(item)}
              </option>
            ))}

            {data && data.periods.length === 0 && (
              <option value={period}>No billing periods yet</option>
            )}
          </select>

          <ChevronDown
            size={15}
            className="pointer-events-none absolute right-3 top-3 text-[#8290a6]"
          />
        </div>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total billable usage"
          value={summary.totalRequests.toLocaleString("en-US")}
          subtitle="Successful billable requests this period"
          icon={<TrendingUp size={19} />}
          iconClass="bg-blue-50 text-blue-600"
          loading={loading}
        />

        <MetricCard
          title="Total billed"
          value={money(summary.totalBilled, selectedCurrency)}
          subtitle="Total invoice value"
          icon={<CircleDollarSign size={19} />}
          iconClass="bg-violet-50 text-violet-600"
          loading={loading}
        />

        <MetricCard
          title="Outstanding balance"
          value={money(summary.outstanding, selectedCurrency)}
          subtitle={`${summary.statusCounts.ISSUED + summary.statusCounts.OVERDUE} unpaid invoices`}
          icon={<Wallet size={19} />}
          iconClass="bg-amber-50 text-amber-600"
          loading={loading}
        />

        <MetricCard
          title="Overdue balance"
          value={money(summary.overdue, selectedCurrency)}
          subtitle={`${summary.statusCounts.OVERDUE} overdue invoices`}
          icon={<Clock3 size={19} />}
          iconClass="bg-red-50 text-red-600"
          loading={loading}
        />
      </div>

      {/* Collection overview */}
      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#07132f]">
                Billing summary
              </h2>
              <p className="mt-1 text-xs text-[#8290a6]">
                Recorded payment collection for {formatPeriod(period)}
              </p>
            </div>

            <span className="rounded-lg bg-[#f3f6fc] px-3 py-1.5 text-xs font-semibold text-[#64728a]">
              {formatPeriod(period)}
            </span>
          </div>

          <div className="mt-7">
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="text-[#71809a]">Payments recorded</span>
              <span className="font-bold text-[#07132f]">
                {money(summary.totalPaid, selectedCurrency)} /{" "}
                {money(summary.totalBilled, selectedCurrency)}
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-[#edf1f7]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#155eef] to-[#7214ed] transition-all"
                style={{ width: `${collectionPercentage}%` }}
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-5 text-xs">
              <span className="flex items-center gap-2 text-[#71809a]">
                <span className="h-2 w-2 rounded-full bg-[#155eef]" />
                Recorded: {money(summary.totalPaid, selectedCurrency)}
              </span>

              <span className="flex items-center gap-2 text-[#71809a]">
                <span className="h-2 w-2 rounded-full bg-[#edf1f7]" />
                Outstanding: {money(summary.outstanding, selectedCurrency)}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-[#07132f]">
            Invoice status
          </h2>
          <p className="mt-1 text-xs text-[#8290a6]">
            Breakdown by invoice count
          </p>

          <div className="mt-5 space-y-4">
            {(
              ["PAID", "ISSUED", "OVERDUE", "DRAFT", "CANCELLED"] as InvoiceStatus[]
            ).map((status) => {
              const count = summary.statusCounts[status];

              const dotClass =
                status === "PAID"
                  ? "bg-emerald-500"
                  : status === "ISSUED"
                    ? "bg-blue-500"
                    : status === "OVERDUE"
                      ? "bg-red-500"
                      : "bg-slate-400";

              return (
                <div
                  key={status}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    <span className="text-sm text-[#64728a]">
                      {statusLabels[status]}
                    </span>
                  </div>

                  <span className="text-sm font-bold text-[#07132f]">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Customer invoices */}
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 border-b border-[#e8edf5] p-5 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-base font-bold text-[#07132f]">
              Customer billing
            </h2>
            <p className="mt-1 text-xs text-[#8290a6]">
              Actual customer invoices and recorded payment balances
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-3 text-[#9aa6b8]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer or invoice..."
                className="h-10 w-full rounded-xl border border-[#e8edf5] bg-[#fbfcff] pl-9 pr-3 text-sm outline-none transition focus:border-[#155eef] sm:w-64"
              />
            </div>

            <div className="relative">
              <SlidersHorizontal
                size={15}
                className="pointer-events-none absolute left-3 top-3 text-[#8290a6]"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-[#e8edf5] bg-[#fbfcff] pl-9 pr-8 text-sm text-[#34415b] outline-none focus:border-[#155eef] sm:w-40"
              >
                <option>All statuses</option>
                <option>Paid</option>
                <option>Pending</option>
                <option>Overdue</option>
                <option>Draft</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead>
              <tr className="border-b border-[#e8edf5] bg-[#fbfcff] text-[11px] font-semibold uppercase tracking-wider text-[#8290a6]">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Invoice</th>
                <th className="px-5 py-4">Usage records</th>
                <th className="px-5 py-4">Amount</th>
                <th className="px-5 py-4">Outstanding</th>
                <th className="px-5 py-4">Due date</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#edf1f6]">
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-[#8290a6]"
                  >
                    Loading billing records...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-[#fbfcff]"
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#07132f]">
                        {record.customer}
                      </p>
                      <p className="mt-1 text-xs text-[#8290a6]">
                        {record.customerCode}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      <span className="text-sm font-medium text-[#34415b]">
                        {record.invoiceNumber}
                      </span>
                      <p className="mt-1 text-xs text-[#8290a6]">
                        {formatPeriod(record.period)}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[#34415b]">
                      {record.requests.toLocaleString("en-US")}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#07132f]">
                      {money(record.amount, record.currency)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#34415b]">
                      {money(record.outstanding, record.currency)}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#64728a]">
                      {formatDate(record.dueDate)}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyles[record.status]}`}
                      >
                        {statusLabels[record.status]}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <Link
                        href={`/admin/invoices/${record.id}`}
                        className="text-xs font-semibold text-[#155eef] hover:underline"
                      >
                        View details
                      </Link>
                    </td>
                  </tr>
                ))}

              {!loading && filteredRecords.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-14 text-center text-sm text-[#8290a6]"
                  >
                    {records.length === 0
                      ? "No invoices have been generated for this billing period."
                      : "No billing records match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-[#e8edf5] px-5 py-4 text-xs text-[#8290a6] sm:flex-row">
          <span>
            Showing {filteredRecords.length} of {records.length} invoices
          </span>
          <span>Amounts displayed in the invoice currency</span>
        </div>
      </section>

      {/* Unbilled usage */}
      <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
            <CircleDollarSign size={19} />
          </div>

          <div>
            <h2 className="text-base font-bold text-[#07132f]">
              Unbilled usage
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#8290a6]">
              Successful billable usage that has not yet been included in an
              invoice for this period.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-[#f8faff] p-4">
            <p className="text-xs text-[#8290a6]">Unbilled requests</p>
            <p className="mt-2 text-xl font-bold text-[#07132f]">
              {summary.unbilledRequests.toLocaleString("en-US")}
            </p>
          </div>

          <div className="rounded-xl bg-[#f8faff] p-4">
            <p className="text-xs text-[#8290a6]">Unbilled amount</p>
            <p className="mt-2 text-xl font-bold text-[#07132f]">
              {money(summary.unbilledAmount, selectedCurrency)}
            </p>
          </div>

          <div className="rounded-xl bg-[#f8faff] p-4">
            <p className="text-xs text-[#8290a6]">Unbilled usage records</p>
            <p className="mt-2 text-xl font-bold text-[#07132f]">
              {summary.unbilledRecordCount}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[#71809a]">{title}</p>
          <p className="mt-3 text-2xl font-bold tracking-tight text-[#07132f]">
            {loading ? "—" : value}
          </p>
        </div>

        <div className={`rounded-xl p-2.5 ${iconClass}`}>{icon}</div>
      </div>

      <p className="mt-3 text-xs text-[#8290a6]">{subtitle}</p>
    </div>
  );
}
