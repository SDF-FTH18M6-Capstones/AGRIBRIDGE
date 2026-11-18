
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

export default function LoginPage() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
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
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: form.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || "Login failed. Please try again."
        );
      }

      const token = result.data?.access_token;
      const user = result.data?.user;

      if (!token || !user) {
        throw new Error(
          "The server returned an incomplete login response."
        );
      }

      const role = String(user.role ?? "").trim().toLowerCase();

      // Store authentication information in Auth Context.
      login({ token, user });

      // Navigate according to the authenticated user's role.
      if (role === "farmer") {
        navigate("/dashboard", { replace: true });
      } else if (role === "buyer") {
        navigate("/buyer", { replace: true });
      } else if (role === "admin") {
        navigate("/admin", { replace: true });
      } else {
        navigate("/select-role", { replace: true });
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please check that Flask is running."
        );
      } else {
        setError(err.message || "Login failed. Please try again.");
      }
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
