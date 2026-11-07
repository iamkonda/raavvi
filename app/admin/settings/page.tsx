
"use client";

import { useState } from "react";
import {
  Bell,
  Building2,
  Check,
  ChevronDown,
  Globe,
  KeyRound,
  LockKeyhole,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [saved, setSaved] = useState(false);

  const [general, setGeneral] = useState({
    platformName: "Raavvi",
    supportEmail: "support@raavvi.com",
    companyName: "Raavvi Technologies",
    website: "https://raavvi.com",
    defaultCurrency: "USD",
    timezone: "UTC",
    dateFormat: "DD MMM YYYY",
  });

  const [usage, setUsage] = useState({
    defaultRateLimit: "1000",
    maxRequestSize: "10",
    usageAlerts: true,
    enforceRateLimits: true,
    notifyAt80: true,
    notifyAt100: true,
  });

  const [security, setSecurity] = useState({
    keyExpiration: "Never",
    requireHttps: true,
    logApiRequests: true,
    adminTwoFactor: false,
    allowIpRestrictions: true,
  });

  const [notifications, setNotifications] = useState({
    newCustomer: true,
    usageThreshold: true,
    paymentOverdue: true,
    apiErrors: true,
    weeklySummary: false,
    securityAlerts: true,
  });

  const updateGeneral = (
    field: keyof typeof general,
    value: string
  ) => {
    setGeneral((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const updateUsage = (
    field: keyof typeof usage,
    value: string | boolean
  ) => {
    setUsage((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const updateSecurity = (
    field: keyof typeof security,
    value: string | boolean
  ) => {
    setSecurity((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const updateNotifications = (
    field: keyof typeof notifications,
    value: boolean
  ) => {
    setNotifications((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    // Demo only: settings are held in browser memory.
    setSaved(true);
  };

  return (
    <div className="space-y-7 pb-10">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-[#8290a6]">
            <span>Administration</span>
            <span>/</span>
            <span className="text-[#155eef]">Settings</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-[#07132f]">
            Platform Settings
          </h1>

          <p className="mt-1 text-sm text-[#71809a]">
            Configure Raavvi platform preferences and operational controls.
          </p>
        </div>

        <button
          onClick={saveSettings}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#155eef] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#104dcc]"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved (demo)" : "Save changes"}
        </button>
      </div>

      {/* Demo notice */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
        <div className="flex items-start gap-3">
          <Settings2 size={18} className="mt-0.5 text-[#155eef]" />
          <div>
            <p className="text-sm font-semibold text-[#173b77]">
              Demonstration settings
            </p>
            <p className="mt-1 text-xs leading-5 text-[#58709a]">
              Changes currently remain in browser memory only. They are not
              saved to a database and do not change actual API, security or
              billing behaviour.
            </p>
          </div>
        </div>
      </div>

      {/* General settings */}
      <SettingsSection
        icon={<Building2 size={19} />}
        title="General information"
        description="Manage the basic identity and contact information of your platform."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Platform name">
            <input
              value={general.platformName}
              onChange={(e) => updateGeneral("platformName", e.target.value)}
              className="settings-input"
            />
          </Field>

          <Field label="Company name">
            <input
              value={general.companyName}
              onChange={(e) => updateGeneral("companyName", e.target.value)}
              className="settings-input"
            />
          </Field>

          <Field label="Support email">
            <input
              type="email"
              value={general.supportEmail}
              onChange={(e) => updateGeneral("supportEmail", e.target.value)}
              className="settings-input"
            />
          </Field>

          <Field label="Website URL">
            <input
              value={general.website}
              onChange={(e) => updateGeneral("website", e.target.value)}
              className="settings-input"
            />
          </Field>
        </div>
      </SettingsSection>

      {/* Regional preferences */}
      <SettingsSection
        icon={<Globe size={19} />}
        title="Regional preferences"
        description="Set the default currency, timezone and date display format."
      >
        <div className="grid gap-5 md:grid-cols-3">
          <Field label="Default currency">
            <Select
              value={general.defaultCurrency}
              onChange={(value) => updateGeneral("defaultCurrency", value)}
              options={[
                ["USD", "USD - US Dollar"],
                ["EUR", "EUR - Euro"],
                ["GBP", "GBP - British Pound"],
                ["INR", "INR - Indian Rupee"],
              ]}
            />
          </Field>

          <Field label="Timezone">
            <Select
              value={general.timezone}
              onChange={(value) => updateGeneral("timezone", value)}
              options={[
                ["UTC", "UTC"],
                ["Asia/Kolkata", "Asia/Kolkata"],
                ["Europe/London", "Europe/London"],
                ["Europe/Berlin", "Europe/Berlin"],
                ["America/New_York", "America/New_York"],
                ["Asia/Singapore", "Asia/Singapore"],
              ]}
            />
          </Field>

          <Field label="Date format">
            <Select
              value={general.dateFormat}
              onChange={(value) => updateGeneral("dateFormat", value)}
              options={[
                ["DD MMM YYYY", "07 Nov 2026"],
                ["MM/DD/YYYY", "11/07/2026"],
                ["YYYY-MM-DD", "2026-11-07"],
              ]}
            />
          </Field>
        </div>
      </SettingsSection>

      {/* Usage controls */}
      <SettingsSection
        icon={<Zap size={19} />}
        title="Usage and API controls"
        description="Configure demonstration defaults for API usage and rate limiting."
      >
        <div className="grid gap-5 md:grid-cols-2">
          <Field
            label="Default rate limit"
            hint="Requests per minute for a customer, before customer-specific overrides."
          >
            <input
              type="number"
              min="1"
              value={usage.defaultRateLimit}
              onChange={(e) => updateUsage("defaultRateLimit", e.target.value)}
              className="settings-input"
            />
          </Field>

          <Field
            label="Maximum request size"
            hint="Maximum request payload size in megabytes."
          >
            <input
              type="number"
              min="1"
              value={usage.maxRequestSize}
              onChange={(e) => updateUsage("maxRequestSize", e.target.value)}
              className="settings-input"
            />
          </Field>
        </div>

        <div className="mt-6 divide-y divide-[#edf1f6]">
          <ToggleRow
            title="Enforce API rate limits"
            description="Reject requests that exceed configured limits."
            checked={usage.enforceRateLimits}
            onChange={(value) => updateUsage("enforceRateLimits", value)}
          />

          <ToggleRow
            title="Usage monitoring alerts"
            description="Enable alerts when customer usage approaches configured thresholds."
            checked={usage.usageAlerts}
            onChange={(value) => updateUsage("usageAlerts", value)}
          />

          <ToggleRow
            title="80% usage threshold"
            description="Notify when a customer reaches 80% of their configured usage allowance."
            checked={usage.notifyAt80}
            onChange={(value) => updateUsage("notifyAt80", value)}
          />

          <ToggleRow
            title="100% usage threshold"
            description="Notify when a customer reaches their configured usage allowance."
            checked={usage.notifyAt100}
            onChange={(value) => updateUsage("notifyAt100", value)}
          />
        </div>
      </SettingsSection>

      {/* Security */}
      <SettingsSection
        icon={<ShieldCheck size={19} />}
        title="Security preferences"
        description="Review platform security and API access preferences."
      >
        <Field label="Default API key expiration">
          <Select
            value={security.keyExpiration}
            onChange={(value) => updateSecurity("keyExpiration", value)}
            options={[
              ["Never", "No expiration"],
              ["30 days", "30 days"],
              ["90 days", "90 days"],
              ["180 days", "180 days"],
              ["365 days", "365 days"],
            ]}
          />
        </Field>

        <div className="mt-6 divide-y divide-[#edf1f6]">
          <ToggleRow
            title="Require HTTPS"
            description="Require encrypted connections for API requests."
            checked={security.requireHttps}
            onChange={(value) => updateSecurity("requireHttps", value)}
          />

          <ToggleRow
            title="API request logging"
            description="Keep request metadata for usage analysis and troubleshooting."
            checked={security.logApiRequests}
            onChange={(value) => updateSecurity("logApiRequests", value)}
          />

          <ToggleRow
            title="Admin two-factor authentication"
            description="Require an additional authentication factor for administrators."
            checked={security.adminTwoFactor}
            onChange={(value) => updateSecurity("adminTwoFactor", value)}
          />

          <ToggleRow
            title="IP restrictions"
            description="Allow administrators to configure IP-based access restrictions."
            checked={security.allowIpRestrictions}
            onChange={(value) => updateSecurity("allowIpRestrictions", value)}
          />
        </div>
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection
        icon={<Bell size={19} />}
        title="Admin notifications"
        description="Choose which operational events should generate administrator notifications."
      >
        <div className="divide-y divide-[#edf1f6]">
          <ToggleRow
            title="New customer created"
            description="Notify when an administrator creates a customer account."
            checked={notifications.newCustomer}
            onChange={(value) => updateNotifications("newCustomer", value)}
          />

          <ToggleRow
            title="Usage threshold reached"
            description="Notify when customers approach or reach usage limits."
            checked={notifications.usageThreshold}
            onChange={(value) => updateNotifications("usageThreshold", value)}
          />

          <ToggleRow
            title="Overdue billing"
            description="Notify when an outstanding invoice becomes overdue."
            checked={notifications.paymentOverdue}
            onChange={(value) => updateNotifications("paymentOverdue", value)}
          />

          <ToggleRow
            title="API errors"
            description="Notify about elevated API error rates and service failures."
            checked={notifications.apiErrors}
            onChange={(value) => updateNotifications("apiErrors", value)}
          />

          <ToggleRow
            title="Weekly summary"
            description="Receive a weekly summary of customers, usage and billing."
            checked={notifications.weeklySummary}
            onChange={(value) => updateNotifications("weeklySummary", value)}
          />

          <ToggleRow
            title="Security alerts"
            description="Notify about suspicious activity and security events."
            checked={notifications.securityAlerts}
            onChange={(value) => updateNotifications("securityAlerts", value)}
          />
        </div>
      </SettingsSection>

      {/* API configuration notice */}
      <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-violet-50 p-2.5 text-violet-600">
            <KeyRound size={19} />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#07132f]">
              API provider configuration
            </h2>
            <p className="mt-1 text-sm leading-6 text-[#71809a]">
              Provider credentials and upstream API configuration should be
              managed securely through server-side environment variables or
              a dedicated secrets manager. They should never be exposed in
              this browser-facing settings page.
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
              <LockKeyhole size={14} />
              Server-side configuration required
            </div>
          </div>
        </div>
      </section>

      {/* Bottom save */}
      <div className="flex flex-col justify-between gap-3 border-t border-[#e8edf5] pt-5 sm:flex-row sm:items-center">
        <p className="text-xs text-[#8290a6]">
          Remember to save your changes before leaving this page.
        </p>

        <button
          onClick={saveSettings}
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#155eef] px-5 text-sm font-semibold text-white transition hover:bg-[#104dcc]"
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? "Saved (demo)" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#e8edf5] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <div className="rounded-xl bg-[#eef4ff] p-2.5 text-[#155eef]">
          {icon}
        </div>
        <div>
          <h2 className="text-base font-bold text-[#07132f]">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-[#8290a6]">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#34415b]">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-2 text-xs leading-5 text-[#8290a6]">{hint}</p>
      )}
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="settings-input appearance-none pr-9"
      >
        {options.map(([optionValue, label]) => (
          <option key={optionValue} value={optionValue}>
            {label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={15}
        className="pointer-events-none absolute right-3 top-3 text-[#8290a6]"
      />
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-4">
      <div>
        <p className="text-sm font-semibold text-[#34415b]">{title}</p>
        <p className="mt-1 text-xs leading-5 text-[#8290a6]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#155eef]" : "bg-[#d9e0eb]"
        }`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  );
}
