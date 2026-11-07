
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email address or password.");
        return;
      }

      router.replace("/admin");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen bg-white">
      {/* Left panel */}
      <section className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-[#07132f] p-12 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#155eef]/20 blur-3xl" />
        <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-[#7214ed]/20 blur-3xl" />

        <div className="relative z-10">
          <Image
            src="/raavvi-logo-header.png"
            alt="Raavvi"
            width={170}
            height={55}
            className="h-auto w-40"
            priority
          />
        </div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-blue-200">
            <ShieldCheck size={15} />
            Secure administration
          </div>

          <h1 className="text-5xl font-bold leading-tight tracking-tight">
            Control your
            <span className="block bg-gradient-to-r from-blue-300 to-violet-300 bg-clip-text text-transparent">
              intelligence platform.
            </span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-7 text-blue-100/70">
            Manage customers, API access, usage, pricing and billing
            through one central administration workspace.
          </p>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-blue-100/50">
          <span>Raavvi Administration</span>
          <span>Secure access portal</span>
        </div>
      </section>

      {/* Login panel */}
      <section className="flex flex-1 items-center justify-center bg-[#f7f9fd] px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <Image
              src="/raavvi-logo.png"
              alt="Raavvi"
              width={160}
              height={55}
              className="h-auto w-36"
              priority
            />
          </div>

          <div className="rounded-3xl border border-[#e8edf5] bg-white p-7 shadow-[0_15px_60px_rgba(7,19,47,0.06)] sm:p-9">
            <div className="mb-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#155eef]">
                <LockKeyhole size={22} />
              </div>

              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#155eef]">
                Administrator portal
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#07132f]">
                Welcome back
              </h2>

              <p className="mt-2 text-sm leading-6 text-[#71809a]">
                Sign in using your administrator credentials.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#34415b]">
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={17}
                    className="absolute left-3.5 top-3.5 text-[#9aa6b8]"
                  />

                  <input
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="admin@raavvi.com"
                    className="h-12 w-full rounded-xl border border-[#e8edf5] bg-[#fbfcff] pl-11 pr-4 text-sm text-[#07132f] outline-none transition placeholder:text-[#a5afbf] focus:border-[#155eef] focus:ring-4 focus:ring-blue-50"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-semibold text-[#34415b]">
                    Password
                  </label>
                </div>

                <div className="relative">
                  <LockKeyhole
                    size={17}
                    className="absolute left-3.5 top-3.5 text-[#9aa6b8]"
                  />

                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-12 w-full rounded-xl border border-[#e8edf5] bg-[#fbfcff] pl-11 pr-12 text-sm text-[#07132f] outline-none transition placeholder:text-[#a5afbf] focus:border-[#155eef] focus:ring-4 focus:ring-blue-50"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-[#9aa6b8] hover:text-[#34415b]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#155eef] text-sm font-semibold text-white shadow-lg shadow-blue-500/15 transition hover:bg-[#104dcc] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign in to Raavvi"}
                {!loading && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="mt-7 flex items-center justify-center gap-2 border-t border-[#edf1f6] pt-6 text-xs text-[#8290a6]">
              <ShieldCheck size={14} />
              Protected administrator access
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-[#9aa6b8]">
            © 2026 Raavvi. All rights reserved.
          </p>
        </div>
      </section>
    </main>
  );
}
