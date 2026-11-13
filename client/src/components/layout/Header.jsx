
function Header({ onMenuClick }) {
  return (
    <header className="flex h-20 items-center justify-between border-b border-gray-200 bg-white px-4 md:px-8">
      
      {/* Mobile menu button */}
      <button
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

      {/* Search bar */}
      <div className="hidden max-w-md flex-1 md:flex">
        <input
          type="search"
          placeholder="Search produce, buyers..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm outline-none focus:border-green-600"
        />
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-5">

        {/* Notifications */}
        <button
          className="relative text-gray-600 hover:text-green-700"
          aria-label="Notifications"
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
              d="M14.25 18.75a2.25 2.25 0 0 1-4.5 0m8.25-2.25H6a2.25 2.25 0 0 1-2.25-2.25v-3a8.25 8.25 0 1 1 16.5 0v3A2.25 2.25 0 0 1 18 16.5Z"
            />
          </svg>

          <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500" />
        </button>

        {/* User profile */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 font-semibold text-green-800">
            A
          </div>

          <div className="hidden sm:block">
            <p className="text-sm font-semibold text-gray-800">
              AgriBridge User
            </p>
            <p className="text-xs text-gray-500">Account</p>
          </div>
        </div>

      </div>
    </header>
  );
}

export default Header;
