
import { NavLink, Outlet } from "react-router-dom";

const navigation = [
  { label: "Dashboard", path: "/buyer", end: true },
  { label: "Marketplace", path: "/marketplace" },
  { label: "My Orders", path: "/buyer/orders" },
  { label: "Track Orders", path: "/buyer/track-orders" },
  { label: "Payments", path: "/buyer/payments" },
  { label: "My Profile", path: "/buyer/profile" },
];

export default function BuyerLayout() {
  return (
    <div className="min-h-screen bg-[#f7faf6] lg:flex">
      {/* Buyer sidebar */}
      <aside className="w-full bg-green-950 text-white lg:min-h-screen lg:w-64 lg:shrink-0">
        <div className="border-b border-green-800 px-6 py-6">
          <NavLink to="/" className="text-2xl font-bold">
            AgriBridge
          </NavLink>
          <p className="mt-1 text-sm text-green-200">
            Buyer Portal
          </p>
        </div>

        <nav
          aria-label="Buyer navigation"
          className="flex gap-2 overflow-x-auto p-4 lg:flex-col"
        >
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-4 py-3 text-sm font-medium transition ${
                  isActive
                    ? "bg-green-700 text-white"
                    : "text-green-100 hover:bg-green-900"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Buyer main content */}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="font-bold text-green-950">
              Buyer Portal
            </h2>
            <p className="text-sm text-gray-500">
              Manage your agricultural purchases
            </p>
          </div>

          <NavLink
            to="/buyer/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-bold text-green-800"
            aria-label="Buyer profile"
          >
            B
          </NavLink>
        </header>

        <Outlet />
      </div>
    </div>
  );
}
