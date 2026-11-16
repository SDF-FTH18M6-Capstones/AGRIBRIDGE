
import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import DashboardLayout from "../components/layout/DashboardLayout.jsx";
import HomePage from "../features/marketplace/HomePage";

import {
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
      { index: true, element: <HomePage /> },
      { path: "marketplace", element: <Marketplace /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "my-products",element: <ProductManagement />,},
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
      { path: "settings", element: <Settings /> },
    ],
  },
]);

export default router;
