
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  ArrowUpRight,
  Filter,
  Download,
  X,
  Building2,
  Mail,
  User,
  Globe,
  FileText,
  LoaderCircle,
  RefreshCw,
  Copy,
  Check,
  ShieldAlert,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  contact: string;
  country: string;
  billingEmail: string;
  notes: string;
  status: "Active" | "Suspended" | "Inactive";
  joined: string;
  requests: number;
  bill: number;
};

type CreatedCredentials = {
  name: string;
  email: string;
  password: string;
  expiresAt: string;
};

const emptyForm = {
  name: "",
  email: "",
  contact: "",
  country: "",
  billingEmail: "",
  status: "Active" as "Active" | "Suspended" | "Inactive",
  notes: "",
};

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);

const fieldClass =
  "w-full rounded-xl border border-[#e3e9f2] bg-[#fbfcfe] px-3.5 py-2.5 text-sm text-[#07132f] outline-none transition placeholder:text-[#a0aabd] focus:border-[#155eef] focus:bg-white focus:ring-2 focus:ring-[#155eef]/10";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  // Temporary credentials shown once after customer creation.
  const [createdCredentials, setCreatedCredentials] =
    useState<CreatedCredentials | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [copyError, setCopyError] = useState("");

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const response = await fetch("/api/admin/customers", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load customers.");
      }

      const mappedCustomers: Customer[] = result.customers.map(
        (customer: {
          id: string;
          customerCode: string;
          name: string;
          email: string;
          contactName: string | null;
          country: string | null;
          billingEmail: string | null;
          notes: string | null;
          status: string;
          createdAt: string;
          _count?: {
            usageRecords?: number;
          };
        }) => ({
          id: customer.customerCode,
          name: customer.name,
          email: customer.email,
          contact: customer.contactName || "",
          country: customer.country || "",
          billingEmail: customer.billingEmail || "",
          notes: customer.notes || "",
          status:
            customer.status === "SUSPENDED"
              ? "Suspended"
              : customer.status === "INACTIVE"
                ? "Inactive"
                : "Active",
          joined: new Date(customer.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "2-digit",
            year: "numeric",
          }),
          requests: customer._count?.usageRecords || 0,
          bill: 0,
        })
      );

      setCustomers(mappedCustomers);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load customers."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      const term = search.toLowerCase();

      const matchesSearch =
        customer.name.toLowerCase().includes(term) ||
        customer.email.toLowerCase().includes(term) ||
        customer.id.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" || customer.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, search, statusFilter]);

  const activeCount = customers.filter(
    (customer) => customer.status === "Active"
  ).length;

  const suspendedCount = customers.filter(
    (customer) => customer.status === "Suspended"
  ).length;

  const totalRequests = customers.reduce(
    (sum, customer) => sum + customer.requests,
    0
  );

  const estimatedRevenue = customers.reduce(
    (sum, customer) => sum + customer.bill,
    0
  );

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function createCustomer(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!form.name.trim() || !form.email.trim() || !form.contact.trim()) {
      setFormError("Please complete all required fields.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/admin/customers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          contactName: form.contact.trim(),
          country: form.country,
          billingEmail: form.billingEmail.trim(),
          status: form.status.toUpperCase(),
          notes: form.notes.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to create customer.");
      }

      if (
        !result.temporaryPassword ||
        !result.customer?.temporaryPasswordExpiresAt
      ) {
        throw new Error(
          "Customer was created, but the temporary password was not returned. Check the customer record before retrying."
        );
      }

      setCreatedCredentials({
        name: result.customer.name,
        email: result.customer.email,
        password: result.temporaryPassword,
        expiresAt: result.customer.temporaryPasswordExpiresAt,
      });

      setPasswordCopied(false);
      setCopyError("");
      setForm(emptyForm);
      setShowCreateModal(false);
      setSearch("");
      setStatusFilter("All");

      await loadCustomers();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create customer."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyTemporaryPassword() {
    if (!createdCredentials) return;

    try {
      await navigator.clipboard.writeText(createdCredentials.password);
      setPasswordCopied(true);
      setCopyError("");
    } catch {
      setPasswordCopied(false);
      setCopyError(
        "Unable to copy automatically. Please select and copy the password manually."
      );
    }
  }

  function exportCustomers() {
    const rows = [
      [
        "Customer ID",
        "Company",
        "Email",
        "Contact",
        "Country",
        "Status",
        "Requests",
        "Estimated Bill",
      ],
      ...filteredCustomers.map((customer) => [
        customer.id,
        customer.name,
        customer.email,
        customer.contact,
        customer.country,
        customer.status,
        customer.requests.toString(),
        customer.bill.toFixed(2),
      ]),
    ];

    const csv = rows
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "raavvi-customers.csv";
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
            <span className="font-medium text-[#155eef]">Customers</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
            Customers
          </h1>

          <p className="mt-1 text-sm text-[#71809a]">
            Manage customer accounts, access and usage.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadCustomers}
            disabled={loading}
            className="flex items-center justify-center gap-2 rounded-xl border border-[#e8edf5] bg-white px-3 py-2.5 text-sm font-medium text-[#34425b] transition hover:bg-[#f7f9fd] disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <button
            onClick={() => {
              setForm(emptyForm);
              setFormError("");
              setShowCreateModal(true);
            }}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#155eef] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104bc5]"
          >
            <Plus size={17} />
            Add Customer
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Customers"
          value={customers.length.toString()}
          note="Registered customer accounts"
          icon={<Users size={19} />}
        />

        <SummaryCard
          title="Active Customers"
          value={activeCount.toString()}
          note="Accounts currently active"
          icon={<UserCheck size={19} />}
        />

        <SummaryCard
          title="Suspended"
          value={suspendedCount.toString()}
          note="Accounts currently suspended"
          icon={<UserX size={19} />}
        />

        <SummaryCard
          title="Total API Requests"
          value={totalRequests.toLocaleString("en-US")}
          note={`${money(estimatedRevenue)} estimated usage`}
          icon={<ArrowUpRight size={19} />}
        />
      </div>

      {/* Customer table */}
      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e8edf5] p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-[#07132f]">All customers</h2>
            <p className="mt-1 text-xs text-[#8290a6]">
              Search and review customer accounts.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290a6]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search customers..."
                className="w-full rounded-xl border border-[#e8edf5] bg-[#fbfcfe] py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-[#155eef] sm:w-64"
              />
            </div>

            <div className="relative">
              <Filter
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290a6]"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full appearance-none rounded-xl border border-[#e8edf5] bg-[#fbfcfe] py-2.5 pl-9 pr-8 text-sm text-[#34425b] outline-none focus:border-[#155eef] sm:w-40"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <button
              onClick={exportCustomers}
              disabled={filteredCustomers.length === 0}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#e8edf5] px-3 py-2.5 text-sm font-medium text-[#34425b] transition hover:bg-[#f7f9fd] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        {pageError && (
          <div className="m-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {pageError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#f8faff]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#8290a6]">
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Customer ID</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">API Requests</th>
                <th className="px-5 py-4">Estimated Bill</th>
                <th className="px-5 py-4">Joined</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eef1f6]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-[#8290a6]">
                      <LoaderCircle size={18} className="animate-spin" />
                      Loading customers...
                    </div>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredCustomers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="transition hover:bg-[#fbfcff]"
                    >
                      <td className="px-5 py-4">
                        <a
                          href={`/admin/customers/${customer.id}`}
                          className="font-semibold text-[#155eef] transition hover:underline"
                        >
                          {customer.name}
                        </a>
                        <div className="mt-1 text-xs text-[#8290a6]">
                          {customer.email}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-[#64728a]">
                        {customer.id}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                            customer.status === "Active"
                              ? "bg-[#eaf8f0] text-[#16834a]"
                              : customer.status === "Suspended"
                                ? "bg-[#fff1f0] text-[#d04438]"
                                : "bg-[#f1f3f6] text-[#64728a]"
                          }`}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {customer.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-sm font-medium tabular-nums text-[#34425b]">
                        {customer.requests.toLocaleString("en-US")}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold tabular-nums text-[#07132f]">
                        {money(customer.bill)}
                      </td>

                      <td className="px-5 py-4 text-sm text-[#64728a]">
                        {customer.joined}
                      </td>
                    </tr>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-16 text-center text-sm text-[#8290a6]"
                      >
                        {pageError
                          ? "Customers could not be loaded."
                          : search || statusFilter !== "All"
                            ? "No customers match your search."
                            : "No customers yet. Add your first customer to get started."}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-2 border-t border-[#e8edf5] px-5 py-4 text-xs text-[#8290a6] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {filteredCustomers.length} of {customers.length} customers
          </span>
          <span>Customer records are stored in PostgreSQL.</span>
        </div>
      </section>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07132f]/40 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !saving) {
              setShowCreateModal(false);
            }
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e8edf5] px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-[#07132f]">
                  Create customer
                </h2>
                <p className="mt-1 text-sm text-[#71809a]">
                  Add a new customer account to Raavvi.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                disabled={saving}
                className="rounded-lg p-2 text-[#8290a6] transition hover:bg-[#f2f5fa] hover:text-[#07132f] disabled:opacity-50"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createCustomer}>
              <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                <FormField
                  label="Company / Customer name"
                  required
                  icon={<Building2 size={16} />}
                >
                  <input
                    required
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="e.g. Acme Technologies"
                    className={fieldClass}
                  />
                </FormField>

                <FormField
                  label="Customer email"
                  required
                  icon={<Mail size={16} />}
                >
                  <input
                    required
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField("email", event.target.value)
                    }
                    placeholder="customer@company.com"
                    className={fieldClass}
                  />
                </FormField>

                <FormField
                  label="Contact person"
                  required
                  icon={<User size={16} />}
                >
                  <input
                    required
                    value={form.contact}
                    onChange={(event) =>
                      updateField("contact", event.target.value)
                    }
                    placeholder="Full name"
                    className={fieldClass}
                  />
                </FormField>

                <FormField label="Country" icon={<Globe size={16} />}>
                  <select
                    value={form.country}
                    onChange={(event) =>
                      updateField("country", event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">Select country</option>
                    <option>India</option>
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Australia</option>
                    <option>Singapore</option>
                    <option>Germany</option>
                    <option>France</option>
                    <option>United Arab Emirates</option>
                    <option>Other</option>
                  </select>
                </FormField>

                <FormField label="Billing email" icon={<Mail size={16} />}>
                  <input
                    type="email"
                    value={form.billingEmail}
                    onChange={(event) =>
                      updateField("billingEmail", event.target.value)
                    }
                    placeholder="billing@company.com"
                    className={fieldClass}
                  />
                </FormField>

                <FormField label="Account status" icon={<UserCheck size={16} />}>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField("status", event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </FormField>

                <div className="sm:col-span-2">
                  <FormField label="Internal notes" icon={<FileText size={16} />}>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                      placeholder="Add any internal notes about this customer..."
                      className={`${fieldClass} resize-none`}
                    />
                  </FormField>
                </div>

                {formError && (
                  <div className="sm:col-span-2 rounded-xl border border-[#ffd9d6] bg-[#fff5f4] px-4 py-3 text-sm text-[#c33c32]">
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-[#e8edf5] bg-[#fbfcfe] px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={saving}
                  className="rounded-xl border border-[#e1e7f0] px-5 py-2.5 text-sm font-semibold text-[#34425b] transition hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#155eef] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#104bc5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus size={16} />
                      Create Customer
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Credentials Modal */}
      {createdCredentials && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-[#07132f]/50 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-2xl">

            <div className="border-b border-[#e8edf5] px-6 py-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf8f0] text-[#16834a]">
                <Check size={28} />
              </div>

              <h2 className="text-xl font-bold text-[#07132f]">
                Customer created successfully!
              </h2>

              <p className="mt-2 text-sm text-[#71809a]">
                The customer account is ready. Share these login credentials securely.
              </p>
            </div>

            <div className="space-y-5 px-6 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#8290a6]">
                  Customer
                </p>
                <p className="mt-1 font-semibold text-[#07132f]">
                  {createdCredentials.name}
                </p>
                <p className="text-sm text-[#71809a]">
                  {createdCredentials.email}
                </p>
              </div>

              <div>
                <label className="text-sm font-semibold text-[#34425b]">
                  Temporary password
                </label>

                <div className="mt-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1 rounded-xl border border-[#e3e9f2] bg-[#f8faff] px-4 py-3">
                    <code className="break-all text-sm font-semibold text-[#07132f]">
                      {createdCredentials.password}
                    </code>
                  </div>

                  <button
                    type="button"
                    onClick={copyTemporaryPassword}
                    className="flex shrink-0 items-center gap-2 rounded-xl bg-[#155eef] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#104bc5]"
                  >
                    {passwordCopied ? (
                      <>
                        <Check size={16} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {copyError && (
                  <p className="mt-2 text-xs text-red-600">{copyError}</p>
                )}
              </div>

              <div className="rounded-xl border border-[#ffe5bd] bg-[#fffaf0] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#9a6415]">
                  <ShieldAlert size={17} />
                  Important security information
                </div>

                <ul className="mt-2 space-y-2 text-xs leading-5 text-[#8a6a35]">
                  <li>• This temporary password expires after 48 hours.</li>
                  <li>• The customer must change the password on their first login.</li>
                  <li>• Share these credentials through a secure communication channel.</li>
                  <li>• This password will not be displayed again.</li>
                </ul>

                <p className="mt-3 text-xs font-medium text-[#9a6415]">
                  Expires:{" "}
                  {new Date(createdCredentials.expiresAt).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border-t border-[#e8edf5] bg-[#fbfcfe] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setCreatedCredentials(null);
                  setPasswordCopied(false);
                  setCopyError("");
                }}
                className="w-full rounded-xl bg-[#155eef] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104bc5]"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  required,
  icon,
  children,
}: {
  label: string;
  required?: boolean;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-semibold text-[#34425b]">
        <span className="text-[#8290a6]">{icon}</span>
        {label}
        {required && <span className="text-[#e05252]">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
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

      <p className="mt-1 text-xs text-[#8290a6]">{note}</p>
    </div>
  );
}
