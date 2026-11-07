
"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Search,
  Plus,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Copy,
  MoreHorizontal,
  Filter,
  X,
  Building2,
  LoaderCircle,
} from "lucide-react";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  environment: "LIVE" | "TEST";
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  customer: {
    customerCode: string;
    name: string;
    email: string;
  };
};

type Customer = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  status: string;
};

const fieldClass =
  "w-full rounded-xl border border-[#e3e9f2] bg-[#fbfcfe] px-3.5 py-2.5 text-sm text-[#07132f] outline-none transition placeholder:text-[#a0aabd] focus:border-[#155eef] focus:bg-white focus:ring-2 focus:ring-[#155eef]/10";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatLastUsed(date: string | null) {
  if (!date) return "Never";

  const elapsed = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} days ago`;

  return formatDate(date);
}

function environmentLabel(environment: ApiKey["environment"]) {
  return environment === "LIVE" ? "Production" : "Test";
}

function statusLabel(status: ApiKey["status"]) {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [environmentFilter, setEnvironmentFilter] = useState("All");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyCustomer, setNewKeyCustomer] = useState("");
  const [newKeyEnvironment, setNewKeyEnvironment] =
    useState<"LIVE" | "TEST">("LIVE");

  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [generatedKeyName, setGeneratedKeyName] = useState("");
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      setPageError("");

      const [keysResponse, customersResponse] = await Promise.all([
        fetch("/api/admin/api-keys", { cache: "no-store" }),
        fetch("/api/admin/customers", { cache: "no-store" }),
      ]);

      const keysData = await keysResponse.json();
      const customersData = await customersResponse.json();

      if (!keysResponse.ok || !keysData.success) {
        throw new Error(
          keysData.message || "Unable to retrieve API keys."
        );
      }

      if (!customersResponse.ok || !customersData.success) {
        throw new Error(
          customersData.message || "Unable to retrieve customers."
        );
      }

      setKeys(keysData.apiKeys || []);
      setCustomers(customersData.customers || []);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Unable to load API key information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredKeys = useMemo(() => {
    return keys.filter((key) => {
      const term = search.toLowerCase();

      const matchesSearch =
        key.name.toLowerCase().includes(term) ||
        key.customer.name.toLowerCase().includes(term) ||
        key.customer.customerCode.toLowerCase().includes(term) ||
        key.id.toLowerCase().includes(term) ||
        key.prefix.toLowerCase().includes(term);

      const matchesStatus =
        statusFilter === "All" ||
        statusLabel(key.status) === statusFilter;

      const matchesEnvironment =
        environmentFilter === "All" ||
        environmentLabel(key.environment) === environmentFilter;

      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [keys, search, statusFilter, environmentFilter]);

  const activeCount = keys.filter((key) => key.status === "ACTIVE").length;
  const revokedCount = keys.filter((key) => key.status === "REVOKED").length;
  const productionCount = keys.filter(
    (key) => key.environment === "LIVE"
  ).length;


  async function revokeKey(key: ApiKey) {
    if (key.status !== "ACTIVE") return;

    const confirmed = window.confirm(
      `Are you sure you want to revoke "${key.name}" for ${key.customer.name}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `/api/admin/api-keys/${encodeURIComponent(key.id)}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to revoke API key.");
      }

      setKeys((previous) =>
        previous.map((item) =>
          item.id === key.id
            ? { ...item, status: "REVOKED", revokedAt: data.apiKey.revokedAt }
            : item
        )
      );

      setSelectedKey(null);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Unable to revoke API key."
      );
    }
  }


  function openCreateModal() {
    setNewKeyName("");
    setNewKeyCustomer("");
    setNewKeyEnvironment("LIVE");
    setGeneratedSecret(null);
    setGeneratedKeyName("");
    setFormError("");
    setCopied(false);
    setShowCreateModal(true);
  }

  async function generateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!newKeyName.trim()) {
      setFormError("Please enter a name for this API key.");
      return;
    }

    if (!newKeyCustomer) {
      setFormError("Please select a customer.");
      return;
    }

    try {
      setCreating(true);

      const response = await fetch("/api/admin/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          customerCode: newKeyCustomer,
          environment: newKeyEnvironment,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to generate API key.");
      }

      if (!data.secretKey) {
        throw new Error("The server did not return the generated key.");
      }

      setGeneratedSecret(data.secretKey);
      setGeneratedKeyName(data.apiKey.name);

      setKeys((previous) => [data.apiKey, ...previous]);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to generate API key."
      );
    } finally {
      setCreating(false);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setFormError("Clipboard access is unavailable in this browser.");
    }
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-[#71809a]">
            <span>Administration</span>
            <span>/</span>
            <span className="font-medium text-[#155eef]">API Keys</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
            API Key Management
          </h1>

          <p className="mt-1 text-sm text-[#71809a]">
            Manage customer credentials and API access.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#155eef] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104bc5]"
        >
          <Plus size={17} />
          Generate API Key
        </button>
      </div>

      {pageError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[#ffd9d6] bg-[#fff5f4] p-4 text-sm text-[#c33c32]">
          <span>{pageError}</span>
          <button
            onClick={loadData}
            className="shrink-0 font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total API Keys"
          value={keys.length.toString()}
          subtitle="Across all customers"
          icon={<KeyRound size={19} />}
        />

        <MetricCard
          title="Active Keys"
          value={activeCount.toString()}
          subtitle="Currently active"
          icon={<ShieldCheck size={19} />}
        />

        <MetricCard
          title="Revoked Keys"
          value={revokedCount.toString()}
          subtitle="No longer active"
          icon={<ShieldAlert size={19} />}
        />

        <MetricCard
          title="Production Keys"
          value={productionCount.toString()}
          subtitle="Production environment"
          icon={<Building2 size={19} />}
        />
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-[#e8edf5] p-5">
          <div>
            <h2 className="font-semibold text-[#07132f]">All API keys</h2>
            <p className="mt-1 text-xs text-[#8290a6]">
              Review keys issued to your customers.
            </p>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8290a6]"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search key, customer or ID..."
                className="w-full rounded-xl border border-[#e8edf5] bg-[#fbfcfe] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-[#155eef]"
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
                className="w-full appearance-none rounded-xl border border-[#e8edf5] bg-[#fbfcfe] py-2.5 pl-9 pr-8 text-sm text-[#34425b] outline-none focus:border-[#155eef] lg:w-40"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Revoked">Revoked</option>
                <option value="Expired">Expired</option>
              </select>
            </div>

            <select
              value={environmentFilter}
              onChange={(event) =>
                setEnvironmentFilter(event.target.value)
              }
              className="rounded-xl border border-[#e8edf5] bg-[#fbfcfe] px-3 py-2.5 text-sm text-[#34425b] outline-none focus:border-[#155eef] lg:w-44"
            >
              <option value="All">All environments</option>
              <option value="Production">Production</option>
              <option value="Test">Test</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left">
            <thead className="bg-[#f8faff]">
              <tr className="text-xs font-semibold uppercase tracking-wide text-[#8290a6]">
                <th className="px-5 py-4">Key name</th>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Key prefix</th>
                <th className="px-5 py-4">Environment</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Last used</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[#eef1f6]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-14 text-center">
                    <LoaderCircle
                      className="mx-auto animate-spin text-[#155eef]"
                      size={24}
                    />
                    <p className="mt-3 text-sm text-[#8290a6]">
                      Loading API keys...
                    </p>
                  </td>
                </tr>
              ) : (
                <>
                  {filteredKeys.map((key) => (
                    <tr
                      key={key.id}
                      className="transition hover:bg-[#fbfcff]"
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-[#07132f]">
                          {key.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8290a6]">
                          {key.id}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-[#34425b]">
                          {key.customer.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8290a6]">
                          {key.customer.customerCode}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <code className="rounded-md bg-[#f4f6fa] px-2 py-1 text-xs text-[#64728a]">
                          {key.prefix}••••••••
                        </code>
                      </td>

                      <td className="px-5 py-4">
                        <EnvironmentBadge
                          environment={environmentLabel(key.environment)}
                        />
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={statusLabel(key.status)} />
                      </td>

                      <td className="px-5 py-4 text-sm text-[#64728a]">
                        {formatLastUsed(key.lastUsedAt)}
                      </td>

                      <td className="px-5 py-4">
                        <button
                          onClick={() => setSelectedKey(key)}
                          className="rounded-lg p-2 text-[#8290a6] transition hover:bg-[#edf3ff] hover:text-[#155eef]"
                          title="View API key details"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredKeys.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-12 text-center text-sm text-[#8290a6]"
                      >
                        {keys.length === 0
                          ? "No API keys have been generated yet."
                          : "No API keys match your filters."}
                      </td>
                    </tr>
                  )}
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-[#e8edf5] px-5 py-4 text-xs text-[#8290a6]">
          Showing {filteredKeys.length} of {keys.length} API keys.
        </div>
      </section>

      {showCreateModal && (
        <Modal onClose={() => setShowCreateModal(false)}>
          {generatedSecret ? (
            <div className="space-y-5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eaf8f0] text-[#16834a]">
                <ShieldCheck size={25} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-[#07132f]">
                  API key generated successfully
                </h2>
                <p className="mt-1 text-sm text-[#71809a]">
                  {generatedKeyName}
                </p>
              </div>

              <div className="rounded-xl border border-[#e8edf5] bg-[#f8faff] p-4">
                <p className="break-all font-mono text-sm text-[#34425b]">
                  {generatedSecret}
                </p>

                <button
                  onClick={() => copyText(generatedSecret)}
                  className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#155eef]"
                >
                  <Copy size={16} />
                  {copied ? "Copied!" : "Copy API key"}
                </button>
              </div>

              <div className="rounded-xl border border-[#ffe3bd] bg-[#fff9f0] p-3 text-xs leading-5 text-[#9a641c]">
                Important: This is the only time the complete secret will be
                displayed. Copy and securely store it now. It cannot be
                retrieved from the database later.
              </div>

              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setGeneratedSecret(null);
                  setCopied(false);
                }}
                className="w-full rounded-xl bg-[#155eef] px-4 py-3 text-sm font-semibold text-white hover:bg-[#104bc5]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="border-b border-[#e8edf5] px-6 py-5">
                <h2 className="text-lg font-bold text-[#07132f]">
                  Generate API key
                </h2>
                <p className="mt-1 text-sm text-[#71809a]">
                  Create a secure credential for a customer.
                </p>
              </div>

              <form onSubmit={generateKey} className="space-y-5 p-6">
                <Field label="Key name">
                  <input
                    required
                    maxLength={100}
                    value={newKeyName}
                    onChange={(event) => setNewKeyName(event.target.value)}
                    placeholder="e.g. Production Integration"
                    className={fieldClass}
                  />
                </Field>

                <Field label="Customer">
                  <select
                    required
                    value={newKeyCustomer}
                    onChange={(event) =>
                      setNewKeyCustomer(event.target.value)
                    }
                    className={fieldClass}
                  >
                    <option value="">Select a customer</option>
                    {customers
                      .filter((customer) => customer.status === "ACTIVE")
                      .map((customer) => (
                        <option
                          key={customer.customerCode}
                          value={customer.customerCode}
                        >
                          {customer.name} ({customer.customerCode})
                        </option>
                      ))}
                  </select>

                  {customers.length === 0 && (
                    <p className="mt-2 text-xs text-[#8290a6]">
                      No customers found. Create a customer first.
                    </p>
                  )}
                </Field>

                <Field label="Environment">
                  <select
                    value={newKeyEnvironment}
                    onChange={(event) =>
                      setNewKeyEnvironment(
                        event.target.value as "LIVE" | "TEST"
                      )
                    }
                    className={fieldClass}
                  >
                    <option value="LIVE">Production (LIVE)</option>
                    <option value="TEST">Test (TEST)</option>
                  </select>
                </Field>

                {formError && (
                  <p className="rounded-xl bg-[#fff1f0] p-3 text-sm text-[#c33c32]">
                    {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                    className="flex-1 rounded-xl border border-[#e3e9f2] px-4 py-3 text-sm font-semibold text-[#34425b] hover:bg-[#f8faff] disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={creating || customers.length === 0}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#155eef] px-4 py-3 text-sm font-semibold text-white hover:bg-[#104bc5] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {creating && (
                      <LoaderCircle size={16} className="animate-spin" />
                    )}
                    {creating ? "Generating..." : "Generate key"}
                  </button>
                </div>
              </form>
            </>
          )}
        </Modal>
      )}

      {selectedKey && (
        <Modal onClose={() => setSelectedKey(null)}>
          <div className="border-b border-[#e8edf5] px-6 py-5">
            <h2 className="text-lg font-bold text-[#07132f]">
              API key details
            </h2>
            <p className="mt-1 text-sm text-[#71809a]">
              {selectedKey.name}
            </p>
          </div>

          <div className="space-y-5 p-6">
            <div className="rounded-xl bg-[#f8faff] p-4">
              <Detail label="Key ID" value={selectedKey.id} />
              <Detail
                label="Customer"
                value={selectedKey.customer.name}
              />
              <Detail
                label="Customer code"
                value={selectedKey.customer.customerCode}
              />
              <Detail
                label="Key prefix"
                value={`${selectedKey.prefix}••••••••`}
              />
              <Detail
                label="Environment"
                value={environmentLabel(selectedKey.environment)}
              />
              <Detail
                label="Status"
                value={statusLabel(selectedKey.status)}
              />
              <Detail
                label="Created"
                value={formatDate(selectedKey.createdAt)}
              />
              <Detail
                label="Last used"
                value={formatLastUsed(selectedKey.lastUsedAt)}
              />
              {selectedKey.expiresAt && (
                <Detail
                  label="Expires"
                  value={formatDate(selectedKey.expiresAt)}
                />
              )}
            </div>

            <p className="text-xs leading-5 text-[#8290a6]">
              The complete API secret is never stored in readable form and
              cannot be recovered from this screen.
            </p>

            <button
              onClick={() => setSelectedKey(null)}
              className="w-full rounded-xl border border-[#e3e9f2] px-4 py-3 text-sm font-semibold text-[#34425b] hover:bg-[#f8faff]"
            >
              Close
            </button>
          </div>


          {selectedKey.status === "ACTIVE" ? (
            <button
              onClick={() => revokeKey(selectedKey)}
              className="w-full rounded-xl border border-[#ffd9d6] px-4 py-3 text-sm font-semibold text-[#c33c32] transition hover:bg-[#fff5f4]"
            >
              Revoke API key
            </button>
          ) : (
            <p className="rounded-xl bg-[#fff1f0] p-3 text-sm text-[#c33c32]">
              This API key has been revoked and is no longer active.
            </p>
          )}

        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-[#34425b]">
        {label}
      </label>
      {children}
    </div>
  );
}

function Modal({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#07132f]/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-[#e8edf5] bg-white shadow-2xl">
        <div className="flex justify-end px-5 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[#8290a6] hover:bg-[#f2f5fa] hover:text-[#07132f]"
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
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

function EnvironmentBadge({ environment }: { environment: string }) {
  const production = environment === "Production";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        production
          ? "bg-[#edf3ff] text-[#155eef]"
          : "bg-[#f2ecff] text-[#7214ed]"
      }`}
    >
      {environment}
    </span>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="mb-4 last:mb-0">
      <p className="text-xs text-[#8290a6]">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-[#07132f]">
        {value}
      </p>
    </div>
  );
}
