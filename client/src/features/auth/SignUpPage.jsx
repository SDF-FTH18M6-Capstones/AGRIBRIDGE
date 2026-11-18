
import { useState } from "react";
import { Link } from "react-router-dom";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function SignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
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

    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!form.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!form.phone.trim()) {
      setError("Please enter your M-Pesa phone number.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.acceptTerms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }

    // TODO: Connect to backend registration endpoint.
    // Do not store passwords in browser storage.
    setError(
      "Registration is not connected to the backend yet."
    );
  }

  return (
    <main className="flex min-h-[75vh] items-center justify-center bg-[#f7faf6] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link
            to="/"
            className="text-3xl font-extrabold text-green-800"
          >
            AgriBridge
          </Link>

          <h1 className="mt-6 text-3xl font-bold text-green-950">
            Create your account
          </h1>

          <p className="mt-2 font-medium text-green-700">
            Step 1 of 2: Your details
          </p>

          <p className="mt-2 text-sm text-gray-600">
            You will choose how to use AgriBridge
            after you log in.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="signup-name"
                className="mb-2 block text-sm font-semibold"
              >
                Full name
              </label>

              <input
                id="signup-name"
                name="fullName"
                type="text"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                className={inputClass}
                value={form.fullName}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="signup-email"
                className="mb-2 block text-sm font-semibold"
              >
                Email address
              </label>

              <input
                id="signup-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Enter your email"
                className={inputClass}
                value={form.email}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="signup-phone"
                className="mb-2 block text-sm font-semibold"
              >
                Phone number (M-Pesa)
              </label>

              <input
                id="signup-phone"
                name="phone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="+254 700 000 000"
                className={inputClass}
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div>
              <label
                htmlFor="signup-password"
                className="mb-2 block text-sm font-semibold"
              >
                Password
              </label>

              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  minLength={8}
                  required
                  autoComplete="new-password"
                  placeholder="Minimum 8 characters"
                  className={`${inputClass} pr-20`}
                  value={form.password}
                  onChange={handleChange}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-green-800"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="signup-confirm"
                className="mb-2 block text-sm font-semibold"
              >
                Confirm password
              </label>

              <input
                id="signup-confirm"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Confirm your password"
                className={inputClass}
                value={form.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <label className="flex items-start gap-3 text-sm text-gray-700">
              <input
                type="checkbox"
                name="acceptTerms"
                required
                checked={form.acceptTerms}
                onChange={handleChange}
                className="mt-1 h-4 w-4 accent-green-700"
              />

              <span>
                I accept the Terms and Privacy Policy
              </span>
            </label>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900"
            >
              Create account
            </button>
          </form>

          <div className="mt-6 border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
            Already registered?{" "}
            <Link
              to="/login"
              className="font-semibold text-green-800 hover:underline"
            >
              Login
            </Link>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-gray-500">
          Next: Optional phone verification, then login.
          Admin accounts cannot be created here.
        </p>
      </div>
    </main>
  );
}
