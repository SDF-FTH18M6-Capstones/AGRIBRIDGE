import { Spinner } from '../../components/ui/Loading';

import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const inputClass =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const response = await api.post("/forgot-password", {
        email: email.trim(),
      });

      setMessage(
        response.data.message ||
          "If an account exists with that email, a password reset link has been sent."
      );
    } catch (err) {
      setError(
        err.message || "Unable to process your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-3xl font-extrabold tracking-tight text-green-800"><img src="/assets/brand/logo.webp" alt="AgriBridge" width="132" height="88" className="inline-block h-20 w-32 object-contain" /></Link>

          <h1 className="mt-6 text-3xl font-bold text-green-950">
            Forgot your password?
          </h1>

          <p className="mt-3 text-gray-600">
            Enter your registered email address and we'll send you a password
            reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="forgot-email" className="mb-2 block text-sm font-semibold text-gray-800">
                Email address
              </label>

              <input
                id="forgot-email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your registered email"
                className={inputClass}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setError("");
                  setMessage("");
                }}
              />
            </div>

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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Spinner label="Sending" /> : "Send reset link"}
            </button>
          </form>

          <div className="mt-7 border-t border-gray-200 pt-6 text-center">
            <Link to="/login" className="text-sm font-semibold text-green-800 hover:underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
