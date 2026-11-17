
import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import MarketplacePage from "../features/marketplace/MarketplacePage.jsx";
import ProductDetailsPage from "../features/marketplace/ProductDetailsPage.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import AboutPage from "./AboutPage.jsx";
import ProfilePage from "./ProfilePage.jsx";
import TrackOrdersPage from "./TrackOrdersPage.jsx";

import {
  Home,
  Marketplace,
  Login,
  Register,
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
      { index: true, element: <Home /> },
      { path: "marketplace", element: <MarketplacePage /> },
      { path: "marketplace/:id", element: <ProductDetailsPage /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "my-products", element: <ProductManagement /> },
    ],
  },

  // Farmer dashboard
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


