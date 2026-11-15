import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
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
      { path: "marketplace", element: <Marketplace /> },
      { path: "about", element: <AboutPage /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
    ],
  },
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