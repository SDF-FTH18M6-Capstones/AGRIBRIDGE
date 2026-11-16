import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import { Marketplace, Login, Register } from "./PlaceholderPages.jsx";
import HomePage from "../features/marketplace/HomePage";

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
]);

export default router;
