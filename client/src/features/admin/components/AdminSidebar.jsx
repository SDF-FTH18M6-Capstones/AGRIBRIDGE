
import { NavLink } from "react-router-dom";

const menuItems = [
  { name: "Overview", path: "/admin" },
  { name: "Farmers", path: "/admin/farmers" },
  { name: "Verification", path: "/admin/verification" },
  { name: "Field officers", path: "/admin/field-officers" },
  { name: "Buyers", path: "/admin/buyers" },
  { name: "Products", path: "/admin/products" },
  { name: "Categories", path: "/admin/categories" },
  { name: "Orders", path: "/admin/orders" },
  { name: "Payments", path: "/admin/payments" },
  { name: "Notifications", path: "/admin/notifications" },
  { name: "Exceptions & refunds", path: "/admin/exceptions" },
  { name: "Audit history", path: "/admin/audit" },
  { name: "Reports", path: "/admin/reports" },
  { name: "Settings", path: "/admin/settings" },
];

function AdminSidebar() {
  return (
    <aside className="w-full md:min-h-screen md:w-[220px] shrink-0 bg-[#12432f] px-5 py-5 text-white">
      <h2 className="mb-7 text-xl font-bold tracking-tight">
        AgriBridge
      </h2>

      <nav className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:flex md:flex-col">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm transition-colors ${
                isActive
                  ? "bg-[#16a34a] font-medium text-white"
                  : "text-white hover:bg-[#1c5b40]"
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

export default AdminSidebar;
