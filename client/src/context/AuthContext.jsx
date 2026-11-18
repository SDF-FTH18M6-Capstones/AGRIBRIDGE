
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export const AuthContext = createContext(null);

const TOKEN_KEY = "agribridge_auth_token";
const USER_KEY = "agribridge_auth_user";

function clearStoredSession() {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
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

  const logout = useCallback(() => {
    clearStoredSession();
    setSession({ token: null, user: null });
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

  const updateUser = useCallback((updatedUser) => {
    if (
      !updatedUser ||
      typeof updatedUser !== "object" ||
      Array.isArray(updatedUser)
    ) {
      throw new Error("Invalid user profile.");
    }

    setSession((current) => {
      if (!current.token) return current;

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
      logout();
      return;
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

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      login,
      logout,
      updateUser,
    }),
    [token, user, login, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
