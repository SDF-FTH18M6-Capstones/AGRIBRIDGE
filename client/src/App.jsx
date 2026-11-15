import { Link, NavLink, Outlet } from "react-router-dom";

const navLinks = [
  { to: "/", label: "Home", end: true },
  { to: "/marketplace", label: "Marketplace" },
  { to: "/about", label: "About Us" },
  { to: "/login", label: "Login" },
  { to: "/register", label: "Register" },
];

function navLinkClass({ isActive }) {
  return `hover:opacity-80 ${isActive ? "font-semibold" : ""}`;
}

function App() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="bg-green-700 text-white">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 p-4"
          aria-label="Main navigation"
        >
          <Link to="/" className="text-lg font-bold">
            AgriBridge
          </Link>

          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm md:text-base">
            {navLinks.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} end={link.end} className={navLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 p-6">
        <Outlet />
      </main>

      <footer className="border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 p-6 text-sm text-gray-600 md:flex-row md:items-center md:justify-between">
          <p>Contact: hello@agribridge.example | +254 700 000 000</p>
          <ul className="flex gap-6">
            <li>
              <Link to="/about" className="hover:underline">
                About Us
              </Link>
            </li>
            <li>
              <a
                href="mailto:hello@agribridge.example"
                className="hover:underline"
              >
                Contact
              </a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

export default App;