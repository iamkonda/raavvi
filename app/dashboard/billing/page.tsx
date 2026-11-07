
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Receipt,
  DollarSign,
  Wallet,
  FileText,
  RefreshCw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
  CreditCard,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

type Payment = {
  id: string;
  amount: string;
  currency: string;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
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
  outstandingAmount: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  usageRecordCount: number;
  payments: Payment[];
};

type BillingSummary = {
  totalInvoiced: string;
  totalPaid: string;
  outstandingBalance: string;
  invoiceCount: number;
  unpaidInvoiceCount: number;
  currency: string;
};

const EMPTY_SUMMARY: BillingSummary = {
  totalInvoiced: "0",
  totalPaid: "0",
  outstandingBalance: "0",
  invoiceCount: 0,
  unpaidInvoiceCount: 0,
  currency: "USD",
};

function formatCurrency(value: string | number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatBillingPeriod(period: string) {
  const [year, month] = period.split("-").map(Number);

  if (!year || !month || month < 1 || month > 12) {
    return period;
  }

  return new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const styles: Record<Invoice["status"], string> = {
    DRAFT: "bg-gray-100 text-gray-600",
    ISSUED: "bg-blue-50 text-blue-700",
    PAID: "bg-green-50 text-green-700",
    OVERDUE: "bg-red-50 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${styles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
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
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [summary, setSummary] =
    useState<BillingSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedInvoice, setSelectedInvoice] =
    useState<Invoice | null>(null);

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const fetchBilling = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/billing", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to load billing information."
        );
      }

      setInvoices(result.invoices ?? []);
      setSummary(result.summary ?? EMPTY_SUMMARY);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesStatus =
      statusFilter === "ALL" || invoice.status === statusFilter;

    const matchesSearch =
      invoice.invoiceNumber
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      invoice.billingPeriod
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const pageSize = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredInvoices.length / pageSize)
  );

  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  return (
    <div className="space-y-7 pb-10">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="text-[#155EEF]" size={23} />
            <h1 className="text-2xl font-semibold tracking-tight text-[#07132F]">
              Billing
            </h1>
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Manage your invoices, payments and billing information.
          </p>
        </div>

        <button
          onClick={fetchBilling}
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

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Invoiced"
          value={formatCurrency(
            summary.totalInvoiced,
            summary.currency
          )}
          description={`${summary.invoiceCount} invoices`}
          icon={FileText}
          color="bg-blue-50 text-blue-600"
        />

        <SummaryCard
          title="Total Paid"
          value={formatCurrency(summary.totalPaid, summary.currency)}
          description="Payments received"
          icon={CheckCircle2}
          color="bg-green-50 text-green-600"
        />

        <SummaryCard
          title="Outstanding Balance"
          value={formatCurrency(
            summary.outstandingBalance,
            summary.currency
          )}
          description={`${summary.unpaidInvoiceCount} unpaid invoices`}
          icon={Wallet}
          color="bg-orange-50 text-orange-600"
        />

        <SummaryCard
          title="Total Invoices"
          value={summary.invoiceCount.toLocaleString()}
          description="All invoice records"
          icon={Receipt}
          color="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Invoice list */}
      <div className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E8EDF5] px-5 py-4 lg:flex-row lg:items-center">
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Invoices
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Your billing statements and payment records.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice..."
              className="rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm outline-none focus:border-[#155EEF]"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-[#E8EDF5] bg-white px-3 py-2 text-sm text-gray-600 outline-none focus:border-[#155EEF]"
            >
              <option value="ALL">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-gray-500">
            <RefreshCw size={18} className="animate-spin" />
            Loading billing information...
          </div>
        ) : paginatedInvoices.length === 0 && !error ? (
          <div className="flex min-h-72 flex-col items-center justify-center px-5 text-center">
            <div className="rounded-full bg-blue-50 p-4 text-[#155EEF]">
              <Receipt size={26} />
            </div>

            <h3 className="mt-4 font-semibold text-[#07132F]">
              No invoices found
            </h3>

            <p className="mt-2 max-w-sm text-sm text-gray-500">
              {invoices.length === 0
                ? "Your invoices will appear here once they have been issued."
                : "Try changing your search or status filter."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <tr className="border-b border-[#E8EDF5] bg-[#F7F9FD]">
                    {[
                      "Invoice",
                      "Billing Period",
                      "Issue Date",
                      "Due Date",
                      "Amount",
                      "Paid",
                      "Status",
                      "Details",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E8EDF5]">
                  {paginatedInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="transition hover:bg-[#F7F9FD]"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-[#07132F]">
                          {invoice.invoiceNumber}
                        </div>
                        <div className="mt-1 text-xs text-gray-400">
                          {invoice.usageRecordCount} usage records
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatBillingPeriod(invoice.billingPeriod)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(invoice.issueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatDate(invoice.dueDate)}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-[#07132F]">
                        {formatCurrency(
                          invoice.totalAmount,
                          invoice.currency
                        )}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {formatCurrency(
                          invoice.amountPaid,
                          invoice.currency
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={invoice.status} />
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedInvoice(invoice)}
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#155EEF] hover:underline"
                        >
                          <Eye size={15} />
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
                Showing {filteredInvoices.length === 0 ? 0 : (page - 1) * pageSize + 1}
                {"–"}
                {Math.min(page * pageSize, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} invoices
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPage((current) => Math.max(1, current - 1))
                  }
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="px-2 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages, current + 1)
                    )
                  }
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E8EDF5] px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Recent payments */}
      <div className="rounded-xl border border-[#E8EDF5] bg-white">
        <div className="border-b border-[#E8EDF5] px-5 py-4">
          <h2 className="font-semibold text-[#07132F]">
            Recent Payments
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Payments recorded against your invoices.
          </p>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Loading payments...
          </div>
        ) : invoices.flatMap((invoice) => invoice.payments).length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard
              size={25}
              className="mx-auto text-gray-300"
            />
            <p className="mt-3 text-sm font-medium text-[#07132F]">
              No payments recorded
            </p>
            <p className="mt-1 text-xs text-gray-400">
              Your recorded payments will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E8EDF5]">
            {invoices
              .flatMap((invoice) =>
                invoice.payments.map((payment) => ({
                  ...payment,
                  invoiceNumber: invoice.invoiceNumber,
                }))
              )
              .sort(
                (a, b) =>
                  new Date(b.receivedAt).getTime() -
                  new Date(a.receivedAt).getTime()
              )
              .slice(0, 5)
              .map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col justify-between gap-3 px-5 py-4 sm:flex-row sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
                      <CheckCircle2 size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-[#07132F]">
                        {payment.invoiceNumber}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {formatDate(payment.receivedAt)}
                        {payment.reference
                          ? ` · ${payment.reference}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-green-700">
                    +{formatCurrency(payment.amount, payment.currency)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Invoice details modal */}
      {selectedInvoice && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07132F]/40 p-4"
          onClick={() => setSelectedInvoice(null)}
        >
          <div
            className="my-8 w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt size={20} className="text-[#155EEF]" />
                  <h2 className="text-lg font-semibold text-[#07132F]">
                    Invoice Details
                  </h2>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedInvoice.invoiceNumber}
                </p>
              </div>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
              >
                <X size={19} />
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-lg bg-[#F7F9FD] p-4">
              <div>
                <p className="text-xs text-gray-500">Invoice status</p>
                <div className="mt-2">
                  <StatusBadge status={selectedInvoice.status} />
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500">Total amount</p>
                <p className="mt-1 text-xl font-semibold text-[#07132F]">
                  {formatCurrency(
                    selectedInvoice.totalAmount,
                    selectedInvoice.currency
                  )}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">Billing period</p>
                <p className="mt-1 text-sm font-medium text-[#07132F]">
                  {formatBillingPeriod(selectedInvoice.billingPeriod)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Issue date</p>
                <p className="mt-1 text-sm font-medium text-[#07132F]">
                  {formatDate(selectedInvoice.issueDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Due date</p>
                <p className="mt-1 text-sm font-medium text-[#07132F]">
                  {formatDate(selectedInvoice.dueDate)}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-400">Paid date</p>
                <p className="mt-1 text-sm font-medium text-[#07132F]">
                  {formatDate(selectedInvoice.paidAt)}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-[#E8EDF5] p-4">
              <h3 className="mb-4 text-sm font-semibold text-[#07132F]">
                Invoice breakdown
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium text-[#07132F]">
                    {formatCurrency(
                      selectedInvoice.subtotal,
                      selectedInvoice.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Tax</span>
                  <span className="font-medium text-[#07132F]">
                    {formatCurrency(
                      selectedInvoice.taxAmount,
                      selectedInvoice.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#E8EDF5] pt-3">
                  <span className="font-semibold text-[#07132F]">
                    Total
                  </span>
                  <span className="font-semibold text-[#07132F]">
                    {formatCurrency(
                      selectedInvoice.totalAmount,
                      selectedInvoice.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-500">Amount paid</span>
                  <span className="font-medium text-green-700">
                    {formatCurrency(
                      selectedInvoice.amountPaid,
                      selectedInvoice.currency
                    )}
                  </span>
                </div>

                <div className="flex justify-between border-t border-[#E8EDF5] pt-3">
                  <span className="font-semibold text-[#07132F]">
                    Outstanding
                  </span>
                  <span className="font-semibold text-orange-600">
                    {formatCurrency(
                      selectedInvoice.outstandingAmount,
                      selectedInvoice.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-sm">
              <span className="text-gray-500">Usage records included</span>
              <span className="font-medium text-[#07132F]">
                {selectedInvoice.usageRecordCount}
              </span>
            </div>

            {selectedInvoice.notes && (
              <div className="mt-4 rounded-lg bg-[#F7F9FD] p-3">
                <p className="text-xs font-medium text-gray-500">
                  Invoice notes
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#07132F]">
                  {selectedInvoice.notes}
                </p>
              </div>
            )}

            {/* Payments */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-[#07132F]">
                Payment records
              </h3>

              {selectedInvoice.payments.length === 0 ? (
                <p className="rounded-lg bg-[#F7F9FD] p-4 text-center text-sm text-gray-500">
                  No payments recorded for this invoice.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedInvoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-lg border border-[#E8EDF5] p-3"
                    >
                      <div className="flex justify-between gap-3">
                        <span className="text-sm font-medium text-[#07132F]">
                          {formatCurrency(
                            payment.amount,
                            payment.currency
                          )}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(payment.receivedAt)}
                        </span>
                      </div>

                      {payment.reference && (
                        <p className="mt-2 text-xs text-gray-500">
                          Reference: {payment.reference}
                        </p>
                      )}

                      {payment.notes && (
                        <p className="mt-1 text-xs text-gray-500">
                          {payment.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedInvoice(null)}
              className="mt-6 w-full rounded-lg bg-[#155EEF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
