
import { Link, Outlet } from "react-router-dom";

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-green-700 p-4 text-white">
        <div className="mx-auto flex max-w-6xl gap-6">
          <Link to="/">AgriBridge</Link>
          <Link to="/marketplace">Marketplace</Link>
          <Link to="/login">Login</Link>
          <Link to="/register">Register</Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl p-6">
        <Outlet />
      </main>
    </div>
  );
}

export default App;
