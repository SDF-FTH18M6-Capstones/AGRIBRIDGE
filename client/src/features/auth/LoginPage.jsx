
import { useState } from "react";
import { Link } from "react-router-dom";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function LoginPage() {
  const [form, setForm] = useState({
    identifier: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.identifier.trim()) {
      setError("Please enter your email or phone number.");
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    // Backend login and Auth Context integration
    // will be implemented once the API is available.
    setError(
      "Login is not connected to the backend yet."
    );
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
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email or phone */}
            <div>
              <label
                htmlFor="login-identifier"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Email or phone number
              </label>

              <input
                id="login-identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                required
                placeholder="Enter email or phone number"
                className={inputClass}
                value={form.identifier}
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
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-800 hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Remember me / Forgot password */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                <input
                  name="rememberMe"
                  type="checkbox"
                  checked={form.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 accent-green-700"
                />
                Remember me
              </label>

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
              className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900"
            >
              Login
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
