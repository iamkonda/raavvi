
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";

export default function CustomerLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please check your credentials.");
        setLoading(false);
        return;
      }

      if (result?.ok) {
        // Refresh the authenticated session before redirecting.
        const response = await fetch("/api/auth/session");
        const session = await response.json();

        if (session?.user?.role !== "CUSTOMER") {
          setError("This login page is for customers only.");
          setLoading(false);
          return;
        }

        router.replace(
          session.user.mustChangePassword
            ? "/dashboard/change-password"
            : "/dashboard"
        );

        router.refresh();
        return;
      }

      setError("Unable to sign in. Please try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#080B12] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <Image
                src="/raavvi-logo-header.png"
                alt="Raavvi"
                width={180}
                height={60}
                priority
                className="h-12 w-auto object-contain"
            />
          </Link>

          <h1 className="mt-8 text-2xl font-semibold text-white">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Sign in to access your Raavvi customer dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101522] p-8 shadow-2xl">

          <form onSubmit={handleSubmit} className="space-y-6">

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email address
              </label>

              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="email"
                  className="w-full rounded-xl border border-white/10 bg-[#080B12] py-3 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-white/10 bg-[#080B12] py-3 pl-12 pr-12 text-white placeholder-gray-600 outline-none transition focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 py-3.5 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in to your account"}
            </button>

          </form>

          <div className="mt-6 border-t border-white/10 pt-6 text-center">
            <p className="text-xs text-gray-500">
              Your account credentials are provided by your Raavvi administrator.
            </p>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-gray-600">
          © 2026 Raavvi. All rights reserved.
        </p>

      </div>
    </main>
  );
}
