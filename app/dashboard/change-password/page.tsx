
"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { LockKeyhole, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const { update } = useSession();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 12) {
      setError("Your new password must contain at least 12 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setError("Your new password must be different from your temporary password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/customer/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to change your password.");
        setLoading(false);
        return;
      }

      // Refresh the session so the middleware recognises
      // that the temporary password has been changed.
      const updatedSession = await update({
        mustChangePassword: false,
      });

      if (updatedSession?.user?.mustChangePassword === false) {
        router.replace("/dashboard");
        router.refresh();
        return;
      }

      // If the session could not be refreshed, sign in again.
      await signOut({
        callbackUrl: "/login",
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080B12] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Image
            src="/raavvi-logo-header.png"
            alt="Raavvi"
            width={180}
            height={60}
            priority
            className="h-12 w-auto object-contain mx-auto"
          />

          <div className="mt-8 flex justify-center">
            <div className="rounded-2xl bg-blue-500/10 p-4">
              <ShieldCheck className="h-8 w-8 text-blue-400" />
            </div>
          </div>

          <h1 className="mt-5 text-2xl font-semibold text-white">
            Secure your account
          </h1>

          <p className="mt-2 text-sm text-gray-400">
            Create a new password to continue to your Raavvi dashboard.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#101522] p-8 shadow-2xl">

          <div className="mb-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
            <p className="text-sm font-medium text-blue-300">
              Password update required
            </p>
            <p className="mt-1 text-xs leading-5 text-blue-200/70">
              Your administrator provided a temporary password.
              Please replace it with a secure personal password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Temporary password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

                <input
                  type={showPasswords ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Enter your temporary password"
                  className="w-full rounded-xl border border-white/10 bg-[#080B12] py-3 pl-12 pr-12 text-white placeholder-gray-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                New password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

                <input
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="Create a new password"
                  className="w-full rounded-xl border border-white/10 bg-[#080B12] py-3 pl-12 pr-12 text-white placeholder-gray-600 outline-none focus:border-blue-500"
                />
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Use at least 12 characters.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-300">
                Confirm new password
              </label>

              <div className="relative">
                <LockKeyhole className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />

                <input
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  autoComplete="new-password"
                  placeholder="Confirm your new password"
                  className="w-full rounded-xl border border-white/10 bg-[#080B12] py-3 pl-12 pr-12 text-white placeholder-gray-600 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-white"
            >
              {showPasswords ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>

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
              {loading ? "Updating password..." : "Update password"}
            </button>

          </form>
        </div>

        <p className="mt-6 text-center text-xs text-gray-600">
          Your account security is important to us.
        </p>

      </div>
    </main>
  );
}
