
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Activity,
  BarChart3,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Settings,
  CircleHelp,
  ChevronDown,
  Search,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useState } from "react";

const navigation = [
  {
    title: "WORKSPACE",
    items: [
      { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { label: "Usage", href: "/dashboard/usage", icon: BarChart3 },
      { label: "API Keys", href: "/dashboard/api-keys", icon: KeyRound },
      { label: "Usage History", href: "/dashboard/history", icon: Activity },
    ],
  },
  {
    title: "BILLING",
    items: [
      {
        label: "Billing Overview",
        href: "/dashboard/billing",
        icon: CreditCard,
      },
    ],
  },
  {
    title: "PREFERENCES",
    items: [
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const customerName = session?.user?.name || "Customer";
  const customerEmail = session?.user?.email || "";
  const initials = customerName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleSignOut() {
    setSigningOut(true);

    await signOut({
      callbackUrl: "/login",
    });
  }

  return (
    <div className="min-h-screen bg-[#F7F9FD]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-[#07132F]/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[255px] flex-col border-r border-[#E8EDF5] bg-white transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center border-b border-[#E8EDF5] px-6">
          <Image
            src="/raavvi-logo.png"
            alt="Raavvi"
            width={180}
            height={60}
            priority
            className="h-auto w-[155px] object-contain"
          />

          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto text-[#07132F] lg:hidden"
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        {/* Workspace selector */}
        <div className="border-b border-[#E8EDF5] p-4">
          <button className="flex w-full items-center gap-3 rounded-xl border border-[#E8EDF5] bg-[#F7F9FD] p-3 text-left transition hover:bg-[#F0F4FC]">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-sm font-semibold text-white">
              {initials || "U"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#07132F]">
                {customerName}
              </p>
              <p className="truncate text-xs text-[#8A96AA]">
                Account workspace
              </p>
            </div>

            <ChevronDown size={15} className="text-[#8A96AA]" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-7 overflow-y-auto px-4 py-7">
          {navigation.map((group) => (
            <div key={group.title}>
              <p className="mb-3 px-3 text-[10px] font-semibold tracking-[1.5px] text-[#9AA5B8]">
                {group.title}
              </p>

              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" &&
                      pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all duration-150 ${
                        active
                          ? "bg-[#EDF3FF] font-semibold text-[#155EEF]"
                          : "text-[#64728A] hover:bg-[#F1F5FC] hover:text-[#07132F]"
                      }`}
                    >
                      <Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                      {item.label}

                      {active && (
                        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gradient-to-r from-[#155EEF] to-[#7214ED]" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="border-t border-[#E8EDF5] p-4">
          

          {/* Customer account */}
          <div className="mt-3 rounded-xl border border-[#E8EDF5] bg-[#F7F9FD] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-sm font-semibold text-white">
                {initials || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#07132F]">
                  {customerName}
                </p>
                <p className="truncate text-xs text-[#8A96AA]">
                  {customerEmail}
                </p>
              </div>

              <Link
                href="/dashboard/settings"
                aria-label="Account settings"
                className="text-[#8A96AA] transition hover:text-[#155EEF]"
              >
                <Settings size={17} />
              </Link>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-3 flex w-full items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-3 py-2.5 text-xs font-medium text-[#64728A] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
            >
              <LogOut size={15} />
              {signingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="min-h-screen lg:pl-[255px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E8EDF5] bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-[#07132F] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="hidden items-center gap-2 text-sm capitalize text-[#8A96AA] sm:flex">
              <span>Workspace</span>
              <span>/</span>
              <span className="font-semibold text-[#07132F]">
                {pathname.split("/").filter(Boolean).pop() === "dashboard"
                  ? "Overview"
                  : pathname
                      .split("/")
                      .filter(Boolean)
                      .pop()
                      ?.replace(/-/g, " ")}
              </span>
            </div>

            <Link href="/dashboard" className="sm:hidden">
              <Image
                src="/raavvi-logo-header.png"
                alt="Raavvi"
                width={140}
                height={48}
                className="h-9 w-auto object-contain"
              />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button className="hidden h-9 items-center gap-2 rounded-lg border border-[#E8EDF5] bg-white px-3 text-xs text-[#64728A] transition hover:border-[#155EEF]/40 hover:text-[#155EEF] sm:flex">
              <Search size={14} />
              Search
              <span className="rounded border border-[#E8EDF5] px-1.5 py-0.5 text-[10px]">
                ⌘ K
              </span>
            </button>

            <div
              title={customerName}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-sm font-semibold text-white"
            >
              {initials || "U"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="mx-auto max-w-[1450px] p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
