
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { AuthContext } from "./auth-context";
import api from "../services/api";

const TOKEN_KEY = "agribridge_auth_token";
const USER_KEY = "agribridge_auth_user";

function clearStoredSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
  sessionStorage.removeItem("agribridge_pending_checkout");
}

function getTokenExpiry(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = JSON.parse(atob(payload));

    return typeof decoded.exp === "number"
      ? decoded.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function isTokenValid(token) {
  const expiry = getTokenExpiry(token);

  return (
    typeof token === "string" &&
    expiry !== null &&
    Date.now() < expiry
  );
}

function readStoredSession() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!token || !storedUser || !isTokenValid(token)) {
      clearStoredSession();
      return { token: null, user: null };
    }

    const user = JSON.parse(storedUser);

    if (
      !user ||
      typeof user !== "object" ||
      Array.isArray(user)
    ) {
      clearStoredSession();
      return { token: null, user: null };
    }

    return { token, user };
  } catch {
    clearStoredSession();
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const { token, user } = session;
  const [checking, setChecking] = useState(Boolean(session.token));

  const logout = useCallback(() => {
    const activeToken = sessionStorage.getItem(TOKEN_KEY);
    clearStoredSession();
    setSession({ token: null, user: null });
    if (activeToken) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || "/api"}/logout`, {
        method: "POST", headers: { Authorization: `Bearer ${activeToken}` },
      }).catch(() => {});
    }
  }, []);

  const login = useCallback(({ token: newToken, user: newUser }) => {
    if (
      !isTokenValid(newToken) ||
      !newUser ||
      typeof newUser !== "object" ||
      Array.isArray(newUser)
    ) {
      throw new Error("Invalid authentication response.");
    }

    sessionStorage.setItem(TOKEN_KEY, newToken);
    sessionStorage.setItem(
      USER_KEY,
      JSON.stringify(newUser)
    );

    setSession({
      token: newToken,
      user: newUser,
    });
  }, []);

useEffect(() => {
  const handleUnauthorized = () => {
    logout();
  };

  window.addEventListener(
    "agribridge:unauthorized",
    handleUnauthorized
  );

  return () => {
    window.removeEventListener(
      "agribridge:unauthorized",
      handleUnauthorized
    );
  };
}, [logout]);


  const updateUser = useCallback((updatedUser) => {
    if (
      !updatedUser ||
      typeof updatedUser !== "object" ||
      Array.isArray(updatedUser)
    ) {
      throw new Error("Invalid user profile.");
    }

    setSession((current) => {
      if (!current.token || current.user?.user_id !== updatedUser.user_id) return current;

      sessionStorage.setItem(
        USER_KEY,
        JSON.stringify(updatedUser)
      );

      return { ...current, user: updatedUser };
    });
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiry = getTokenExpiry(token);

    if (!expiry || expiry <= Date.now()) {
      const timer = setTimeout(logout, 0);
      return () => clearTimeout(timer);
    }

    const remaining = expiry - Date.now();

    const timer = setTimeout(() => {
      if (!isTokenValid(token)) logout();
    }, Math.min(remaining, 2147483647));

    return () => clearTimeout(timer);
  }, [token, logout]);

  useEffect(() => {
    const checkSession = () => {
      if (token && !isTokenValid(token)) {
        logout();
      }
    };

    window.addEventListener("focus", checkSession);
    document.addEventListener(
      "visibilitychange",
      checkSession
    );

    return () => {
      window.removeEventListener("focus", checkSession);
      document.removeEventListener(
        "visibilitychange",
        checkSession
      );
    };
  }, [token, logout]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const response = await api.get("/profiles/me");
      updateUser(response.data.data);
      return response.data.data;
    } finally { setChecking(false); }
  }, [token, updateUser]);

  useEffect(() => {
    if (!token) return;
    refreshUser().catch(() => {});
    const refresh = () => { if (document.visibilityState === "visible") refreshUser().catch(() => {}); };
    window.addEventListener("focus", refresh);
    const timer = setInterval(refresh, 30000);
    return () => { window.removeEventListener("focus", refresh); clearInterval(timer); };
  }, [token, refreshUser]);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      updateUser,
      checking: Boolean(token && checking),
      refreshUser,
    }),
    [token, user, login, logout, updateUser, checking, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
