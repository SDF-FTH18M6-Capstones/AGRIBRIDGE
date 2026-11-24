import { Reviews, AuthPage, LoginPage, SignUpPage, RoleSelectionPage, ForgotPasswordPage, ResetPasswordPage, CheckoutPage, MarketplacePage, AboutPage, ProfilePage, TrackOrdersPage, AdminLayout, AdminDashboard, AdminVerification, FieldOfficers, Buyers, Categories, OrdersAdmin, PaymentsPage, AdminNotifications, Issues, AccountNotifications, AuditHistory, Moderation, AccountShell, AccountSettings, CartPage, Reports, AdminSettings, FarmerLayout, FarmerDashboard, MyProducts, AddProduct, FarmerOrders, FarmerPayments, FarmerNotifications, FarmerSettings, BuyerLayout, BuyerDashboard, BrowseProducts, FarmerProfile, SavedProducts, MyOrders, BuyerPayments, Notifications, BuyerSettings, FieldOfficerDashboard } from './LazyPages';

import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../App.jsx";

// Authentication






import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

// Checkout

// Public pages
import HomePage from "../features/marketplace/HomePage.jsx";




// Admin imports


















// Farmer imports








// Buyer imports









// Field Officer

const router = createBrowserRouter([
  // Public routes
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "marketplace/:id", element: <MarketplacePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <SignUpPage /> },
      { path: "select-role", element: <ProtectedRoute><RoleSelectionPage /></ProtectedRoute> },
      { path: "auth", element: <AuthPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ResetPasswordPage /> },
      { path: "checkout", element: <ProtectedRoute><CheckoutPage /></ProtectedRoute> },
      { path: "cart", element: <ProtectedRoute><CartPage /></ProtectedRoute> },
      { path: "buyer/cart", element: <ProtectedRoute><CartPage /></ProtectedRoute> },
      { path: "my-products", element: <Navigate to="/farmer/products" replace /> },
    ],
  },

  // Admin dashboard
  {
    path: "/admin",
    element: (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "verification", element: <AdminVerification /> },
      { path: "field-officers", element: <FieldOfficers /> },
      { path: "farmers", element: <Moderation farmers /> },
      { path: "buyers", element: <Buyers /> },
      { path: "products", element: <Moderation /> },
      { path: "categories", element: <Categories /> },
      { path: "orders", element: <OrdersAdmin /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "notifications", element: <AdminNotifications /> },
      { path: "disputes", element: <Navigate to="/admin/exceptions" replace /> },
      { path: "exceptions", element: <Issues admin /> },
      { path: "audit", element: <AuditHistory /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <AdminSettings /> },
    ],
  },

  // Farmer dashboard
  {
    path: "/farmer",
    element: (
      <ProtectedRoute allowedRoles={["farmer"]}>
        <FarmerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <FarmerDashboard /> },
      { path: "farm", element: <Navigate to="/profile?setup=farmer" replace /> },
      { path: "verification", element: <Navigate to="/profile?setup=farmer" replace /> },
      { path: "products", element: <MyProducts /> },
      { path: "products/new", element: <AddProduct /> },
      { path: "requests", element: <Navigate to="/farmer" replace /> },
      { path: "issues", element: <Issues /> },
      { path: "orders", element: <FarmerOrders /> },
      { path: "reviews", element: <Reviews farmer /> },
      { path: "payments", element: <FarmerPayments /> },
      { path: "notifications", element: <FarmerNotifications /> },
      { path: "settings", element: <FarmerSettings /> },
    ],
  },

  // Legacy farmer dashboard URL
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["farmer"]}>
        <Navigate to="/farmer" replace />
      </ProtectedRoute>
    ),
  },

  // Buyer dashboard
  {
    path: "/buyer",
    element: (
      <ProtectedRoute allowedRoles={["buyer"]}>
        <BuyerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <BuyerDashboard /> },
      { path: "browse", element: <BrowseProducts /> },
      { path: "farmer/:farmerId", element: <FarmerProfile /> },
      { path: "saved", element: <SavedProducts /> },
      { path: "orders", element: <MyOrders /> },
      { path: "reviews", element: <Reviews /> },
      { path: "requests", element: <Navigate to="/buyer" replace /> },
      { path: "issues", element: <Issues /> },
      { path: "payments", element: <BuyerPayments /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <BuyerSettings /> },
    ],
  },

  // Field Officer dashboard
  {
    path: "/field-officer",
    element: (
      <ProtectedRoute allowedRoles={["field-officer"]}>
        <FieldOfficerDashboard />
      </ProtectedRoute>
    ),
  },

  { path: "/account", element: <ProtectedRoute><AccountShell><AccountSettings /></AccountShell></ProtectedRoute> },
  { path: "/issues", element: <ProtectedRoute><Issues standalone /></ProtectedRoute> },
  { path: "/notifications", element: <ProtectedRoute><AccountNotifications standalone /></ProtectedRoute> },
  // Existing profile and tracking pages
  { path: "/profile", element: <ProtectedRoute><ProfilePage /></ProtectedRoute> },
  { path: "/track-orders", element: <ProtectedRoute><TrackOrdersPage /></ProtectedRoute> },
]);

export default router;
