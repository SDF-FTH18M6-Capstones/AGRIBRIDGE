
import { createBrowserRouter } from "react-router-dom";

import App from "../App.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";

import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import HomePage from "../features/marketplace/HomePage.jsx";
import AuthPage from "../features/auth/AuthPage.jsx";

import AboutPage from "./AboutPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackOrdersPage from "./TrackOrdersPage.jsx";

import {
  Marketplace,
  Dashboard,
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
      { index: true, element: <HomePage /> },
      { path: "marketplace", element: <Marketplace /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <AuthPage /> },
      { path: "register", element: <AuthPage /> },
      { path: "my-products", element: <ProductManagement /> },
    ],
  },

  // Farmer dashboard
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "marketplace", element: <Marketplace /> },
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
    element: <DashboardLayout variant="buyer" />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "orders", element: <Orders /> },
      { path: "track-orders", element: <TrackOrdersPage /> },
      { path: "payments", element: <Payments /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);

export default router;
