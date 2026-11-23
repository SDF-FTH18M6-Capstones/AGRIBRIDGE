import { NavLink } from "react-router-dom";

// These paths match the buyer routes in your router file.
const menuItems = [
  { label: "Overview", to: "/buyer", end: true },
  { label: "Browse products", to: "/buyer/browse" },
  { label: "Saved products", to: "/buyer/saved" },
  { label: "Cart", to: "/buyer/cart" },
  { label: "My orders", to: "/buyer/orders" },
  { label: "Resolution requests", to: "/buyer/issues" },
  { label: "Payments", to: "/buyer/payments" },
  { label: "Reviews", to: "/buyer/reviews" },
  { label: "Notifications", to: "/buyer/notifications" },
  { label: "My profiles", to: "/profile" },
  { label: "Marketplace", to: "/marketplace" },
];

const BuyerSidebar = () => {
  return (
    <aside className="w-full md:min-h-screen md:w-64 shrink-0 bg-[#12432f] px-4 py-8 text-white">
      <h1 className="mb-8 px-3 text-2xl font-bold">AgriBridge</h1>

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:block md:space-y-1">
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            reloadDocument={item.to === "/marketplace"}
            className={({ isActive }) =>
              `block rounded-md px-3 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-green-600 text-white"
                  : "text-white/90 hover:bg-white/10"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default BuyerSidebar;