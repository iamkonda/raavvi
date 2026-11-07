
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Activity,
  CreditCard,
  Receipt,
  Settings,
  ShieldCheck,
  Menu,
  X,
  ChevronRight,
  LogOut,
  LoaderCircle,
  SlidersHorizontal,
} from "lucide-react";

const navigation = [
  {
    title: "PLATFORM",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "API Keys", href: "/admin/api-keys", icon: KeyRound },
      { label: "Usage & History", href: "/admin/usage", icon: Activity },
    ],
  },
  {
    title: "FINANCE",
    items: [
      { label: "Pricing", href: "/admin/pricing", icon: SlidersHorizontal },
      { label: "Billing", href: "/admin/billing", icon: CreditCard },
      { label: "Invoices", href: "/admin/invoices", icon: Receipt },
    ],
  },
  {
    title: "CONFIGURATION",
    items: [
      { label: "Platform Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const adminName = session?.user?.name || "Administrator";
  const adminEmail = session?.user?.email || "";
  const adminRole = session?.user?.role?.replace(/_/g, " ") || "ADMIN";
  const initial = adminName.charAt(0).toUpperCase();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await signOut({
        callbackUrl: "/admin/login",
        redirect: true,
      });
    } catch {
      setLoggingOut(false);
      router.replace("/admin/login");
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9FD]">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#07132F]/40 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#E8EDF5] bg-white transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
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
            <X size={20} />
          </button>
        </div>

        <div className="border-b border-[#E8EDF5] p-4">
          <div className="flex items-center gap-3 rounded-xl bg-[#F1F5FC] p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-white">
              <ShieldCheck size={19} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#07132F]">
                Administration
              </p>
              <p className="text-xs text-[#8290A6]">
                Platform control center
              </p>
            </div>
          </div>
        </div>

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
                    (item.href !== "/admin" &&
                      pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition ${
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

        <div className="border-t border-[#E8EDF5] p-4">
          

          <div className="mt-2 rounded-xl border border-[#E8EDF5] bg-[#F7F9FD] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-sm font-semibold text-white">
                {status === "loading" ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  initial
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#07132F]">
                  {adminName}
                </p>
                <p className="truncate text-xs text-[#8290A6]">
                  {adminRole}
                </p>
              </div>
            </div>

            {adminEmail && (
              <p className="mt-2 truncate px-1 text-[11px] text-[#8290A6]">
                {adminEmail}
              </p>
            )}

            <button
              onClick={handleLogout}
              disabled={loggingOut || status === "loading"}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-[#E8EDF5] bg-white text-xs font-semibold text-[#64728A] transition hover:border-red-100 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? (
                <LoaderCircle size={15} className="animate-spin" />
              ) : (
                <LogOut size={15} />
              )}
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </div>
      </aside>

      <div className="min-h-screen lg:pl-[260px]">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-[#E8EDF5] bg-white/95 px-5 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-[#07132F] lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={21} />
            </button>

            <div className="hidden items-center gap-2 text-sm sm:flex">
              <span className="text-[#9AA5B8]">Admin</span>
              <span className="text-[#C1C9D5]">/</span>
              <span className="font-semibold capitalize text-[#07132F]">
                {pathname === "/admin"
                  ? "Overview"
                  : pathname
                      .split("/")
                      .filter(Boolean)
                      .pop()
                      ?.replace(/-/g, " ")}
              </span>
            </div>

            <span className="text-sm font-semibold text-[#07132F] sm:hidden">
              Raavvi Admin
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-[#E8EDF5] bg-[#F7F9FD] px-3 py-2 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-[#64728A]">
                Admin environment
              </span>
            </div>

            <div
              title={adminEmail}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#155EEF] to-[#7214ED] text-sm font-semibold text-white"
            >
              {initial}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] p-5 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f7f9fd] text-sm text-[#71809a]">
          Loading Raavvi Admin...
        </div>
      }
    >
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </Suspense>
  );
}
