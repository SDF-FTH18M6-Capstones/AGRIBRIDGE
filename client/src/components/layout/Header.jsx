import { Link } from "react-router-dom";

const workspaces = {
  farmer: {
    title: "Farmer Workspace",
    links: [],
    accountLabel: "My Account",
  },
  buyer: {
    title: "Buyer Workspace",
    links: [{ label: "Marketplace", to: "/marketplace" }, { label: "Cart" }],
    accountLabel: "Account",
  },
};

function Header({ onMenuClick, variant = "farmer" }) {
  const workspace = workspaces[variant] ?? workspaces.farmer;

  return (
    <header className="flex h-16 items-center gap-4 border-b border-gray-200 bg-white px-4 md:px-8">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
        aria-label="Open navigation menu"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="h-6 w-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
          />
        </svg>
      </button>

      <Link to="/dashboard" className="text-xl font-bold text-green-800">
        AgriBridge
      </Link>

      <p className="hidden text-sm font-semibold text-gray-700 sm:block md:ml-8">
        {workspace.title}
      </p>

      <nav
        className="hidden items-center gap-6 text-sm font-medium text-gray-600 md:flex"
        aria-label="Workspace links"
      >
        {workspace.links.map((link) =>
          link.to ? (
            <Link key={link.label} to={link.to} className="hover:text-green-700">
              {link.label}
            </Link>
          ) : (
            <button
              key={link.label}
              type="button"
              className="hover:text-green-700"
            >
              {link.label}
            </button>
          )
        )}
      </nav>

      <button
        type="button"
        className="ml-auto flex items-center gap-3 rounded-lg p-1 hover:bg-gray-100"
        aria-label={workspace.accountLabel}
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 font-semibold text-green-800">
          A
        </span>
        <span className="hidden text-sm font-medium text-gray-700 sm:block">
          {workspace.accountLabel}
        </span>
      </button>
    </header>
  );
}

export default Header;