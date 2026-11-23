import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../../hooks/useAuth";
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { isAuthenticated, user, checking } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (checking) return <p className="p-8" role="status">Checking account access…</p>;
  if (allowedRoles.length && !allowedRoles.some(role => user?.capabilities?.[role])) {
    const setup = allowedRoles.includes("buyer") ? "buyer" : allowedRoles.includes("farmer") ? "farmer" : "";
    return <Navigate to={setup ? `/profile?setup=${setup}&next=${encodeURIComponent(location.pathname + location.search)}` : "/marketplace"} replace />;
  }
  return children;
}
