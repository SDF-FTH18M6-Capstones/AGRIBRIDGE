
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../services/api.js";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("This password reset link is invalid or incomplete.");
      return;
    }

    if (password.length < 8) {
      setError("Your password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await api.post("/reset-password", {
        token,
        new_password: password,
        confirm_new_password: confirmPassword,
      });

      setMessage(
        response.data.message ||
          "Your password has been reset successfully."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to reset your password. Your link may have expired."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-[#f7faf6] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-green-800">
            AgriBridge
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-green-950">
            Reset your password
          </h1>

          <p className="mt-3 text-gray-600">
            Create a new password for your AgriBridge account.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          {!token ? (
            <div className="space-y-5">
              <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                This password reset link is invalid or incomplete. Request a new link to continue.
              </p>

              <Link
                to="/forgot-password"
                className="block text-center font-semibold text-green-800 hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-gray-800">
                  New password
                </label>

                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="At least 8 characters"
                  className={inputClass}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-gray-800">
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  placeholder="Enter your new password again"
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPassword}
                  onChange={(event) => setShowPassword(event.target.checked)}
                  className="accent-green-800"
                />
                Show passwords
              </label>

              {error && (
                <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              {message && (
                <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
                  {message}
                </p>
              )}

              {message ? (
                <Link
                  to="/login"
                  className="block w-full rounded-lg bg-green-800 px-5 py-3 text-center font-semibold text-white hover:bg-green-900"
                >
                  Continue to login
                </Link>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Resetting..." : "Reset password"}
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
