
import { createBrowserRouter } from "react-router-dom";

import App from "../App.jsx";

// Buyer dashboard
import BuyerLayout from "../features/buyer/BuyerLayout.jsx";
import BuyerDashboard from "../features/buyer/BuyerDashboard.jsx";

// Authentication and checkout
import AuthPage from "../features/auth/AuthPage.jsx";
import CheckoutPage from "../features/checkout/CheckoutPage.jsx";

//Login & Signup Page
import LoginPage from "../features/auth/LoginPage.jsx";
import SignUpPage from "../features/auth/SignUpPage.jsx";

//Protected Route
import ProtectedRoute from "../components/auth/ProtectedRoute.jsx";

// Role Selection Page
import RoleSelectionPage from "../features/auth/RoleSelectionPage.jsx";

// Marketplace
import MarketplacePage from "../features/marketplace/MarketplacePage.jsx";

// Farmer dashboard
import FarmerDashboard from "../features/farmer/FarmerDashboard.jsx";


// Admin dashboard
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminLayout from "../features/admin/AdminLayout.jsx";
import FieldOfficers from "../features/admin/pages/FieldOfficers.jsx";
import Farmers from "../features/admin/pages/Farmers.jsx";
import Buyers from "../features/admin/Buyers.jsx";
import Products from "../features/admin/pages/Products.jsx";
import Categories from "../features/admin/pages/Categories.jsx";
import OrdersAdmin from "../features/admin/pages/Orders.jsx";
import AdminVerification from "../features/admin/pages/AdminVerification.jsx";


// Existing pages
import AboutPage from "./AboutPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackOrdersPage from "./TrackOrdersPage.jsx";

import {
  MyProduce,
  BuyerRequests,
  Orders,
  Payments,
  Settings,
} from "./PlaceholderPages.jsx";
import HomePage from "../features/marketplace/HomePage.jsx";

const router = createBrowserRouter([
  // Public pages
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <SignUpPage /> },
      {path: "select-role",element: <RoleSelectionPage />,},
      { path: "auth", element: <AuthPage /> },
      { path: "checkout", element: <CheckoutPage /> },
    ],
  },

  // Farmer dashboard
  {
    path: "/dashboard",
    element:  (
      <ProtectedRoute allowedRoles={["farmer"]}>
        <FarmerDashboard />
      </ProtectedRoute>
      ),
    children: [
      { index: true, element: <MyProduce /> },
      { path: "produce", element: <MyProduce /> },
      { path: "buyer-requests", element: <BuyerRequests /> },
      { path: "orders", element: <Orders /> },
      { path: "payments", element: <Payments /> },
      { path: "profile", element: <ProfilePage /> },
      { path: "settings", element: <Settings /> },
    ],
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
    { path: "orders", element: <Orders /> },
    { path: "track-orders", element: <TrackOrdersPage /> },
    { path: "payments", element: <Payments /> },
    { path: "profile", element: <ProfilePage /> },
  ],
},

  // Admin dashboard
  {
    path: "/admin",
    element:  (
      <ProtectedRoute allowedRoles={["admin"]}>
        <AdminLayout />
      </ProtectedRoute>
      ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "farmers", element: <Farmers /> },
      { path: "buyers", element: <Buyers /> },
      { path: "field-officers", element: <FieldOfficers /> },
      { path: "products", element: <Products /> },
      { path: "categories", element: <Categories /> },
      { path: "orders", element: <OrdersAdmin /> },
      { path: "verification", element: <AdminVerification /> },
    ],
  },
]);

export default router;




