
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
    element: <DashboardLayout variant="buyer" />,
    children: [
      { index: true, element: <Dashboard /> },
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


