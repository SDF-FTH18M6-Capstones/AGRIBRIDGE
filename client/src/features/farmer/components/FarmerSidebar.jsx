import { Link, NavLink } from "react-router-dom";

const navigation = [
  { name: "Overview", path: "/farmer", end: true },
  { name: "My farm", path: "/farmer/farm" },
  { name: "Verification", path: "/farmer/verification" },
  { name: "My products", path: "/farmer/products" },
  { name: "Add product", path: "/farmer/products/new" },
  { name: "Buyer requests", path: "/farmer/requests" },
  { name: "Orders", path: "/farmer/orders" },
  { name: "Payments", path: "/farmer/payments" },
  { name: "Notifications", path: "/farmer/notifications" },
  { name: "Settings", path: "/farmer/settings" },
];

function FarmerSidebar() {
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#174832] px-4 py-6 text-white">
      <Link
        to="/farmer"
        className="mb-8 px-3 text-2xl font-bold tracking-tight"
      >
        AgriBridge
      </Link>

      <nav className="flex flex-col gap-1">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-[#16a34a] text-white shadow-sm"
                  : "text-gray-100 hover:bg-white/10 hover:text-white"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default FarmerSidebar;