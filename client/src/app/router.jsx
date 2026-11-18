
import { createBrowserRouter, Navigate } from "react-router-dom";

import App from "../App.jsx";

// Public pages
import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import MarketplacePage from "../features/marketplace/MarketplacePage.jsx";
import ProductDetailsPage from "../features/marketplace/ProductDetailsPage.jsx";
import AboutPage from "./AboutPage.jsx";

import {
  Home,
  Login,
  Register,
} from "./PlaceholderPages.jsx";

// Admin imports
import AdminLayout from "../features/admin/AdminLayout.jsx";
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminVerification from "../features/admin/pages/AdminVerification.jsx";
import FieldOfficers from "../features/admin/pages/FieldOfficers.jsx";
import Farmers from "../features/admin/pages/Farmers.jsx";
import Buyers from "../features/admin/Buyers.jsx";
import Products from "../features/admin/pages/Products.jsx";
import Categories from "../features/admin/pages/Categories.jsx";
import OrdersAdmin from "../features/admin/pages/Orders.jsx";
import PaymentsPage from "../features/admin/pages/PaymentsPage.jsx";
import AdminNotifications from "../features/admin/pages/AdminNotifications.jsx";
import Disputes from "../features/admin/pages/Disputes.jsx";
import Reports from "../features/admin/pages/Reports.jsx";
import AdminSettings from "../features/admin/pages/Settings.jsx";

// Farmer imports
import FarmerLayout from "../features/farmer/FarmerLayout.jsx";
import FarmerDashboard from "../features/farmer/pages/FarmerDashboard.jsx";
import MyFarm from "../features/farmer/pages/MyFarm.jsx";
import Verification from "../features/farmer/pages/Verification.jsx";
import MyProducts from "../features/farmer/pages/MyProducts.jsx";
import AddProduct from "../features/farmer/pages/AddProduct.jsx";
import BuyerRequests from "../features/farmer/pages/BuyerRequests.jsx";
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
  // Public routes
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "marketplace/:id", element: <ProductDetailsPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "my-products", element: <ProductManagement /> },
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
      { path: "payments", element: <PaymentsPage /> },
      { path: "notifications", element: <AdminNotifications /> },
      { path: "disputes", element: <Disputes /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <AdminSettings /> },
    ],
  },

  // Farmer dashboard
  {
    path: "/farmer",
    element: <FarmerLayout />,
    children: [
      { index: true, element: <FarmerDashboard /> },
      { path: "farm", element: <MyFarm /> },
      { path: "verification", element: <Verification /> },
      { path: "products", element: <MyProducts /> },
      { path: "add-product", element: <AddProduct /> },
      { path: "buyer-requests", element: <BuyerRequests /> },
      { path: "orders", element: <FarmerOrders /> },
      { path: "payments", element: <FarmerPayments /> },
      { path: "notifications", element: <FarmerNotifications /> },
      { path: "settings", element: <FarmerSettings /> },
    ],
  },

  // Keep the older farmer dashboard URL working
  {
    path: "/dashboard",
    element: <Navigate to="/farmer" replace />,
  },

  // Buyer dashboard
  {
    path: "/buyer",
    element: <BuyerLayout />,
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

  // Field Officer dashboard
  {
    path: "/field-officer",
    element: <FieldOfficerDashboard />,
  },
]);

export default router;
