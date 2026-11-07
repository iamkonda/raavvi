
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Download,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
};

type PricingRule = {
  id: string;
  name: string;
  operation: string;
  scope: "DEFAULT" | "CUSTOMER";
  unitPrice: string;
  currency: string;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo: string | null;
  version: number;
  createdAt: string;
  customer: Customer | null;
};

const initialForm = {
  name: "Web Search",
  operation: "search",
  scope: "DEFAULT" as "DEFAULT" | "CUSTOMER",
  customerId: "",
  unitPrice: "0.01",
  currency: "USD",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
  isActive: true,
};

function formatPrice(value: string, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(Number(value));
}

function formatDate(value: string | null) {
  if (!value) return "No end date";
  return new Date(value).toLocaleDateString();
}

export default function PricingPage() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);

  const loadPricing = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/pricing", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load pricing rules.");
      }

      setRules(data.rules);
      setCustomers(data.customers);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load pricing rules."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPricing();
  }, [loadPricing]);

  const filteredRules = useMemo(() => {
    return rules.filter((rule) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        rule.name.toLowerCase().includes(searchText) ||
        rule.operation.toLowerCase().includes(searchText) ||
        rule.customer?.name.toLowerCase().includes(searchText);

      const matchesScope =
        scopeFilter === "ALL" || rule.scope === scopeFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && rule.isActive) ||
        (statusFilter === "INACTIVE" && !rule.isActive);

      return matchesSearch && matchesScope && matchesStatus;
    });
  }, [rules, search, scopeFilter, statusFilter]);

  const activeRules = rules.filter((rule) => rule.isActive).length;
  const defaultRules = rules.filter((rule) => rule.scope === "DEFAULT").length;
  const customerRules = rules.filter(
    (rule) => rule.scope === "CUSTOMER"
  ).length;

  function openCreateModal() {
    setForm({
      ...initialForm,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setError("");
    setSuccess("");
    setModalOpen(true);
  }

  async function createRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/pricing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerId:
            form.scope === "CUSTOMER" ? form.customerId : null,
          unitPrice: Number(form.unitPrice),
          effectiveTo: form.effectiveTo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to create pricing rule.");
      }

      setSuccess("Pricing rule created successfully.");
      setModalOpen(false);
      setForm(initialForm);
      await loadPricing();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create pricing rule."
      );
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const headers = [
      "Name",
      "Operation",
      "Scope",
      "Customer",
      "Unit Price",
      "Currency",
      "Status",
      "Version",
      "Effective From",
      "Effective To",
    ];

    const rows = filteredRules.map((rule) => [
      rule.name,
      rule.operation,
      rule.scope,
      rule.customer?.name || "",
      rule.unitPrice,
      rule.currency,
      rule.isActive ? "Active" : "Inactive",
      String(rule.version),
      rule.effectiveFrom,
      rule.effectiveTo || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "raavvi-pricing-rules.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F7F9FD] p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-7">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-[#155EEF]">
              <Activity size={16} />
              Billing configuration
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-[#07132F]">
              Pricing Management
            </h1>
            <p className="mt-2 text-sm text-[#64728A]">
              Manage default rates and negotiated customer pricing.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={loadPricing}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-[#E8EDF5] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            <button
              onClick={exportCsv}
              className="flex items-center gap-2 rounded-xl border border-[#E8EDF5] bg-white px-4 py-2.5 text-sm font-semibold text-[#344054] hover:bg-gray-50"
            >
              <Download size={16} />
              Export
            </button>

            <button
              onClick={openCreateModal}
              className="flex items-center gap-2 rounded-xl bg-[#155EEF] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#104FCB]"
            >
              <Plus size={17} />
              Add pricing rule
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex gap-3">
            <Activity className="mt-0.5 shrink-0 text-[#155EEF]" size={19} />
            <div>
              <p className="text-sm font-semibold text-[#07132F]">
                Usage-based postpaid billing
              </p>
              <p className="mt-1 text-sm leading-6 text-[#52627A]">
                Customers are charged for successful billable operations.
                Customer-specific pricing takes priority over default pricing.
                Pricing changes are stored as new versions so historical usage
                can retain its original rate.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            <CheckCircle2 size={18} />
            {success}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total pricing rules",
              value: rules.length,
              description: "All configured versions",
            },
            {
              label: "Active rules",
              value: activeRules,
              description: "Currently enabled",
            },
            {
              label: "Default pricing",
              value: defaultRules,
              description: "Standard customer rates",
            },
            {
              label: "Customer-specific",
              value: customerRules,
              description: "Negotiated customer rates",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-[#E8EDF5] bg-white p-5 shadow-sm"
            >
              <p className="text-sm font-medium text-[#64728A]">
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-bold text-[#07132F]">
                {item.value}
              </p>
              <p className="mt-1 text-xs text-[#8290A6]">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#E8EDF5] bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-[#E8EDF5] p-5 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-semibold text-[#07132F]">
                Pricing rules
              </h2>
              <p className="mt-1 text-sm text-[#8290A6]">
                Database-backed pricing configuration and version history.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290A6]"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search pricing rules..."
                  className="w-full rounded-xl border border-[#E8EDF5] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[#155EEF] sm:w-64"
                />
              </div>

              <select
                value={scopeFilter}
                onChange={(event) => setScopeFilter(event.target.value)}
                className="rounded-xl border border-[#E8EDF5] px-3 py-2.5 text-sm outline-none focus:border-[#155EEF]"
              >
                <option value="ALL">All scopes</option>
                <option value="DEFAULT">Default</option>
                <option value="CUSTOMER">Customer-specific</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-xl border border-[#E8EDF5] px-3 py-2.5 text-sm outline-none focus:border-[#155EEF]"
              >
                <option value="ALL">All statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="p-16 text-center text-sm text-[#64728A]">
              Loading pricing rules...
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="p-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#F0F4FA] text-[#8290A6]">
                <Activity size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-[#07132F]">
                No pricing rules found
              </h3>
              <p className="mt-1 text-sm text-[#8290A6]">
                Create your first pricing rule to configure billing.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-5 rounded-xl bg-[#155EEF] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#104FCB]"
              >
                Add pricing rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-[#F9FAFC] text-xs uppercase tracking-wide text-[#8290A6]">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Pricing rule</th>
                    <th className="px-5 py-4 font-semibold">Scope</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Unit price</th>
                    <th className="px-5 py-4 font-semibold">Effective period</th>
                    <th className="px-5 py-4 font-semibold">Version</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8EDF5]">
                  {filteredRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-[#FAFBFD]">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#07132F]">
                          {rule.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8290A6]">
                          Operation: {rule.operation}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#155EEF]">
                          {rule.scope === "DEFAULT"
                            ? "Default"
                            : "Customer-specific"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#52627A]">
                        {rule.customer ? (
                          <>
                            <p className="font-medium text-[#07132F]">
                              {rule.customer.name}
                            </p>
                            <p className="mt-1 text-xs text-[#8290A6]">
                              {rule.customer.customerCode}
                            </p>
                          </>
                        ) : (
                          "All customers"
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#07132F]">
                        {formatPrice(rule.unitPrice, rule.currency)}
                        <p className="mt-1 text-xs font-normal text-[#8290A6]">
                          per successful operation
                        </p>
                      </td>
                      <td className="px-5 py-4 text-xs text-[#52627A]">
                        <p>{formatDate(rule.effectiveFrom)}</p>
                        <p className="mt-1 text-[#8290A6]">
                          Until: {formatDate(rule.effectiveTo)}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-[#F0F4FA] px-2.5 py-1 text-xs font-semibold text-[#52627A]">
                          v{rule.version}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            rule.isActive
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {rule.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#E8EDF5] px-5 py-4 text-xs text-[#8290A6]">
            Showing {filteredRules.length} of {rules.length} pricing rules
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07132F]/50 p-4">
          <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8EDF5] p-6">
              <div>
                <h2 className="text-xl font-bold text-[#07132F]">
                  Add pricing rule
                </h2>
                <p className="mt-1 text-sm text-[#8290A6]">
                  Configure a new pricing rate.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-[#8290A6] hover:bg-gray-100"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={createRule} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Rule name
                </label>
                <input
                  required
                  minLength={2}
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                  placeholder="e.g. Standard Web Search"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Operation
                </label>
                <select
                  value={form.operation}
                  onChange={(event) =>
                    setForm({ ...form, operation: event.target.value })
                  }
                  className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                >
                  <option value="search">Web Search (search)</option>
                </select>
                <p className="mt-1 text-xs text-[#8290A6]">
                  This operation code must match the usage records generated by the API.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#344054]">
                  Pricing scope
                </label>
                <select
                  value={form.scope}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      scope: event.target.value as "DEFAULT" | "CUSTOMER",
                      customerId: "",
                    })
                  }
                  className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                >
                  <option value="DEFAULT">Default pricing — all customers</option>
                  <option value="CUSTOMER">Customer-specific pricing</option>
                </select>
              </div>

              {form.scope === "CUSTOMER" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Select customer
                  </label>
                  <select
                    required
                    value={form.customerId}
                    onChange={(event) =>
                      setForm({ ...form, customerId: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                  >
                    <option value="">Choose a customer</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.customerCode})
                      </option>
                    ))}
                  </select>
                  {customers.length === 0 && (
                    <p className="mt-2 text-xs text-red-600">
                      No active customers are available.
                    </p>
                  )}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Unit price
                  </label>
                  <input
                    required
                    type="number"
                    min="0.00000001"
                    max="1000000"
                    step="0.00000001"
                    value={form.unitPrice}
                    onChange={(event) =>
                      setForm({ ...form, unitPrice: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                    placeholder="0.01"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(event) =>
                      setForm({ ...form, currency: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Effective from
                  </label>
                  <input
                    required
                    type="date"
                    value={form.effectiveFrom}
                    onChange={(event) =>
                      setForm({ ...form, effectiveFrom: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#344054]">
                    Effective until
                  </label>
                  <input
                    type="date"
                    min={form.effectiveFrom}
                    value={form.effectiveTo}
                    onChange={(event) =>
                      setForm({ ...form, effectiveTo: event.target.value })
                    }
                    className="w-full rounded-xl border border-[#E8EDF5] px-4 py-3 text-sm outline-none focus:border-[#155EEF]"
                  />
                  <p className="mt-1 text-xs text-[#8290A6]">
                    Leave empty for no end date.
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-[#E8EDF5] p-4">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    setForm({ ...form, isActive: event.target.checked })
                  }
                  className="h-4 w-4 accent-[#155EEF]"
                />
                <span>
                  <span className="block text-sm font-medium text-[#344054]">
                    Activate this pricing rule
                  </span>
                  <span className="mt-1 block text-xs text-[#8290A6]">
                    The rule will be enabled when created.
                  </span>
                </span>
              </label>

              <div className="flex justify-end gap-3 border-t border-[#E8EDF5] pt-5">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[#E8EDF5] px-5 py-2.5 text-sm font-semibold text-[#52627A] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    saving ||
                    (form.scope === "CUSTOMER" && !form.customerId)
                  }
                  className="rounded-xl bg-[#155EEF] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#104FCB] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create pricing rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
