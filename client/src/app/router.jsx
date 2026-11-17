
import { createBrowserRouter } from "react-router-dom";

import App from "../App.jsx";

// Authentication and checkout
import AuthPage from "../features/auth/AuthPage.jsx";
import CheckoutPage from "../features/checkout/CheckoutPage.jsx";

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
  Home,
  Marketplace,
  Login,
  Register,
  MyProduce,
  BuyerRequests,
  Orders,
  Payments,
  Settings,
} from "./PlaceholderPages.jsx";

const router = createBrowserRouter([
  // Public pages
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "auth", element: <AuthPage /> },
      { path: "checkout", element: <CheckoutPage /> },
    ],
  },

  // Farmer dashboard
  {
    path: "/dashboard",
    element: <FarmerDashboard />,
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
    element: <FarmerDashboard />,
    children: [
      { index: true, element: <Marketplace /> },
      { path: "orders", element: <Orders /> },
      { path: "track-orders", element: <TrackOrdersPage /> },
      { path: "payments", element: <Payments /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },

  // Admin dashboard
  {
    path: "/admin",
    element: <AdminLayout />,
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




