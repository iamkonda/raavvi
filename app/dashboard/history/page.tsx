
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CalendarDays,
  Clock3,
  Copy,
  X,
} from "lucide-react";

type UsageRecord = {
  id: string;
  requestId: string;
  operation: string;
  endpoint: string | null;
  quantity: number;
  unitPrice: string;
  totalAmount: string;
  currency: string;
  status: "SUCCESS" | "FAILED";
  responseCode: number | null;
  processingMs: number | null;
  billingPeriod: string;
  createdAt: string;
  apiKey: {
    id: string;
    name: string;
    prefix: string;
  } | null;
};

type UsageSummary = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCharges: string;
  currency: string;
};

const EMPTY_SUMMARY: UsageSummary = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  totalCharges: "0",
  currency: "USD",
};

function formatCurrency(value: string | number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value));
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8EDF5] bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[#07132F]">
            {value}
          </h3>
          <p className="mt-1 text-xs text-gray-400">{description}</p>
        </div>

        <div className={`rounded-lg p-3 ${color}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [summary, setSummary] = useState<UsageSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [selectedRecord, setSelectedRecord] =
    useState<UsageRecord | null>(null);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search.trim()) {
        params.set("requestId", search.trim());
      }

      if (status) params.set("status", status);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await fetch(
        `/api/customer/usage-history?${params.toString()}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load usage history."
        );
      }

      setRecords(result.records ?? []);
      setSummary(result.summary ?? EMPTY_SUMMARY);
      setTotalPages(result.pagination?.totalPages ?? 1);
      setTotalRecords(result.pagination?.totalRecords ?? 0);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, from, to]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setFrom("");
    setTo("");
    setPage(1);
  }

  function copyRequestId(requestId: string) {
    navigator.clipboard.writeText(requestId);
  }

  const hasFilters = Boolean(search || status || from || to);

  return (
    <div className="space-y-7 pb-10">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="text-[#155EEF]" size={23} />
            <h1 className="text-2xl font-semibold tracking-tight text-[#07132F]">
              Usage History
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            View and track your API requests and usage charges.
          </p>
        </div>

        <button
          onClick={fetchUsage}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2.5 text-sm font-medium text-[#07132F] transition hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Requests"
          value={summary.totalRequests.toLocaleString()}
          description="Matching requests"
          icon={Activity}
          color="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Successful"
          value={summary.successfulRequests.toLocaleString()}
          description="Successfully completed"
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />

        <SummaryCard
          title="Failed"
          value={summary.failedRequests.toLocaleString()}
          description="Unsuccessful requests"
          icon={XCircle}
          color="bg-red-50 text-red-600"
        />

        <SummaryCard
          title="Total Charges"
          value={formatCurrency(summary.totalCharges)}
          description="Successful requests only"
          icon={DollarSign}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-[#E8EDF5] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold text-[#07132F]">
            Filter usage records
          </h2>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-sm font-medium text-[#155EEF] hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search request ID"
              className="w-full rounded-lg border border-[#E8EDF5] bg-white py-2.5 pl-10 pr-3 text-sm text-[#07132F] outline-none transition focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-lg border border-[#E8EDF5] bg-white px-3 py-2.5 text-sm text-[#07132F] outline-none focus:border-[#155EEF]"
          >
            <option value="">All statuses</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILED">Failed</option>
          </select>

          <div className="relative">
            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#E8EDF5] bg-white py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none focus:border-[#155EEF]"
              aria-label="From date"
            />
          </div>

          <div className="relative">
            <CalendarDays
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-lg border border-[#E8EDF5] bg-white py-2.5 pl-10 pr-3 text-sm text-gray-600 outline-none focus:border-[#155EEF]"
              aria-label="To date"
            />
          </div>
        </div>
      </div>

      {/* Usage table */}
      <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex flex-col justify-between gap-2 border-b border-[#E8EDF5] px-5 py-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#07132F]">
              API Requests
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {totalRecords.toLocaleString()} records found
            </p>
          </div>

          <span className="text-xs text-gray-400">
            Showing up to 20 records per page
          </span>
        </div>

        {error && (
          <div className="m-5 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-64 items-center justify-center">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <RefreshCw size={18} className="animate-spin" />
              Loading usage history...
            </div>
          </div>
        ) : records.length === 0 && !error ? (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-blue-50 p-4 text-[#155EEF]">
              <Activity size={25} />
            </div>

            <h3 className="mt-4 font-semibold text-[#07132F]">
              No usage records found
            </h3>

            <p className="mt-2 max-w-sm text-sm text-gray-500">
              Your API requests will appear here once you start
              using Raavvi Search.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead>
                  <tr className="border-b border-[#E8EDF5] bg-[#F7F9FD]">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Request
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Date & Time
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      API Key
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Response
                    </th>
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Processing
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Charge
                    </th>
                    <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Details
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E8EDF5]">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="transition hover:bg-[#F7F9FD]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-[#07132F]">
                          {record.operation}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                          <span className="max-w-[145px] truncate">
                            {record.requestId}
                          </span>
                          <button
                            onClick={() => copyRequestId(record.requestId)}
                            title="Copy request ID"
                            className="text-gray-400 hover:text-[#155EEF]"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(record.createdAt)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="text-sm font-medium text-[#07132F]">
                          {record.apiKey?.name ?? "Unknown key"}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {record.apiKey?.prefix ?? "—"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        {record.status === "SUCCESS" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                            <CheckCircle2 size={13} />
                            Success
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                            <XCircle size={13} />
                            Failed
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {record.responseCode ?? "—"}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <Clock3 size={13} className="text-gray-400" />
                          {record.processingMs !== null
                            ? `${record.processingMs} ms`
                            : "—"}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right text-sm font-semibold text-[#07132F]">
                        {record.status === "SUCCESS"
                          ? formatCurrency(record.totalAmount, record.currency)
                          : "—"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedRecord(record)}
                          className="text-sm font-medium text-[#155EEF] hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col justify-between gap-3 border-t border-[#E8EDF5] px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-gray-500">
                Page {page} of {Math.max(totalPages, 1)}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  disabled={page >= totalPages || loading}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Request details modal */}
      {selectedRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#07132F]/40 p-4"
          onClick={() => setSelectedRecord(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#07132F]">
                  Request Details
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Detailed information about this API request.
                </p>
              </div>

              <button
                onClick={() => setSelectedRecord(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ["Request ID", selectedRecord.requestId],
                ["Operation", selectedRecord.operation],
                ["Endpoint", selectedRecord.endpoint ?? "—"],
                ["API Key", selectedRecord.apiKey?.name ?? "Unknown"],
                ["Key Prefix", selectedRecord.apiKey?.prefix ?? "—"],
                ["Status", selectedRecord.status],
                ["Response Code", selectedRecord.responseCode ?? "—"],
                [
                  "Processing Time",
                  selectedRecord.processingMs !== null
                    ? `${selectedRecord.processingMs} ms`
                    : "—",
                ],
                ["Quantity", selectedRecord.quantity],
                [
                  "Unit Price",
                  formatCurrency(selectedRecord.unitPrice),
                ],
                [
                  "Total Charge",
                  formatCurrency(selectedRecord.totalAmount),
                ],
                ["Billing Period", selectedRecord.billingPeriod],
                ["Date", formatDate(selectedRecord.createdAt)],
              ].map(([label, value]) => (
                <div
                  key={String(label)}
                  className="flex items-start justify-between gap-4 border-b border-gray-100 pb-3 text-sm last:border-0"
                >
                  <span className="text-gray-500">{label}</span>
                  <span className="max-w-[65%] break-all text-right font-medium text-[#07132F]">
                    {String(value)}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setSelectedRecord(null)}
              className="mt-5 w-full rounded-lg bg-[#155EEF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
