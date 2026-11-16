
import { NavLink } from "react-router-dom";


const navigation = [
  { name: "Dashboard", path: "/dashboard" },
  { name: "Marketplace", path: "/dashboard/marketplace" },
  { name: "My Produce", path: "/dashboard/produce" },
  { name: "Buyer Requests", path: "/dashboard/buyer-requests" },
  { name: "Orders", path: "/dashboard/orders" },
  { name: "Payments", path: "/dashboard/payments" },
  { name: "Settings", path: "/dashboard/settings" },
];


function Sidebar({ isOpen, onClose }) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-green-900 text-white transition-transform duration-300 lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-green-800 px-6">
        <h1 className="text-2xl font-bold tracking-wide">
          AgriBridge
        </h1>

        <button
          onClick={onClose}
          className="text-2xl text-white lg:hidden"
          aria-label="Close sidebar"
        >
          &times;
        </button>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-6">
        <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-wider text-green-300">
          Main Menu
        </p>

        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/dashboard"}
            onClick={onClose}
            className={({ isActive }) =>
              `block rounded-lg px-4 py-3 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-green-900"
                  : "text-green-100 hover:bg-green-800"
              }`
            }
          >
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-green-800 p-5">
        <p className="text-sm font-medium">AgriBridge</p>
        <p className="mt-1 text-xs text-green-300">
          Connecting farmers and buyers
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
