import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";

const menus = {
  farmer: [
    { name: "Dashboard", path: "/dashboard", end: true },
    { name: "My Products", path: "/dashboard/produce" },
    { name: "Orders", path: "/dashboard/orders" },
    { name: "Earnings", path: "/dashboard/payments" },
    { name: "Profile", path: "/dashboard/profile" },
    { name: "Settings", path: "/dashboard/settings" },
  ],
  buyer: [
    { name: "Dashboard", path: "/buyer", end: true },
    { name: "My Orders", path: "/buyer/orders" },
    { name: "Track Orders", path: "/buyer/track-orders" },
    { name: "Payments", path: "/buyer/payments" },
    { name: "Profile", path: "/buyer/profile" },
  ],
};

function linkClass({ isActive }) {
  return `block rounded-lg px-4 py-3 text-sm font-medium transition ${
    isActive
      ? "bg-green-700 text-white"
      : "text-green-100 hover:bg-green-800"
  }`;
}

function Sidebar({ isOpen = false, onClose = () => {}, variant = "farmer" }) {
  const menuItems = menus[variant] ?? menus.farmer;
  const asideRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  function handleKeyDown(event) {
    if (!isOpen || event.key !== "Tab") return;

    const focusable = asideRef.current.querySelectorAll(
      "a[href], button:not([disabled])"
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <aside
      id="app-sidebar"
      ref={asideRef}
      onKeyDown={handleKeyDown}
      className={`fixed inset-y-0 left-0 z-40 w-64 transform overflow-y-auto bg-green-900 p-6 text-white transition-transform duration-200 lg:static lg:shrink-0 lg:translate-x-0 lg:visible ${
        isOpen ? "translate-x-0" : "-translate-x-full invisible"
      }`}
    >
      <div className="mb-6 flex justify-end lg:hidden">
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-green-100 hover:bg-green-800"
          aria-label="Close navigation menu"
        >
          ✕
        </button>
      </div>

      <nav className="flex flex-col gap-2" aria-label="Dashboard navigation">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.end}
            onClick={onClose}
            className={linkClass}
          >
            {item.name}
          </NavLink>
        ))}

        <NavLink to="/login" onClick={onClose} className={linkClass}>
          Logout
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;