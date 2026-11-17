
import { createBrowserRouter, Navigate } from "react-router-dom";

// Admin imports
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminVerification from "../features/admin/pages/AdminVerification.jsx";
import FieldOfficers from "../features/admin/pages/FieldOfficers.jsx";
import Farmers from "../features/admin/pages/Farmers.jsx";
import Buyers from "../features/admin/Buyers.jsx";
import Products from "../features/admin/pages/Products.jsx";
import Categories from "../features/admin/pages/Categories.jsx";
import Orders from "../features/admin/pages/Orders.jsx";
import PaymentsPage from "../features/admin/pages/PaymentsPage.jsx";
import Disputes from "../features/admin/pages/Disputes.jsx";
import Reports from "../features/admin/pages/Reports.jsx";
import Settings from "../features/admin/pages/Settings.jsx";

// Farmer layout
import FarmerLayout from "../features/farmer/FarmerLayout.jsx";

// Farmer pages
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

const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin" replace />,
  },

  // ADMIN ROUTES
  {
    path: "/admin",
    element: <AdminDashboard />,
  },
  {
    path: "/admin/verification",
    element: <AdminVerification />,
  },
  {
    path: "/admin/field-officers",
    element: <FieldOfficers />,
  },
  {
    path: "/admin/farmers",
    element: <Farmers />,
  },
  {
    path: "/admin/buyers",
    element: <Buyers />,
  },
  {
    path: "/admin/products",
    element: <Products />,
  },
  {
    path: "/admin/categories",
    element: <Categories />,
  },
  {
    path: "/admin/orders",
    element: <Orders />,
  },
  {
    path: "/admin/payments",
    element: <PaymentsPage />,
  },
  {
    path: "/admin/disputes",
    element: <Disputes />,
  },
  {
    path: "/admin/reports",
    element: <Reports />,
  },
  {
    path: "/admin/settings",
    element: <Settings />,
  },

  // FARMER ROUTES
  {
    path: "/farmer",
    element: <FarmerLayout />,
    children: [
      {
        index: true,
        element: <FarmerDashboard />,
      },
      {
        path: "farm",
        element: <MyFarm />,
      },
      {
        path: "verification",
        element: <Verification />,
      },
      {
        path: "products",
        element: <MyProducts />,
      },
      {
        path: "products/new",
        element: <AddProduct />,
      },
      {
        path: "requests",
        element: <BuyerRequests />,
      },
      {
        path: "orders",
        element: <FarmerOrders />,
      },
      {
        path: "payments",
        element: <FarmerPayments />,
      },
      {
        path: "notifications",
        element: <FarmerNotifications />,
      },
      {
        path: "settings",
        element: <FarmerSettings />,
      },
    ],
  },
]);

export default router;
