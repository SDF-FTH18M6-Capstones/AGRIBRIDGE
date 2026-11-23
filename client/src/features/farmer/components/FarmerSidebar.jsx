import { Link, NavLink } from "react-router-dom";

const navigation = [
  { name: "Overview", path: "/farmer", end: true },
  { name: "My profiles", path: "/profile" },
  { name: "My products", path: "/farmer/products" },
  { name: "Add product", path: "/farmer/products/new" },
  { name: "Resolution requests", path: "/farmer/issues" },
  { name: "Orders", path: "/farmer/orders" },
  { name: "Payments", path: "/farmer/payments" },
  { name: "Reviews", path: "/farmer/reviews" },
  { name: "Notifications", path: "/farmer/notifications" },
  { name: "Settings", path: "/farmer/settings" },
  { name: "Marketplace", path: "/marketplace" },
];

function FarmerSidebar() {
  return (
    <aside className="flex w-full md:min-h-screen md:w-64 shrink-0 flex-col bg-[#174832] px-4 py-6 text-white">
      <Link
        to="/farmer"
        className="mb-8 px-3 text-2xl font-bold tracking-tight"
      >
        AgriBridge
      </Link>

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:flex md:flex-col">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            reloadDocument={item.path === "/marketplace"}
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