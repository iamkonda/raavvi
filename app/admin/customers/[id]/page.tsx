
"use client";

import { useEffect, useState } from "react";
import type { ReactNode, FormEvent } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Building2,
  Mail,
  Globe,
  User,
  CalendarDays,
  Activity,
  CreditCard,
  KeyRound,
  Clock3,
  ExternalLink,
  Ban,
  CheckCircle2,
  Pencil,
  X,
  Save,
} from "lucide-react";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  contactName: string | null;
  phone: string | null;
  country: string | null;
  billingEmail: string | null;
  notes: string | null;
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
  _count: {
    apiKeys: number;
    usageRecords: number;
    invoices: number;
  };
};

type CustomerForm = {
  name: string;
  email: string;
  contactName: string;
  phone: string;
  country: string;
  billingEmail: string;
  notes: string;
};

const emptyForm: CustomerForm = {
  name: "",
  email: "",
  contactName: "",
  phone: "",
  country: "",
  billingEmail: "",
  notes: "",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [saveError, setSaveError] = useState("");

  async function loadCustomer() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}`,
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load customer.");
      }

      setCustomer(data.customer);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load customer details."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (customerId) loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  function openEditForm() {
    if (!customer) return;

    setForm({
      name: customer.name,
      email: customer.email,
      contactName: customer.contactName || "",
      phone: customer.phone || "",
      country: customer.country || "",
      billingEmail: customer.billingEmail || "",
      notes: customer.notes || "",
    });

    setSaveMessage("");
    setSaveError("");
    setEditOpen(true);
  }

  function updateField(field: keyof CustomerForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!customer) return;

    try {
      setSaving(true);
      setSaveError("");
      setSaveMessage("");

      const response = await fetch(
        `/api/admin/customers/${encodeURIComponent(customerId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            contactName: form.contactName.trim() || null,
            phone: form.phone.trim() || null,
            country: form.country.trim() || null,
            billingEmail: form.billingEmail.trim() || null,
            notes: form.notes.trim() || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to save customer.");
      }

      setCustomer(data.customer);
      setEditOpen(false);
      setSaveMessage("Customer details updated successfully.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unable to save customer."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-20 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#e8edf5] border-t-[#155eef]" />
        <p className="mt-4 text-sm text-[#71809a]">
          Loading customer details...
        </p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-5">
        <Link
          href="/admin/customers"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#155eef]"
        >
          <ArrowLeft size={16} />
          Back to customers
        </Link>

        <div className="rounded-2xl border border-[#e8edf5] bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-bold text-[#07132f]">
            {error === "Customer not found."
              ? "Customer not found"
              : "Unable to load customer"}
          </h2>
          <p className="mt-2 text-sm text-[#71809a]">
            {error || "The requested customer could not be found."}
          </p>
        </div>
      </div>
    );
  }

  const statusLabel =
    customer.status.charAt(0) +
    customer.status.slice(1).toLowerCase();

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-2 text-sm text-[#71809a]">
        <Link href="/admin/customers" className="hover:text-[#155eef]">
          Customers
        </Link>
        <span>/</span>
        <span className="font-medium text-[#155eef]">
          {customer.customerCode}
        </span>
      </div>

      {saveMessage && (
        <div className="rounded-xl border border-[#bde8ce] bg-[#effaf3] px-4 py-3 text-sm text-[#16834a]">
          {saveMessage}
        </div>
      )}

      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#edf3ff] text-[#155eef]">
            <Building2 size={26} />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
                {customer.name}
              </h1>
              <StatusBadge status={statusLabel} />
            </div>

            <p className="mt-1 text-sm text-[#71809a]">
              {customer.customerCode} · Customer account
            </p>

            <p className="mt-2 text-xs text-[#8290a6]">
              Customer since {formatDate(customer.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={openEditForm}
            className="inline-flex items-center gap-2 rounded-xl bg-[#155eef] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#104dcc]"
          >
            <Pencil size={15} />
            Edit Customer
          </button>

          <Link
            href="/admin/customers"
            className="rounded-xl border border-[#e3e9f2] bg-white px-4 py-2.5 text-sm font-semibold text-[#34425b] hover:bg-[#f8faff]"
          >
            Back to customers
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total API Requests"
          value={customer._count.usageRecords.toLocaleString("en-US")}
          subtitle="Recorded usage events"
          icon={<Activity size={19} />}
        />

        <MetricCard
          title="Estimated Bill"
          value={money(0)}
          subtitle="Usage billing not yet calculated"
          icon={<CreditCard size={19} />}
        />

        <MetricCard
          title="API Keys"
          value={customer._count.apiKeys.toString()}
          subtitle="Associated API keys"
          icon={<KeyRound size={19} />}
        />

        <MetricCard
          title="Invoices"
          value={customer._count.invoices.toString()}
          subtitle="Generated invoices"
          icon={<Clock3 size={19} />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm xl:col-span-1">
          <h2 className="font-semibold text-[#07132f]">
            Customer information
          </h2>

          <div className="mt-6 space-y-5">
            <InfoItem
              icon={<Building2 size={17} />}
              label="Company name"
              value={customer.name}
            />
            <InfoItem
              icon={<Mail size={17} />}
              label="Customer email"
              value={customer.email}
            />
            <InfoItem
              icon={<User size={17} />}
              label="Contact person"
              value={customer.contactName || "Not provided"}
            />
            <InfoItem
              icon={<Globe size={17} />}
              label="Country"
              value={customer.country || "Not provided"}
            />
            <InfoItem
              icon={<Mail size={17} />}
              label="Billing email"
              value={customer.billingEmail || "Not provided"}
            />
            <InfoItem
              icon={<CalendarDays size={17} />}
              label="Registration date"
              value={formatDate(customer.createdAt)}
            />
            <InfoItem
              icon={<User size={17} />}
              label="Phone"
              value={customer.phone || "Not provided"}
            />
          </div>

          <div className="mt-7 border-t border-[#eef1f6] pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8290a6]">
              Internal notes
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#64728a]">
              {customer.notes || "No internal notes have been added."}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-[#07132f]">
                Usage overview
              </h2>
              <p className="mt-1 text-xs text-[#8290a6]">
                Usage records currently stored for this customer.
              </p>
            </div>

            <Link
              href="/admin/usage"
              className="text-sm font-semibold text-[#155eef] hover:underline"
            >
              View all usage
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-[#f7f9fd] p-4">
              <p className="text-xs text-[#8290a6]">
                Recorded usage events
              </p>
              <p className="mt-2 text-2xl font-bold text-[#07132f]">
                {customer._count.usageRecords.toLocaleString("en-US")}
              </p>
            </div>

            <div className="rounded-xl bg-[#f7f9fd] p-4">
              <p className="text-xs text-[#8290a6]">Estimated charges</p>
              <p className="mt-2 text-2xl font-bold text-[#07132f]">
                {money(0)}
              </p>
            </div>
          </div>

          <div className="mt-7 rounded-xl border border-dashed border-[#dce3ef] bg-[#fbfcfe] px-5 py-10 text-center">
            <Activity className="mx-auto text-[#8290a6]" size={25} />
            <h3 className="mt-3 text-sm font-semibold text-[#34425b]">
              Usage activity will appear here
            </h3>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-[#8290a6]">
              Actual request-level usage history will be displayed after the
              usage metering module is connected.
            </p>
          </div>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[#edf3ff] p-2.5 text-[#155eef]">
                <KeyRound size={19} />
              </div>
              <div>
                <h2 className="font-semibold text-[#07132f]">API keys</h2>
                <p className="mt-1 text-xs text-[#8290a6]">
                  {customer._count.apiKeys} key(s) associated with this account
                </p>
              </div>
            </div>

            <Link
              href="/admin/api-keys"
              className="text-sm font-semibold text-[#155eef] hover:underline"
            >
              Manage
            </Link>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-[#dce3ef] bg-[#fbfcfe] px-5 py-8 text-center">
            <KeyRound className="mx-auto text-[#8290a6]" size={24} />
            <p className="mt-3 text-sm font-semibold text-[#34425b]">
              API key details
            </p>
            <p className="mt-1 text-xs text-[#8290a6]">
              Manage this customer's keys from the API keys section.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#f2ecff] p-2.5 text-[#7214ed]">
              <CreditCard size={19} />
            </div>
            <div>
              <h2 className="font-semibold text-[#07132f]">
                Billing overview
              </h2>
              <p className="mt-1 text-xs text-[#8290a6]">
                Usage-based billing summary
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xs text-[#8290a6]">
              Estimated current charges
            </p>
            <p className="mt-2 text-3xl font-bold text-[#07132f]">
              {money(0)}
            </p>
            <p className="mt-2 text-xs text-[#8290a6]">
              Billing totals will be calculated when usage metering and
              billing aggregation are connected.
            </p>
          </div>

          <div className="mt-5 flex items-center justify-between border-t border-[#eef1f6] pt-4">
            <span className="text-sm text-[#64728a]">Billing email</span>
            <span className="max-w-[60%] truncate text-sm font-medium text-[#34425b]">
              {customer.billingEmail || "Not provided"}
            </span>
          </div>

          <Link
            href="/admin/billing"
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#155eef] hover:underline"
          >
            Open billing management
            <ExternalLink size={14} />
          </Link>
        </section>
      </div>

      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#e8edf5] bg-white p-6 shadow-sm sm:flex-row sm:items-center">
        <div>
          <h2 className="font-semibold text-[#07132f]">Account status</h2>
          <p className="mt-1 text-sm text-[#71809a]">
            This account is currently {statusLabel.toLowerCase()}.
          </p>
        </div>

        <div className="flex items-center gap-2 text-sm font-semibold">
          {customer.status === "ACTIVE" ? (
            <>
              <CheckCircle2 size={18} className="text-[#16834a]" />
              <span className="text-[#16834a]">Account active</span>
            </>
          ) : (
            <>
              <Ban size={18} className="text-[#d04438]" />
              <span className="text-[#d04438]">{statusLabel}</span>
            </>
          )}
        </div>
      </section>

      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[#155eef] hover:underline"
      >
        <ArrowLeft size={16} />
        Back to customers
      </Link>

      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07132f]/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-[#e8edf5] bg-white px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#07132f]">
                  Edit customer
                </h2>
                <p className="mt-1 text-xs text-[#8290a6]">
                  Update {customer.customerCode}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditOpen(false)}
                disabled={saving}
                className="rounded-lg p-2 text-[#71809a] hover:bg-[#f3f6fb]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveCustomer} className="space-y-5 p-6">
              {saveError && (
                <div className="rounded-xl border border-[#f2c5c2] bg-[#fff4f3] px-4 py-3 text-sm text-[#c0392b]">
                  {saveError}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Company name" required>
                  <input
                    required
                    maxLength={200}
                    value={form.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    className="settings-input"
                    placeholder="Company name"
                  />
                </FormField>

                <FormField label="Customer email" required>
                  <input
                    required
                    type="email"
                    maxLength={255}
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    className="settings-input"
                    placeholder="customer@example.com"
                  />
                </FormField>

                <FormField label="Contact person">
                  <input
                    maxLength={200}
                    value={form.contactName}
                    onChange={(e) =>
                      updateField("contactName", e.target.value)
                    }
                    className="settings-input"
                    placeholder="Contact name"
                  />
                </FormField>

                <FormField label="Phone number">
                  <input
                    maxLength={50}
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    className="settings-input"
                    placeholder="+1 555 000 0000"
                  />
                </FormField>

                <FormField label="Country">
                  <input
                    maxLength={100}
                    value={form.country}
                    onChange={(e) => updateField("country", e.target.value)}
                    className="settings-input"
                    placeholder="Country"
                  />
                </FormField>

                <FormField label="Billing email">
                  <input
                    type="email"
                    maxLength={255}
                    value={form.billingEmail}
                    onChange={(e) =>
                      updateField("billingEmail", e.target.value)
                    }
                    className="settings-input"
                    placeholder="billing@example.com"
                  />
                </FormField>
              </div>

              <FormField label="Internal notes">
                <textarea
                  maxLength={5000}
                  rows={4}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  className="settings-input h-auto py-3"
                  placeholder="Internal notes about this customer..."
                />
              </FormField>

              <div className="flex flex-col-reverse gap-3 border-t border-[#e8edf5] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setEditOpen(false)}
                  className="rounded-xl border border-[#e3e9f2] px-5 py-2.5 text-sm font-semibold text-[#34425b] hover:bg-[#f8faff] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#155eef] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#104dcc] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={16} />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-[#34425b]">
        {label}
        {required && <span className="ml-1 text-[#d04438]">*</span>}
      </span>
      {children}
    </label>
  );
}

function StatusBadge({ status }: { status: string }) {
  const active = status === "Active";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-[#eaf8f0] text-[#16834a]"
          : "bg-[#fff1f0] text-[#d04438]"
      }`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
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
  icon: ReactNode;
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

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-[#8290a6]">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[#8290a6]">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-[#34425b]">
          {value}
        </p>
      </div>
    </div>
  );
}
