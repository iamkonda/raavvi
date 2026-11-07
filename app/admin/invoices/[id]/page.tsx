
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  User,
  CalendarDays,
  Receipt,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
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
  status: string;
  responseCode: number | null;
  processingMs: number | null;
  pricingRuleId: string | null;
  pricingVersion: number | null;
  createdAt: string;
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
  status: "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";
  issueDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    customerCode: string;
    name: string;
    email: string;
    billingEmail: string | null;
    contactName: string | null;
    phone: string | null;
    country: string | null;
  };
  usageRecords: UsageRecord[];
  usageRecordCount: number;
};

function money(value: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function date(value: string | null) {
  if (!value) return "Not set";

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: Invoice["status"] }) {
  const styles = {
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
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${styles[status]}`}
    >
      <Icon size={14} />
      {status}
    </span>
  );
}

type Payment = {
  id: string;
  amount: string;
  currency: string;
  reference: string | null;
  notes: string | null;
  receivedAt: string;
};

export default function InvoiceDetailsPage() {
  const params = useParams();
  const id = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [notice, setNotice] = useState("");

  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [recordingPayment, setRecordingPayment] = useState(false);

  async function loadInvoice() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load invoice.");
      }

      setInvoice(result.invoice);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPayments() {
    const response = await fetch(
      `/api/admin/invoices/${id}/payments`,
      { cache: "no-store" }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load payments.");
    }

    setPayments(result.payments);
  }

  async function recordPayment() {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    if (
      !window.confirm(
        `Record a payment of ${money(paymentAmount, invoice!.currency)}?`
      )
    ) {
      return;
    }

    setRecordingPayment(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/invoices/${id}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: paymentAmount,
            reference: paymentReference,
            notes: paymentNotes,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to record payment.");
      }

      setNotice("Payment recorded successfully.");
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNotes("");

      await Promise.all([loadInvoice(), loadPayments()]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Payment recording failed."
      );
    } finally {
      setRecordingPayment(false);
    }
  }

  useEffect(() => {
    if (id) {
      loadInvoice();
      loadPayments();
    }
  }, [id]);

  async function issueInvoice() {
  if (!dueDate) {
    setError("Please select a payment due date.");
    return;
  }

  if (
    !window.confirm(
      `Issue invoice ${invoice?.invoiceNumber} with payment due date ${dueDate}?`
    )
  ) {
    return;
  }

  setIssuing(true);
  setError("");
  setNotice("");

  try {
    const response = await fetch(`/api/admin/invoices/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dueDate }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to issue invoice.");
    }

    setNotice("Invoice issued successfully.");
    await loadInvoice();
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Invoice issuing failed."
    );
  } finally {
    setIssuing(false);
  }
}

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-gray-500">
        <RefreshCw size={20} className="animate-spin" />
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8">
        <Link
          href="/admin/invoices"
          className="mb-6 inline-flex items-center gap-2 text-sm text-blue-600"
        >
          <ArrowLeft size={16} />
          Back to invoices
        </Link>

        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          {error || "Invoice not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <Link
          href="/admin/invoices"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft size={16} />
          Back to invoices
        </Link>

        <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Invoice details
              </h1>
              <StatusBadge status={invoice.status} />
            </div>

            <p className="mt-2 text-sm text-gray-500">
              {invoice.invoiceNumber}
            </p>
          </div>

          <button
            onClick={loadInvoice}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {invoice.status === "DRAFT" && (
        <section className="rounded-xl border border-blue-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            Issue this invoice
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Set the payment due date before officially issuing this invoice.
          </p>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment due date
              </label>

              <input
                type="date"
                value={dueDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={issueInvoice}
              disabled={issuing || !dueDate}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {issuing ? "Issuing..." : "Issue Invoice"}
            </button>
          </div>
        </section>
      )}

      {/* Invoice summary */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Invoice total"
          value={money(invoice.totalAmount, invoice.currency)}
        />

        <SummaryCard
          label="Amount paid"
          value={money(invoice.amountPaid, invoice.currency)}
        />

        <SummaryCard
          label="Outstanding balance"
          value={money(invoice.balanceDue, invoice.currency)}
        />

        <SummaryCard
          label="Usage records"
          value={String(invoice.usageRecordCount)}
        />
      </div>

      {/* Invoice and customer information */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Receipt size={19} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              Invoice information
            </h2>
          </div>

          <InfoRow label="Invoice number" value={invoice.invoiceNumber} />
          <InfoRow label="Billing period" value={invoice.billingPeriod} />
          <InfoRow label="Currency" value={invoice.currency} />
          <InfoRow label="Created date" value={date(invoice.createdAt)} />
          <InfoRow label="Issue date" value={date(invoice.issueDate)} />
          <InfoRow label="Due date" value={date(invoice.dueDate)} />
          <InfoRow label="Paid date" value={date(invoice.paidAt)} />
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <User size={19} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">
              Customer information
            </h2>
          </div>

          <InfoRow label="Customer name" value={invoice.customer.name} />
          <InfoRow label="Customer code" value={invoice.customer.customerCode} />
          <InfoRow label="Contact person" value={invoice.customer.contactName || "—"} />
          <InfoRow label="Email" value={invoice.customer.email} />
          <InfoRow label="Billing email" value={invoice.customer.billingEmail || "—"} />
          <InfoRow label="Country" value={invoice.customer.country || "—"} />
          <InfoRow label="Phone" value={invoice.customer.phone || "—"} />
        </section>
      </div>

      {/* Usage records */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Billed usage records
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Individual API requests included in this invoice.
          </p>
        </div>

        {invoice.usageRecords.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No usage records linked to this invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Operation</th>
                  <th className="px-5 py-3">Request ID</th>
                  <th className="px-5 py-3">Quantity</th>
                  <th className="px-5 py-3">Unit price</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Response</th>
                  <th className="px-5 py-3">Processing</th>
                  <th className="px-5 py-3">Date</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {invoice.usageRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">
                        {record.operation}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {record.endpoint || "—"}
                      </p>
                    </td>

                    <td className="px-5 py-4 font-mono text-xs text-gray-600">
                      {record.requestId.slice(0, 18)}...
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {record.quantity}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {money(record.unitPrice, record.currency)}
                    </td>

                    <td className="px-5 py-4 font-semibold text-gray-900">
                      {money(record.totalAmount, record.currency)}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {record.responseCode ?? "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {record.processingMs !== null
                        ? `${record.processingMs} ms`
                        : "—"}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {date(record.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* Record payment */}
      {["ISSUED", "OVERDUE"].includes(invoice.status) && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            Record payment
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Record a customer payment against this invoice.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Payment amount ({invoice.currency})
              </label>
              <input
                type="number"
                min="0.00000001"
                max={invoice.balanceDue}
                step="0.00000001"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Outstanding: {money(invoice.balanceDue, invoice.currency)}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Transaction reference
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Bank transfer reference / transaction ID"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Notes (optional)
              </label>
              <textarea
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                rows={2}
                placeholder="Additional payment information..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={recordPayment}
              disabled={
                recordingPayment ||
                !paymentAmount ||
                Number(paymentAmount) <= 0 ||
                Number(paymentAmount) > Number(invoice.balanceDue)
              }
              className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {recordingPayment ? "Recording..." : "Record payment"}
            </button>
          </div>
        </section>
      )}

      {/* Payment history */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Payment history
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            All payments recorded against this invoice.
          </p>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No payments recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Amount</th>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Notes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-5 py-4 text-gray-600">
                      {date(payment.receivedAt)}
                    </td>
                    <td className="px-5 py-4 font-semibold text-emerald-700">
                      {money(payment.amount, payment.currency)}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {payment.reference || "—"}
                    </td>
                    <td className="px-5 py-4 text-gray-600">
                      {payment.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>


      {/* Financial breakdown */}
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-5 font-semibold text-gray-900">
          Financial breakdown
        </h2>

        <div className="ml-auto max-w-md space-y-4">
          <MoneyRow
            label="Subtotal"
            value={money(invoice.subtotal, invoice.currency)}
          />

          <MoneyRow
            label="Tax"
            value={money(invoice.taxAmount, invoice.currency)}
          />

          <div className="border-t border-gray-200 pt-4">
            <MoneyRow
              label="Invoice total"
              value={money(invoice.totalAmount, invoice.currency)}
              strong
            />
          </div>

          <MoneyRow
            label="Amount paid"
            value={money(invoice.amountPaid, invoice.currency)}
          />

          <div className="rounded-lg bg-gray-50 p-4">
            <MoneyRow
              label="Outstanding balance"
              value={money(invoice.balanceDue, invoice.currency)}
              strong
            />
          </div>
        </div>
      </section>

      {/* Notes */}
      {invoice.notes && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-2 font-semibold text-gray-900">Invoice notes</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-600">
            {invoice.notes}
          </p>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-3 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col justify-between gap-1 border-b border-gray-100 py-3 last:border-0 sm:flex-row sm:items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="break-all text-sm font-medium text-gray-900 sm:text-right">
        {value}
      </span>
    </div>
  );
}

function MoneyRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={`text-sm ${strong ? "font-semibold text-gray-900" : "text-gray-500"}`}>
        {label}
      </span>

      <span className={`${strong ? "text-lg font-bold text-gray-900" : "text-sm font-medium text-gray-700"}`}>
        {value}
      </span>
    </div>
  );
}
