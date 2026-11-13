import { createBrowserRouter } from "react-router-dom";
import App from "../App.jsx";
import ProductManagement from "../features/marketplace/ProductManagement.jsx";
import { Home, Marketplace, Login, Register } from "./PlaceholderPages.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "marketplace", element: <Marketplace /> },
      { path: "login", element: <Login /> },
      { path: "register", element: <Register /> },
      { path: "my-products",element: <ProductManagement />,},
    ],
  },
]);

export default router;
