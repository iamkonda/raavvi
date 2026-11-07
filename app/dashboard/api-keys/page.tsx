
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  EyeOff,
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
};

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSecret, setNewSecret] = useState("");
  const [showSecret, setShowSecret] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/customer/api-keys", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load API keys.");
      }

      setApiKeys(result.apiKeys || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load API keys."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  async function handleCreateKey(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!keyName.trim()) {
      setError("Please enter an API key name.");
      return;
    }

    try {
      setCreating(true);
      setError("");
      setSuccess("");

      const response = await fetch("/api/customer/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: keyName.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create API key.");
      }

      setNewSecret(result.secretKey);
      setShowSecret(true);
      setCopied(false);
      setKeyName("");
      setShowCreateModal(false);
      setSuccess("");
      await fetchApiKeys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to create API key."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy. Please copy the key manually.");
    }
  }

  async function handleRevoke() {
    if (!revokingId) return;

    try {
      setRevokeLoading(true);
      setError("");

      const response = await fetch(
        `/api/customer/api-keys/${revokingId}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to revoke API key.");
      }

      setRevokingId(null);
      setSuccess("API key revoked successfully.");
      await fetchApiKeys();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to revoke API key."
      );
    } finally {
      setRevokeLoading(false);
    }
  }

  const activeCount = apiKeys.filter(
    (key) => key.status === "ACTIVE"
  ).length;

  const revokedCount = apiKeys.filter(
    (key) => key.status === "REVOKED"
  ).length;

  const expiredCount = apiKeys.filter(
    (key) => key.status === "EXPIRED"
  ).length;

  function formatDate(date: string | null) {
    if (!date) return "Never";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div className="space-y-8">
      {/* Page heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#171923]">
            API Keys
          </h1>
          <p className="mt-1 text-sm text-[#737987]">
            Create and manage the keys used to authenticate your API requests.
          </p>
        </div>

        <button
          onClick={() => {
            setError("");
            setShowCreateModal(true);
          }}
          className="flex items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#124dcc]"
        >
          <Plus size={17} />
          Create API key
        </button>
      </div>

      

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <Check size={18} />
          <p className="flex-1">{success}</p>
          <button onClick={() => setSuccess("")} aria-label="Dismiss message">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Active keys", value: activeCount, color: "text-emerald-600" },
          { label: "Revoked keys", value: revokedCount, color: "text-red-500" },
          { label: "Expired keys", value: expiredCount, color: "text-amber-600" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-[#e8eaf0] bg-white p-5"
          >
            <p className="text-sm text-[#737987]">{stat.label}</p>
            <p className={`mt-3 text-2xl font-semibold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* API keys list */}
      <section className="overflow-hidden rounded-xl border border-[#e8eaf0] bg-white">
        <div className="flex items-center justify-between border-b border-[#e8eaf0] p-5">
          <div>
            <h2 className="font-semibold text-[#171923]">
              Your API keys
            </h2>
            <p className="mt-1 text-xs text-[#9298a4]">
              Manage your production API credentials.
            </p>
          </div>

          <button
            onClick={fetchApiKeys}
            disabled={loading}
            className="rounded-lg border border-[#e8eaf0] p-2 text-[#737987] transition hover:bg-[#f7f9fd] disabled:opacity-50"
            aria-label="Refresh API keys"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
          </button>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw size={22} className="animate-spin text-[#155EEF]" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center px-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f5f8]">
              <KeyRound size={25} className="text-[#8c95a4]" />
            </div>

            <h3 className="mt-5 text-sm font-semibold text-[#171923]">
              No API keys yet
            </h3>

            <p className="mt-2 max-w-sm text-xs leading-5 text-[#9298a4]">
              Create your first LIVE API key to start making authenticated
              requests to Raavvi.
            </p>

            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-5 flex items-center gap-2 rounded-lg bg-[#155EEF] px-4 py-2.5 text-xs font-medium text-white hover:bg-[#124dcc]"
            >
              <Plus size={15} />
              Create your first key
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#e8eaf0]">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex flex-col gap-4 p-5 transition hover:bg-[#fafbfc] lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f0f4fc]">
                    <KeyRound size={19} className="text-[#155EEF]" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#171923]">
                        {key.name}
                      </p>

                      <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        LIVE
                      </span>

                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                          key.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700"
                            : key.status === "REVOKED"
                              ? "bg-red-50 text-red-600"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {key.status}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <code className="break-all text-xs text-[#737987]">
                        {key.prefix}••••••••
                      </code>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[#9298a4]">
                      <span>
                        Created {formatDate(key.createdAt)}
                      </span>

                      <span>
                        Last used {formatDate(key.lastUsedAt)}
                      </span>

                      {key.expiresAt && (
                        <span>
                          Expires {formatDate(key.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {key.status === "ACTIVE" && (
                  <button
                    onClick={() => setRevokingId(key.id)}
                    className="flex items-center justify-center gap-2 self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 lg:self-center"
                  >
                    <Trash2 size={14} />
                    Revoke key
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Security note */}
      <div className="flex items-start gap-3 rounded-xl border border-[#e8eaf0] bg-white p-5">
        <ShieldCheck size={19} className="mt-0.5 shrink-0 text-[#155EEF]" />
        <div>
          <p className="text-sm font-semibold text-[#171923]">
            Keep your API keys secure
          </p>
          <p className="mt-1 text-xs leading-5 text-[#737987]">
            Never expose your API keys in public repositories, browser
            frontend code, or client-side applications. Store them securely
            on your backend. If a key is compromised, revoke it immediately.
          </p>
        </div>
      </div>

      {/* Create API key modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07132F]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf3ff]">
                  <KeyRound size={21} className="text-[#155EEF]" />
                </div>

                <h2 className="mt-4 text-lg font-semibold text-[#171923]">
                  Create API key
                </h2>

                <p className="mt-1 text-sm text-[#737987]">
                  Generate a new production API credential.
                </p>
              </div>

              <button
                onClick={() => setShowCreateModal(false)}
                className="rounded-lg p-2 text-[#9298a4] hover:bg-[#f3f5f8]"
                aria-label="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleCreateKey} className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-[#343b49]">
                  API key name
                </label>

                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="e.g. Production Server"
                  maxLength={100}
                  required
                  className="w-full rounded-lg border border-[#e1e5ed] px-4 py-3 text-sm text-[#171923] outline-none transition placeholder:text-[#a4aab5] focus:border-[#155EEF]"
                />

                <p className="mt-2 text-xs text-[#9298a4]">
                  Use a name that helps you identify where this key is used.
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={17} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-900">
                    LIVE environment
                  </span>
                </div>

                <p className="mt-1 text-xs leading-5 text-emerald-800">
                  This key will be generated for production API requests.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-lg border border-[#e1e5ed] px-4 py-3 text-sm font-medium text-[#64728A] hover:bg-[#f7f9fd]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creating || !keyName.trim()}
                  className="flex-1 rounded-lg bg-[#155EEF] px-4 py-3 text-sm font-medium text-white hover:bg-[#124dcc] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? "Generating..." : "Generate key"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Newly generated secret */}
      {newSecret && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#07132F]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
              <Check size={24} className="text-emerald-600" />
            </div>

            <h2 className="mt-5 text-xl font-semibold text-[#171923]">
              Your API key is ready
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#737987]">
              Copy and save this key securely. For security reasons, the
              complete secret will not be shown again.
            </p>

            <div className="mt-6">
              <label className="mb-2 block text-xs font-semibold text-[#64728A]">
                YOUR LIVE API KEY
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-[#e1e5ed] bg-[#f7f9fd] p-3">
                <code className="min-w-0 flex-1 break-all text-xs text-[#171923]">
                  {showSecret
                    ? newSecret
                    : "•".repeat(Math.min(newSecret.length, 40))}
                </code>

                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="shrink-0 rounded-lg p-2 text-[#64728A] hover:bg-white"
                  aria-label={showSecret ? "Hide key" : "Show key"}
                >
                  {showSecret ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(newSecret)}
                  className="shrink-0 rounded-lg bg-[#155EEF] p-2 text-white hover:bg-[#124dcc]"
                  aria-label="Copy API key"
                >
                  {copied ? <Check size={17} /> : <Copy size={17} />}
                </button>
              </div>

              {copied && (
                <p className="mt-2 text-xs text-emerald-600">
                  API key copied successfully.
                </p>
              )}
            </div>

            <div className="mt-5 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <AlertCircle
                size={17}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              <p className="text-xs leading-5 text-amber-800">
                Make sure you save this key now. Once you close this window,
                you cannot retrieve the full secret again.
              </p>
            </div>

            <button
              onClick={() => {
                setNewSecret("");
                setShowSecret(true);
                setCopied(false);
              }}
              className="mt-6 w-full rounded-lg bg-[#155EEF] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#124dcc]"
            >
              I've saved my API key
            </button>
          </div>
        </div>
      )}

      {/* Revoke confirmation */}
      {revokingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#07132F]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle size={23} className="text-red-600" />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-[#171923]">
              Revoke this API key?
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#737987]">
              Applications using this key will no longer be able to
              authenticate API requests. This action cannot be undone.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRevokingId(null)}
                disabled={revokeLoading}
                className="flex-1 rounded-lg border border-[#e1e5ed] px-4 py-3 text-sm font-medium text-[#64728A] hover:bg-[#f7f9fd]"
              >
                Cancel
              </button>

              <button
                onClick={handleRevoke}
                disabled={revokeLoading}
                className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {revokeLoading ? "Revoking..." : "Revoke key"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
