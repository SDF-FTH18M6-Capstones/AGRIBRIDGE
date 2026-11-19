
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../services/api.js";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function SignUpPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "",
    acceptTerms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
    setSuccess("");
  }

  function getErrorMessage(error) {
    const data = error.response?.data;

    if (typeof error.message === "string" && error.message !== "Request failed with status code 400") {
      return error.message;
    }

    if (typeof data?.error?.message === "string") {
      return data.error.message;
    }

    if (typeof data?.message === "string") {
      return data.message;
    }

    const fields = data?.error?.fields;

    if (fields && typeof fields === "object") {
      return Object.values(fields).flat().join(" ");
    }

    return "Registration failed. Please try again.";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

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

    if (!form.role) {
      setError("Please select whether you are a farmer or buyer.");
      return;
    }

    if (!form.acceptTerms) {
      setError("Please accept the Terms and Privacy Policy.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.post("/register", {
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone_number: form.phone.replace(/\s+/g, ""),
        password: form.password,
        role: form.role,
      });

      setSuccess(
        response.data.message || "Registration successful! You can now log in."
      );

      setForm({
        fullName: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
        role: "",
        acceptTerms: false,
      });
    } catch (error) {
      setError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
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
            Register with AgriBridge
          </p>

          <p className="mt-2 text-sm text-gray-600">
            Enter your details to get started.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-9">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="signup-name" className="mb-2 block text-sm font-semibold">
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
              <label htmlFor="signup-email" className="mb-2 block text-sm font-semibold">
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
              <label htmlFor="signup-phone" className="mb-2 block text-sm font-semibold">
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
              <label htmlFor="signup-role" className="mb-2 block text-sm font-semibold">
                I want to register as
              </label>

              <select
                id="signup-role"
                name="role"
                required
                className={inputClass}
                value={form.role}
                onChange={handleChange}
              >
                <option value="">Choose your role</option>
                <option value="farmer">Farmer</option>
                <option value="buyer">Buyer</option>
              </select>
            </div>

            <div>
              <label htmlFor="signup-password" className="mb-2 block text-sm font-semibold">
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
              <label htmlFor="signup-confirm" className="mb-2 block text-sm font-semibold">
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

            {success && (
              <div
                role="status"
                className="rounded-lg bg-green-50 p-3 text-sm text-green-800"
              >
                {success}
                <p className="mt-2">
                  <Link to="/login" className="font-bold underline">
                    Go to login
                  </Link>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-800 px-4 py-3 font-bold text-white transition hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-green-800 hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
