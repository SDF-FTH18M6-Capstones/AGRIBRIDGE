
import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App.jsx";

// Authentication
import AuthPage from "../features/auth/AuthPage.jsx";
import LoginPage from "../features/auth/LoginPage.jsx";
import SignUpPage from "../features/auth/SignUpPage.jsx";
import RoleSelectionPage from "../features/auth/RoleSelectionPage.jsx";
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

// Checkout
import CheckoutPage from "../features/checkout/CheckoutPage.jsx";

// Marketplace
import MarketplacePage from "../features/marketplace/MarketplacePage.jsx";
import HomePage from "../features/marketplace/HomePage.jsx";

// Existing pages
import AboutPage from "./AboutPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackOrdersPage from "./TrackOrdersPage.jsx";

// Placeholder pages
import {
  MyProduce,
  BuyerRequests as PlaceholderBuyerRequests,
  Orders,
  Payments,
  Settings as PlaceholderSettings,
} from "./PlaceholderPages.jsx";

// Admin imports
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminLayout from "../features/admin/AdminLayout.jsx";
import AdminVerification from "../features/admin/pages/AdminVerification.jsx";
import FieldOfficers from "../features/admin/pages/FieldOfficers.jsx";
import Farmers from "../features/admin/pages/Farmers.jsx";
import Buyers from "../features/admin/Buyers.jsx";
import Products from "../features/admin/pages/Products.jsx";
import Categories from "../features/admin/pages/Categories.jsx";
import OrdersAdmin from "../features/admin/pages/Orders.jsx";

// Farmer imports
import FarmerLayout from "../features/farmer/FarmerLayout.jsx";
import FarmerDashboard from "../features/farmer/pages/FarmerDashboard.jsx";
import MyFarm from "../features/farmer/pages/MyFarm.jsx";
import Verification from "../features/farmer/pages/Verification.jsx";
import MyProducts from "../features/farmer/pages/MyProducts.jsx";
import AddProduct from "../features/farmer/pages/AddProduct.jsx";
import FarmerBuyerRequests from "../features/farmer/pages/BuyerRequests.jsx";
import FarmerOrders from "../features/farmer/pages/FarmerOrders.jsx";
import FarmerPayments from "../features/farmer/pages/FarmerPayments.jsx";
import FarmerNotifications from "../features/farmer/pages/FarmerNotifications.jsx";
import FarmerSettings from "../features/farmer/pages/FarmerSettings.jsx";

// Buyer imports
import BuyerLayout from "../features/buyer/components/BuyerLayout.jsx";
import BuyerDashboard from "../features/buyer/pages/BuyerDashboard.jsx";
import BrowseProducts from "../features/buyer/pages/BrowseProducts.jsx";
import FarmerProfile from "../features/buyer/pages/FarmerProfile.jsx";
import SavedProducts from "../features/buyer/pages/SavedProducts.jsx";
import Cart from "../features/buyer/pages/Cart.jsx";
import MyOrders from "../features/buyer/pages/MyOrders.jsx";
import BuyingRequests from "../features/buyer/pages/BuyingRequests.jsx";
import BuyerPayments from "../features/buyer/pages/Payments.jsx";
import Notifications from "../features/buyer/pages/Notifications.jsx";
import BuyerSettings from "../features/buyer/pages/Settings.jsx";

// Field Officer
import FieldOfficerDashboard from "../features/field-officer/FieldOfficerDashboard.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <SignUpPage /> },
      { path: "select-role", element: <RoleSelectionPage /> },
      { path: "auth", element: <AuthPage /> },
      { path: "checkout", element: <CheckoutPage /> },
    ],
  },

  // Admin routes
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
      { path: "farmers", element: <Farmers /> },
      { path: "buyers", element: <Buyers /> },
      { path: "products", element: <Products /> },
      { path: "categories", element: <Categories /> },
      { path: "orders", element: <OrdersAdmin /> },
    ],
  },

  // Farmer routes
  {
    path: "/farmer",
    element: (
      <ProtectedRoute allowedRoles={["farmer"]}>
        <FarmerLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <FarmerDashboard /> },
      { path: "farm", element: <MyFarm /> },
      { path: "verification", element: <Verification /> },
      { path: "products", element: <MyProducts /> },
      { path: "products/new", element: <AddProduct /> },
      { path: "requests", element: <FarmerBuyerRequests /> },
      { path: "orders", element: <FarmerOrders /> },
      { path: "payments", element: <FarmerPayments /> },
      { path: "notifications", element: <FarmerNotifications /> },
      { path: "settings", element: <FarmerSettings /> },
    ],
  },

  // Buyer routes
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
      { path: "cart", element: <Cart /> },
      { path: "orders", element: <MyOrders /> },
      { path: "requests", element: <BuyingRequests /> },
      { path: "payments", element: <BuyerPayments /> },
      { path: "notifications", element: <Notifications /> },
      { path: "settings", element: <BuyerSettings /> },
    ],
  },

  // Field Officer route
  {
    path: "/field-officer",
    element: (
      <ProtectedRoute allowedRoles={["field-officer"]}>
        <FieldOfficerDashboard />
      </ProtectedRoute>
    ),
  },

  // Legacy dashboard routes from development
  {
    path: "/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["farmer"]}>
        <FarmerDashboard />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <MyProduce /> },
      { path: "produce", element: <MyProduce /> },
      { path: "buyer-requests", element: <PlaceholderBuyerRequests /> },
      { path: "orders", element: <Orders /> },
      { path: "payments", element: <Payments /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "settings", element: <PlaceholderSettings /> },
    ],
  },

  { path: "/profile", element: <ProfilePage /> },
  { path: "/track-orders", element: <TrackOrdersPage /> },
]);

export default router;

