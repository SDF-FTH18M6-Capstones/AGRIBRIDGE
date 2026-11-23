
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";
import api from "../../services/api.js";
import { safeNext } from "../v1/format";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) return;

    setError("");

    const email = form.email.trim();

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Use the centralized Axios client.
      // The base URL already contains /api, so only use /login here.
      const response = await api.post("/login", {
        email,
        password: form.password,
      });

      const result = response.data;

      const token = result.data?.access_token;
      const user = result.data?.user;

      if (!token || !user) {
        throw new Error(
          "The server returned an incomplete login response."
        );
      }

      login({ token, user });
      const from = location.state?.from;
      const destination = safeNext(new URLSearchParams(location.search).get("next") ||
        (from ? from.pathname + (from.search || "") : null));
      if (destination) { navigate(destination, { replace: true }); return; }
      if (user.capabilities?.admin) navigate("/admin", { replace: true });
      else if (user.capabilities?.["field-officer"]) navigate("/field-officer", { replace: true });
      else window.location.assign("/marketplace");
    } catch (err) {
      setError(
        err.message || "Login failed. Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-[#f7faf6] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="text-3xl font-extrabold tracking-tight text-green-800"
          >
            AgriBridge
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-green-950">
            Welcome back
          </h1>

          <p className="mt-3 text-gray-600">
            Log in to your agricultural marketplace account.
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email address */}
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Email address
              </label>

              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="Enter your email"
                className={inputClass}
                value={form.email}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Enter your password"
                  className={`${inputClass} pr-20`}
                  value={form.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword((previous) => !previous)
                  }
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-800 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm font-semibold text-green-800 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            {/* Error message */}
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* Registration link */}
          <div className="mt-7 border-t border-gray-200 pt-6 text-center">
            <p className="text-sm text-gray-600">
              No account?{" "}
              <Link
                to="/register"
                state={location.state}
                className="font-semibold text-green-800 hover:underline"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-gray-500">
          Connecting farmers and buyers across Kenya.
        </p>
      </div>
    </main>
  );
}
