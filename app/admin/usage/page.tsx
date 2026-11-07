
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Activity,
  DollarSign,
  CheckCircle2,
  XCircle,
  Download,
  CalendarDays,
  Globe,
  Clock3,
  RefreshCw,
  Zap,
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
  customer: {
    id: string;
    customerCode: string;
    name: string;
    email: string;
  };
  apiKey: {
    id: string;
    name: string;
    prefix: string;
    environment: "LIVE" | "TEST";
  } | null;
};

type UsageResponse = {
  success: boolean;
  error?: string;
  stats: {
    totalRecords: number;
    successfulRequests: number;
    failedRequests: number;
    totalCharges: string;
  };
  pagination: {
    page: number;
    pageSize: number;
    totalRecords: number;
    totalPages: number;
  };
  records: UsageRecord[];
};

const money = (amount: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(amount) || 0);

const formatDate = (date: string) =>
  new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function UsagePage() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<UsageResponse["stats"]>({
    totalRecords: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalCharges: "0",
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("All");
  const [operationFilter, setOperationFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [period, setPeriod] = useState("All");

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/usage?page=1&pageSize=100",
        { cache: "no-store" }
      );

      const data: UsageResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load usage records.");
      }

      setRecords(data.records);
      setStats(data.stats);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const customers = useMemo(() => {
    const unique = new Map<string, string>();

    records.forEach((record) => {
      unique.set(
        record.customer.customerCode,
        record.customer.name
      );
    });

    return Array.from(unique, ([id, name]) => ({ id, name }));
  }, [records]);

  const operations = useMemo(
    () => Array.from(new Set(records.map((record) => record.operation))),
    [records]
  );

  const filteredRecords = useMemo(() => {
    const term = search.toLowerCase();

    return records.filter((record) => {
      const matchesSearch =
        !term ||
        record.requestId.toLowerCase().includes(term) ||
        record.customer.name.toLowerCase().includes(term) ||
        record.customer.customerCode.toLowerCase().includes(term) ||
        record.customer.email.toLowerCase().includes(term) ||
        record.operation.toLowerCase().includes(term);

      const matchesCustomer =
        customerFilter === "All" ||
        record.customer.customerCode === customerFilter;

      const matchesOperation =
        operationFilter === "All" ||
        record.operation === operationFilter;

      const matchesStatus =
        statusFilter === "All" ||
        record.status === statusFilter;

      const recordDate = new Date(record.createdAt);
      const today = new Date();

      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const matchesPeriod =
        period === "All" ||
        (period === "Today" &&
          recordDate.toDateString() === today.toDateString()) ||
        (period === "Yesterday" &&
          recordDate.toDateString() === yesterday.toDateString());

      return (
        matchesSearch &&
        matchesCustomer &&
        matchesOperation &&
        matchesStatus &&
        matchesPeriod
      );
    });
  }, [
    records,
    search,
    customerFilter,
    operationFilter,
    statusFilter,
    period,
  ]);

  const successfulRecords = filteredRecords.filter(
    (record) => record.status === "SUCCESS"
  );

  const failedRecords = filteredRecords.filter(
    (record) => record.status === "FAILED"
  );

  const totalRequests = filteredRecords.reduce(
    (sum, record) => sum + record.quantity,
    0
  );

  const successfulRequests = successfulRecords.reduce(
    (sum, record) => sum + record.quantity,
    0
  );

  const failedRequests = failedRecords.reduce(
    (sum, record) => sum + record.quantity,
    0
  );

  const totalCharges = successfulRecords.reduce(
    (sum, record) => sum + Number(record.totalAmount),
    0
  );

  const successRate =
    totalRequests > 0
      ? ((successfulRequests / totalRequests) * 100).toFixed(1)
      : "0.0";

  const operationSummary = operations.map((operation) => {
    const matching = successfulRecords.filter(
      (record) => record.operation === operation
    );

    return {
      operation,
      requests: matching.reduce(
        (sum, record) => sum + record.quantity,
        0
      ),
      charges: matching.reduce(
        (sum, record) => sum + Number(record.totalAmount),
        0
      ),
    };
  });

  const maxOperationRequests = Math.max(
    ...operationSummary.map((item) => item.requests),
    1
  );

  function clearFilters() {
    setSearch("");
    setCustomerFilter("All");
    setOperationFilter("All");
    setStatusFilter("All");
    setPeriod("All");
  }

  function exportUsage() {
    const rows = [
      [
        "Request ID",
        "Customer",
        "Customer Code",
        "Email",
        "API Key",
        "Environment",
        "Operation",
        "Quantity",
        "Unit Price",
        "Total Charge",
        "Currency",
        "Status",
        "Response Code",
        "Processing Time (ms)",
        "Billing Period",
        "Timestamp",
      ],
      ...filteredRecords.map((record) => [
        record.requestId,
        record.customer.name,
        record.customer.customerCode,
        record.customer.email,
        record.apiKey?.name || "",
        record.apiKey?.environment || "",
        record.operation,
        String(record.quantity),
        record.unitPrice,
        record.totalAmount,
        record.currency,
        record.status,
        String(record.responseCode ?? ""),
        String(record.processingMs ?? ""),
        record.billingPeriod,
        record.createdAt,
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "raavvi-usage-report.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#71809a]">
            <span>Administration</span>
            <span>/</span>
            <span className="font-medium text-[#155eef]">Usage</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
            Usage Management
          </h1>

          <p className="mt-1 text-sm text-[#71809a]">
            Monitor API consumption, customer activity and usage charges.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchUsage}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#e3e9f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#34425b] hover:bg-[#f8faff] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={exportUsage}
            disabled={filteredRecords.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#155eef] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#104dcc] disabled:opacity-50"
          >
            <Download size={17} />
            Export report
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
          <button
            onClick={fetchUsage}
            className="ml-3 font-semibold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Data information */}
      <div className="flex items-start gap-3 rounded-xl border border-[#dce8ff] bg-[#f2f6ff] p-4">
        <Activity size={19} className="mt-0.5 shrink-0 text-[#155eef]" />
        <div>
          <p className="text-sm font-semibold text-[#155eef]">
            Live database usage
          </p>
          <p className="mt-1 text-xs leading-5 text-[#64728a]">
            Usage records and charges are retrieved from your Raavvi
            PostgreSQL database. The transaction list displays the latest
            100 records.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="API Requests"
          value={loading ? "..." : totalRequests.toLocaleString("en-US")}
          subtitle="In the displayed records"
          icon={<Activity size={19} />}
        />

        <MetricCard
          title="Total Charges"
          value={loading ? "..." : money(totalCharges)}
          subtitle="Successful billable usage"
          icon={<DollarSign size={19} />}
        />

        <MetricCard
          title="Successful Requests"
          value={loading ? "..." : successfulRequests.toLocaleString("en-US")}
          subtitle={`${successRate}% success rate`}
          icon={<CheckCircle2 size={19} />}
        />

        <MetricCard
          title="Failed Requests"
          value={loading ? "..." : failedRequests.toLocaleString("en-US")}
          subtitle="Not charged"
          icon={<XCircle size={19} />}
        />
      </div>

      {/* Overall database statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#e8edf5] bg-white p-4">
          <p className="text-xs text-[#8290a6]">All database records</p>
          <p className="mt-2 text-xl font-bold text-[#07132f]">
            {loading ? "..." : stats.totalRecords.toLocaleString("en-US")}
          </p>
        </div>

        <div className="rounded-xl border border-[#e8edf5] bg-white p-4">
          <p className="text-xs text-[#8290a6]">All successful records</p>
          <p className="mt-2 text-xl font-bold text-[#16834a]">
            {loading ? "..." : stats.successfulRequests.toLocaleString("en-US")}
          </p>
        </div>

        <div className="rounded-xl border border-[#e8edf5] bg-white p-4">
          <p className="text-xs text-[#8290a6]">All recorded charges</p>
          <p className="mt-2 text-xl font-bold text-[#07132f]">
            {loading ? "..." : money(stats.totalCharges)}
          </p>
        </div>
      </div>

      {/* Operation breakdown */}
      <section className="rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-[#07132f]">
              Usage by operation
            </h2>
            <p className="mt-1 text-xs text-[#8290a6]">
              Successful requests and charges by service.
            </p>
          </div>

          <span className="text-xs text-[#8290a6]">
            Based on current filters
          </span>
        </div>

        <div className="mt-7 space-y-6">
          {operationSummary.length === 0 ? (
            <p className="text-sm text-[#8290a6]">
              No operation data available.
            </p>
          ) : (
            operationSummary.map((item) => (
              <div key={item.operation}>
                <div className="mb-2 flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[#edf3ff] p-2 text-[#155eef]">
                      {item.operation === "search" ? (
                        <Globe size={16} />
                      ) : item.operation.toLowerCase().includes("research") ? (
                        <Zap size={16} />
                      ) : (
                        <Activity size={16} />
                      )}
                    </div>

                    <span className="text-sm font-semibold text-[#34425b]">
                      {item.operation}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-[#71809a]">
                      {item.requests.toLocaleString("en-US")} requests
                    </span>
                    <span className="font-semibold text-[#07132f]">
                      {money(item.charges)}
                    </span>
                  </div>
                </div>

                <div className="h-2.5 overflow-hidden rounded-full bg-[#eef2f8]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#155eef] to-[#7214ed] transition-all"
                    style={{
                      width: `${(item.requests / maxOperationRequests) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Transactions */}
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-sm">
        <div className="border-b border-[#e8edf5] p-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-[#07132f]">
                Usage transactions
              </h2>
              <p className="mt-1 text-xs text-[#8290a6]">
                Actual usage records across customers.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs text-[#8290a6]">
              <Clock3 size={15} />
              Latest {records.length} records
            </div>
          </div>

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290a6]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customer, email or request ID..."
                className="w-full rounded-xl border border-[#e8edf5] bg-[#fbfcfe] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#155eef]"
              />
            </div>

            <select
              value={customerFilter}
              onChange={(event) => setCustomerFilter(event.target.value)}
              className="rounded-xl border border-[#e8edf5] bg-[#fbfcfe] px-3 py-2.5 text-sm text-[#34425b] outline-none focus:border-[#155eef]"
            >
              <option value="All">All customers</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <select
              value={operationFilter}
              onChange={(event) => setOperationFilter(event.target.value)}
              className="rounded-xl border border-[#e8edf5] bg-[#fbfcfe] px-3 py-2.5 text-sm text-[#34425b] outline-none focus:border-[#155eef]"
            >
              <option value="All">All operations</option>
              {operations.map((operation) => (
                <option key={operation} value={operation}>
                  {operation}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-[#e8edf5] bg-[#fbfcfe] px-3 py-2.5 text-sm text-[#34425b] outline-none focus:border-[#155eef]"
            >
              <option value="All">All statuses</option>
              <option value="SUCCESS">Successful</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Date filters */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs text-[#8290a6]">
              <CalendarDays size={15} />
              Period:
            </div>

            {["All", "Today", "Yesterday"].map((item) => (
              <button
                key={item}
                onClick={() => setPeriod(item)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  period === item
                    ? "bg-[#edf3ff] text-[#155eef]"
                    : "bg-[#f7f9fd] text-[#71809a] hover:bg-[#eef2f8]"
                }`}
              >
                {item === "All" ? "All dates" : item}
              </button>
            ))}

            <button
              onClick={clearFilters}
              className="ml-auto text-xs font-semibold text-[#155eef] hover:underline"
            >
              Clear filters
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] text-left">
            <thead className="bg-[#f8faff]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#8290a6]">
                <th className="px-5 py-4">Request ID</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">API key</th>
                <th className="px-5 py-4">Operation</th>
                <th className="px-5 py-4">Quantity</th>
                <th className="px-5 py-4">Unit price</th>
                <th className="px-5 py-4">Total charge</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Processing</th>
                <th className="px-5 py-4">Timestamp</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eef1f6]">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center text-sm text-[#8290a6]"
                  >
                    Loading usage records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-16 text-center text-sm text-[#8290a6]"
                  >
                    No usage records match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr
                    key={record.id}
                    className="transition hover:bg-[#fbfcff]"
                  >
                    <td className="px-5 py-4">
                      <code
                        className="text-xs font-medium text-[#155eef]"
                        title={record.requestId}
                      >
                        {record.requestId.slice(0, 13)}...
                      </code>
                    </td>

                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-[#07132f]">
                        {record.customer.name}
                      </p>
                      <p className="mt-1 text-xs text-[#8290a6]">
                        {record.customer.customerCode}
                      </p>
                      <p className="mt-1 text-xs text-[#8290a6]">
                        {record.customer.email}
                      </p>
                    </td>

                    <td className="px-5 py-4">
                      {record.apiKey ? (
                        <>
                          <p className="text-sm font-medium text-[#34425b]">
                            {record.apiKey.name}
                          </p>
                          <p className="mt-1 text-xs text-[#8290a6]">
                            {record.apiKey.prefix}
                          </p>
                          <EnvironmentBadge
                            environment={record.apiKey.environment}
                          />
                        </>
                      ) : (
                        <span className="text-xs text-[#8290a6]">
                          Not available
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#34425b]">
                      {record.operation}
                    </td>

                    <td className="px-5 py-4 text-sm font-medium tabular-nums text-[#34425b]">
                      {record.quantity.toLocaleString("en-US")}
                    </td>

                    <td className="px-5 py-4 text-sm text-[#64728a]">
                      {money(record.unitPrice)}
                    </td>

                    <td className="px-5 py-4 text-sm font-semibold text-[#07132f]">
                      {money(record.totalAmount)}
                    </td>

                    <td className="px-5 py-4">
                      <StatusBadge status={record.status} />
                    </td>

                    <td className="px-5 py-4 text-xs text-[#64728a]">
                      {record.processingMs !== null
                        ? `${record.processingMs} ms`
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-xs text-[#8290a6]">
                      {formatDate(record.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col justify-between gap-2 border-t border-[#e8edf5] px-5 py-4 text-xs text-[#8290a6] sm:flex-row sm:items-center">
          <span>
            Showing {filteredRecords.length} of {records.length} loaded records
            {stats.totalRecords > records.length
              ? ` (${stats.totalRecords} total in database)`
              : ""}
          </span>

          <span>
            Charges in current view: {money(totalCharges)}
          </span>
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
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-[#71809a]">{title}</p>
        <div className="rounded-xl bg-[#edf3ff] p-2.5 text-[#155eef]">
          {icon}
        </div>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-[#07132f]">
        {value}
      </p>

      <p className="mt-1 text-xs text-[#8290a6]">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const successful = status === "SUCCESS";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        successful
          ? "bg-[#eaf8f0] text-[#16834a]"
          : "bg-[#fff1f0] text-[#d04438]"
      }`}
    >
      {successful ? (
        <CheckCircle2 size={13} />
      ) : (
        <XCircle size={13} />
      )}
      {successful ? "Successful" : "Failed"}
    </span>
  );
}

function EnvironmentBadge({
  environment,
}: {
  environment: string;
}) {
  return (
    <span
      className={`mt-1 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        environment === "LIVE"
          ? "bg-[#eaf8f0] text-[#16834a]"
          : "bg-[#fff7e8] text-[#a66a0a]"
      }`}
    >
      {environment}
    </span>
  );
}
