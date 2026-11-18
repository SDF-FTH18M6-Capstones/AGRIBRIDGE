
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { setAccessToken } from "./utils/authToken";

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

const roleRoutes = {
  admin: "/admin",
  farmer: "/farmer",
  buyer: "/buyer",
  "field-officer": "/field-officer",
  field_officer: "/field-officer",
};

export default function AuthPage() {
  const navigate = useNavigate();

  const [login, setLogin] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [register, setRegister] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    role: "farmer",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/login", {
        email: login.email,
        password: login.password,
      });

      const data = response.data.data;
      const token = data.access_token;
      const user = data.user;

      if (!token) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      setAccessToken(token);

      localStorage.setItem(
        "agribridge_user",
        JSON.stringify(user)
      );

      const role = user.role?.toLowerCase();
      const destination = roleRoutes[role];

      if (!destination) {
        setError("Your account role is not recognized.");
        return;
      }

      navigate(destination);
    } catch (err) {
      setError(
        err.message || "Login failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e) {
    e.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await api.post("/register", {
        full_name: register.fullName,
        email: register.email,
        password: register.password,
        phone_number: register.phone,
        role: register.role,
      });

      setMessage(
        response.data.message || "Registration successful. Please log in."
      );

      setRegister({
        fullName: "",
        phone: "",
        email: "",
        password: "",
        role: "farmer",
      });
    } catch (err) {
      setError(
        err.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="py-8">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          Your marketplace account
        </h1>
        <p className="mt-3 text-gray-600">
          Farmers sell their harvest. Buyers order directly
          from growers.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
        {/* Login form */}
        <section
          id="login"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h2 className="text-2xl font-bold text-green-800">
            Login
          </h2>
          <p className="mt-2 text-gray-600">
            Already have an account?
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="login-email"
                className="mb-2 block font-medium"
              >
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                required
                className={inputClass}
                value={login.email}
                onChange={(e) =>
                  setLogin({ ...login, email: e.target.value })
                }
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="mb-2 block font-medium"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                className={inputClass}
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
                placeholder="Enter your password"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={login.remember}
                  onChange={(e) =>
                    setLogin({
                      ...login,
                      remember: e.target.checked,
                    })
                  }
                  className="accent-green-700"
                />
                Remember me
              </label>

              <span className="text-gray-500">
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Login →"}
            </button>
          </form>

          <p className="mt-8 text-sm text-gray-600">
            New here?{" "}
            <a
              href="#register"
              className="font-semibold text-green-700 hover:underline"
            >
              Create an account →
            </a>
          </p>

          <p className="mt-12 text-sm italic text-gray-500">
            One account, role-based dashboard.
          </p>
        </section>

        {/* Registration form */}
        <section
          id="register"
          className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h2 className="text-2xl font-bold text-green-800">
            Create an account
          </h2>

          <form onSubmit={handleRegister} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="register-name"
                className="mb-2 block font-medium"
              >
                Full name
              </label>
              <input
                id="register-name"
                type="text"
                required
                className={inputClass}
                value={register.fullName}
                onChange={(e) =>
                  setRegister({
                    ...register,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label
                htmlFor="register-phone"
                className="mb-2 block font-medium"
              >
                Phone number
              </label>
              <input
                id="register-phone"
                type="tel"
                required
                className={inputClass}
                value={register.phone}
                onChange={(e) =>
                  setRegister({
                    ...register,
                    phone: e.target.value,
                  })
                }
                placeholder="e.g. +254 700 000 000"
              />
            </div>

            <div>
              <label
                htmlFor="register-email"
                className="mb-2 block font-medium"
              >
                Email address
              </label>
              <input
                id="register-email"
                type="email"
                required
                className={inputClass}
                value={register.email}
                onChange={(e) =>
                  setRegister({
                    ...register,
                    email: e.target.value,
                  })
                }
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label
                htmlFor="register-password"
                className="mb-2 block font-medium"
              >
                Password
              </label>
              <input
                id="register-password"
                type="password"
                minLength={8}
                required
                className={inputClass}
                value={register.password}
                onChange={(e) =>
                  setRegister({
                    ...register,
                    password: e.target.value,
                  })
                }
                placeholder="Minimum 8 characters"
              />
            </div>

            <fieldset>
              <legend className="mb-3 font-medium">
                I am a:
              </legend>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="role"
                    value="farmer"
                    checked={register.role === "farmer"}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        role: e.target.value,
                      })
                    }
                    className="accent-green-700"
                  />
                  Farmer — list and sell produce
                </label>

                <label className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    checked={register.role === "buyer"}
                    onChange={(e) =>
                      setRegister({
                        ...register,
                        role: e.target.value,
                      })
                    }
                    className="accent-green-700"
                  />
                  Buyer — shop and place orders
                </label>
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Create Account →"}
            </button>
          </form>

          <p className="mt-8 text-sm text-gray-600">
            Already registered?{" "}
            <a
              href="#login"
              className="font-semibold text-green-700 hover:underline"
            >
              Use Login
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

