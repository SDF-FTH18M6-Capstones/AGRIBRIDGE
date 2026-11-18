
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  const { pathname } = useLocation();
  const isRegister = pathname === "/register";

  const [login, setLogin] = useState({
    email: "",
    password: "",
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

      localStorage.setItem("agribridge_user", JSON.stringify(user));

      const role = user.role?.toLowerCase();
      const destination = roleRoutes[role];

      if (!destination) {
        setError("Your account role is not recognized.");
        return;
      }

      navigate(destination);
    } catch (err) {
      setError(err.message || "Login failed. Please check your details.");
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
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-9">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-green-800">
            {isRegister ? "Create an Account" : "Welcome Back"}
          </h1>

          <p className="mt-2 text-gray-600">
            {isRegister
              ? "Join AgriBridge and connect with the agricultural marketplace."
              : "Log in to continue to your AgriBridge account."}
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

        {isRegister ? (
          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label htmlFor="register-name" className="mb-2 block font-medium">
                Full Name
              </label>
              <input
                id="register-name"
                type="text"
                required
                className={inputClass}
                placeholder="Enter your full name"
                value={register.fullName}
                onChange={(e) =>
                  setRegister({ ...register, fullName: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="register-phone" className="mb-2 block font-medium">
                Phone Number
              </label>
              <input
                id="register-phone"
                type="tel"
                required
                className={inputClass}
                placeholder="+254 700 000 000"
                value={register.phone}
                onChange={(e) =>
                  setRegister({ ...register, phone: e.target.value })
                }
              />
            </div>

            <div>
              <label htmlFor="register-email" className="mb-2 block font-medium">
                Email Address
              </label>
              <input
                id="register-email"
                type="email"
                required
                className={inputClass}
                placeholder="Enter your email"
                value={register.email}
                onChange={(e) =>
                  setRegister({ ...register, email: e.target.value })
                }
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
                placeholder="Minimum 8 characters"
                value={register.password}
                onChange={(e) =>
                  setRegister({ ...register, password: e.target.value })
                }
              />
            </div>

            <fieldset>
              <legend className="mb-3 font-medium">I am a:</legend>

              <div className="flex gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="farmer"
                    checked={register.role === "farmer"}
                    onChange={(e) =>
                      setRegister({ ...register, role: e.target.value })
                    }
                    className="accent-green-700"
                  />
                  Farmer
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    checked={register.role === "buyer"}
                    onChange={(e) =>
                      setRegister({ ...register, role: e.target.value })
                    }
                    className="accent-green-700"
                  />
                  Buyer
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
        ) : (
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="mb-2 block font-medium">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                required
                className={inputClass}
                placeholder="Enter your email"
                value={login.email}
                onChange={(e) =>
                  setLogin({ ...login, email: e.target.value })
                }
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
                placeholder="Enter your password"
                value={login.password}
                onChange={(e) =>
                  setLogin({ ...login, password: e.target.value })
                }
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Please wait..." : "Log In →"}
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-gray-200 pt-6 text-center text-sm text-gray-600">
          {isRegister ? (
            <p>
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-green-700 hover:underline"
              >
                Log In
              </Link>
            </p>
          ) : (
            <p>
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-green-700 hover:underline"
              >
                Sign Up
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
