
import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth.js";

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // User must log in first.
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  // Normalize the role for comparison.
  const userRole = String(user?.role ?? "")
    .trim()
    .toLowerCase();

  // Restrict pages to authorized roles.
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(userRole)
  ) {
    return <Navigate to="/" replace />;
  }

  return children;
}
