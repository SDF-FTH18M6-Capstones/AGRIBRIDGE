
function AdminHeader() {
  return (
    <header className="flex min-h-[58px] items-center justify-end border-b border-gray-200 bg-[#f4f7f2] px-6">
      <div className="flex items-center gap-2 text-xs text-gray-600 sm:gap-3">
        <button className="hover:text-green-800">
          Notifications
        </button>

        <span>·</span>

        <button className="hover:text-green-800">
          Profile
        </button>

        <span>·</span>

        <button className="hover:text-green-800">
          Logout
        </button>
      </div>
    </header>
  );
}

export default AdminHeader;

