
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";

type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  billingPeriod: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  balanceDue: string;
  status: InvoiceStatus;
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
  customer: {
    id: string;
    customerCode: string;
    name: string;
    email: string;
    billingEmail?: string | null;
    country?: string | null;
  };
  usageRecordCount: number;
};

type InvoiceResponse = {
  success: boolean;
  message?: string;
  invoices: Invoice[];
  customers: Customer[];
  summary: {
    invoiceCount: number;
    totalInvoiced: string;
    totalPaid: string;
    outstanding: string;
    statusCounts: Record<string, number>;
  };
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
};

const currentMonth = new Date().toISOString().slice(0, 7);

function formatMoney(amount: string | number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

function formatDate(date: string | null) {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const styles: Record<InvoiceStatus, string> = {
    DRAFT: "bg-slate-100 text-slate-700",
    ISSUED: "bg-blue-100 text-blue-700",
    PAID: "bg-emerald-100 text-emerald-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  const icons = {
    DRAFT: Clock,
    ISSUED: FileText,
    PAID: CheckCircle2,
    OVERDUE: AlertCircle,
    CANCELLED: XCircle,
  };

  const Icon = icons[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <Icon size={13} />
      {status}
    </span>
  );
}

export default function InvoicesPage() {
  const [data, setData] = useState<InvoiceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [billingPeriod, setBillingPeriod] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [page, setPage] = useState(1);

  const [generationPeriod, setGenerationPeriod] =
    useState(currentMonth);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "50",
      });

      if (search.trim()) params.set("search", search.trim());
      if (status) params.set("status", status);
      if (billingPeriod) params.set("billingPeriod", billingPeriod);
      if (customerId) params.set("customerId", customerId);

      const response = await fetch(
        `/api/admin/invoices?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load invoices.");
      }

      setData(result);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading invoices."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, billingPeriod, customerId]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  async function generateInvoices() {
    if (!generationPeriod) {
      setError("Please select a billing period.");
      return;
    }

    const confirmed = window.confirm(
      `Generate draft invoices for all customers with unbilled usage in ${generationPeriod}?`
    );

    if (!confirmed) return;

    setGenerating(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/invoices/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriod: generationPeriod,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Invoice generation failed.");
      }

      setNotice(
        `Generation completed: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped.`
      );

      setPage(1);
      await fetchInvoices();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Invoice generation failed."
      );
    } finally {
      setGenerating(false);
    }
  }

  function exportCSV() {
    if (!data?.invoices.length) return;

    const headers = [
      "Invoice Number",
      "Customer",
      "Customer Email",
      "Billing Period",
      "Currency",
      "Subtotal",
      "Tax",
      "Total",
      "Paid",
      "Balance Due",
      "Status",
      "Usage Records",
      "Created",
    ];

    const rows = data.invoices.map((invoice) => [
      invoice.invoiceNumber,
      invoice.customer.name,
      invoice.customer.email,
      invoice.billingPeriod,
      invoice.currency,
      invoice.subtotal,
      invoice.taxAmount,
      invoice.totalAmount,
      invoice.amountPaid,
      invoice.balanceDue,
      invoice.status,
      invoice.usageRecordCount,
      formatDate(invoice.createdAt),
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
    link.download = `raavvi-invoices-${currentMonth}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  function clearFilters() {
    setSearch("");
    setStatus("");
    setBillingPeriod("");
    setCustomerId("");
    setPage(1);
  }

  const summary = data?.summary;

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText size={16} />
            Billing
            <span>/</span>
            Invoices
          </div>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
            Invoice Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Generate, monitor and manage customer invoices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchInvoices}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>

          <button
            onClick={exportCSV}
            disabled={!data?.invoices.length}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <CheckCircle2 size={17} />
          {notice}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total invoices"
          value={String(summary?.invoiceCount ?? 0)}
          subtitle="All generated invoices"
          icon={<FileText size={20} />}
        />

        <SummaryCard
          title="Total invoiced"
          value={formatMoney(summary?.totalInvoiced ?? 0)}
          subtitle="Gross invoice value"
          icon={<FileText size={20} />}
        />

        <SummaryCard
          title="Total collected"
          value={formatMoney(summary?.totalPaid ?? 0)}
          subtitle="Payments recorded"
          icon={<CheckCircle2 size={20} />}
        />

        <SummaryCard
          title="Outstanding"
          value={formatMoney(summary?.outstanding ?? 0)}
          subtitle="Remaining invoice balances"
          icon={<Clock size={20} />}
        />
      </div>

      {/* Generate invoices */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-gray-900">
              Generate invoices
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Create draft invoices from successful, unbilled usage records.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="month"
              value={generationPeriod}
              onChange={(e) => setGenerationPeriod(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              onClick={generateInvoices}
              disabled={generating || loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {generating ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Plus size={17} />
              )}
              {generating ? "Generating..." : "Generate invoices"}
            </button>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">
            Invoice records
          </h2>

          <button
            onClick={clearFilters}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search invoice or customer..."
              className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="ISSUED">Issued</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <input
            type="month"
            value={billingPeriod}
            onChange={(e) => {
              setBillingPeriod(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
          />

          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500"
          >
            <option value="">All customers</option>
            {data?.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} ({customer.customerCode})
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* Invoice table */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              All invoices
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {data?.pagination.totalCount ?? 0} records found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 p-16 text-sm text-gray-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading invoices...
          </div>
        ) : !data?.invoices.length ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="mb-4 rounded-full bg-gray-100 p-4">
              <FileText size={28} className="text-gray-400" />
            </div>

            <h3 className="font-semibold text-gray-900">
              No invoices found
            </h3>

            <p className="mt-1 max-w-md text-sm text-gray-500">
              There are no invoices matching your filters. Generate
              invoices when customers have successful billable usage.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Invoice</th>
                    <th className="px-5 py-3 font-semibold">Customer</th>
                    <th className="px-5 py-3 font-semibold">Period</th>
                    <th className="px-5 py-3 font-semibold">Usage</th>
                    <th className="px-5 py-3 font-semibold">Total</th>
                    <th className="px-5 py-3 font-semibold">Paid</th>
                    <th className="px-5 py-3 font-semibold">Balance</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {data.invoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4">
                        <Link
                          href={`/admin/invoices/${invoice.id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="mt-1 text-xs text-gray-400">
                          {invoice.currency}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="font-medium text-gray-900">
                          {invoice.customer.name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {invoice.customer.customerCode}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {invoice.billingPeriod}
                      </td>

                      <td className="px-5 py-4 text-gray-700">
                        {invoice.usageRecordCount}
                      </td>

                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {formatMoney(invoice.totalAmount, invoice.currency)}
                      </td>

                      <td className="px-5 py-4 text-emerald-700">
                        {formatMoney(invoice.amountPaid, invoice.currency)}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {formatMoney(invoice.balanceDue, invoice.currency)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>

                      <td className="px-5 py-4 text-gray-500">
                        {formatDate(invoice.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col justify-between gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Page {data.pagination.page} of{" "}
                {Math.max(1, data.pagination.totalPages)}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(data.pagination.totalPages, p + 1)
                    )
                  }
                  disabled={page >= data.pagination.totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-gray-900">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
