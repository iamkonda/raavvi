
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  Globe,
  Building2,
  ShieldCheck,
  LockKeyhole,
  CalendarDays,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Copy,
} from "lucide-react";
import Link from "next/link";

type CustomerSettings = {
  id: string;
  customerCode: string;
  name: string;
  email: string;
  contactName: string | null;
  phone: string | null;
  country: string | null;
  billingEmail: string | null;
  status: string;
  createdAt: string;
};

export default function Page() {
  const [settings, setSettings] = useState<CustomerSettings | null>(null);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [billingEmail, setBillingEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/settings", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load settings.");
      }

      const customer: CustomerSettings = result.settings;

      setSettings(customer);
      setName(customer.name ?? "");
      setContactName(customer.contactName ?? "");
      setPhone(customer.phone ?? "");
      setCountry(customer.country ?? "");
      setBillingEmail(customer.billingEmail ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/customer/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contactName: contactName || null,
          phone: phone || null,
          country: country || null,
          billingEmail: billingEmail || null,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save settings.");
      }

      setSettings((current) =>
        current
          ? { ...current, ...result.settings }
          : result.settings
      );

      setSuccess("Your account settings have been updated successfully.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  function copyCustomerCode() {
    if (settings?.customerCode) {
      navigator.clipboard.writeText(settings.customerCode);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-80 items-center justify-center gap-3 text-sm text-gray-500">
        <RefreshCw size={18} className="animate-spin" />
        Loading account settings...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">
        {error || "Unable to load your account settings."}
        <button
          onClick={fetchSettings}
          className="ml-3 font-semibold underline"
        >
          Try again
        </button>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-[#E8EDF5] bg-white px-3.5 py-2.5 text-sm text-[#07132F] outline-none transition placeholder:text-gray-400 focus:border-[#155EEF] focus:ring-2 focus:ring-blue-100";

  const labelClass = "mb-2 block text-sm font-medium text-[#344054]";

  return (
    <div className="space-y-7 pb-10">
      {/* Heading */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <UserRound size={23} className="text-[#155EEF]" />
            <h1 className="text-2xl font-semibold tracking-tight text-[#07132F]">
              Settings
            </h1>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Manage your profile, billing information and account security.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-4 py-2.5 text-sm font-medium text-[#07132F] hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-green-100 bg-green-50 p-4 text-sm text-green-700">
          <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      {/* Profile */}
      <section className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex items-center gap-3 border-b border-[#E8EDF5] px-5 py-4">
          <div className="rounded-lg bg-blue-50 p-2.5 text-[#155EEF]">
            <UserRound size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Profile information
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Update your account and contact information.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Company / Account name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="Your company name"
            />
          </div>

          <div>
            <label className={labelClass}>Contact person</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              maxLength={100}
              className={inputClass}
              placeholder="Contact person's name"
            />
          </div>

          <div>
            <label className={labelClass}>Registered email</label>
            <div className="relative">
              <Mail
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={settings.email}
                readOnly
                className={`${inputClass} bg-[#F7F9FD] pl-9 text-gray-500`}
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Contact support if you need to change your registered email.
            </p>
          </div>

          <div>
            <label className={labelClass}>Phone number</label>
            <div className="relative">
              <Phone
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={30}
                className={`${inputClass} pl-9`}
                placeholder="+1 555 000 0000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Billing information */}
      <section className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex items-center gap-3 border-b border-[#E8EDF5] px-5 py-4">
          <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600">
            <Building2 size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Billing information
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Keep your billing contact details up to date.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Billing email</label>
            <input
              type="email"
              value={billingEmail}
              onChange={(e) => setBillingEmail(e.target.value)}
              maxLength={254}
              className={inputClass}
              placeholder="billing@company.com"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Email address for billing communications.
            </p>
          </div>

          <div>
            <label className={labelClass}>Country</label>
            <div className="relative">
              <Globe
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={100}
                className={`${inputClass} pl-9`}
                placeholder="Country"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Account information */}
      <section className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex items-center gap-3 border-b border-[#E8EDF5] px-5 py-4">
          <div className="rounded-lg bg-green-50 p-2.5 text-green-600">
            <ShieldCheck size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Account information
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Your Raavvi account identification and status.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
          <div>
            <label className={labelClass}>Customer ID</label>
            <div className="flex gap-2">
              <input
                value={settings.customerCode}
                readOnly
                className={`${inputClass} bg-[#F7F9FD] text-gray-500`}
              />
              <button
                onClick={copyCustomerCode}
                title="Copy customer ID"
                className="rounded-lg border border-[#E8EDF5] px-3 text-gray-500 hover:bg-gray-50 hover:text-[#155EEF]"
              >
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div>
            <label className={labelClass}>Account status</label>
            <div className="flex h-[42px] items-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                {settings.status}
              </span>
            </div>
          </div>

          <div>
            <label className={labelClass}>Registration date</label>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CalendarDays size={16} className="text-gray-400" />
              {new Date(settings.createdAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="overflow-hidden rounded-xl border border-[#E8EDF5] bg-white">
        <div className="flex items-center gap-3 border-b border-[#E8EDF5] px-5 py-4">
          <div className="rounded-lg bg-orange-50 p-2.5 text-orange-600">
            <LockKeyhole size={19} />
          </div>
          <div>
            <h2 className="font-semibold text-[#07132F]">
              Security
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Manage your account password and security.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-medium text-[#07132F]">
              Password
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Change your account password regularly to keep your account secure.
            </p>
          </div>

          <Link
            href="/dashboard/change-password"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-[#E8EDF5] px-4 py-2.5 text-sm font-medium text-[#07132F] transition hover:bg-gray-50"
          >
            Change password
            <ArrowRight size={15} />
          </Link>
        </div>
      </section>

      {/* Save */}
      <div className="flex flex-col justify-end gap-3 sm:flex-row">
        <button
          onClick={fetchSettings}
          disabled={saving}
          className="rounded-lg border border-[#E8EDF5] bg-white px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          Discard changes
        </button>

        <button
          onClick={saveSettings}
          disabled={saving || !name.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#155EEF] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </div>
  );
}
