
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

function Farmers() {
  const [search, setSearch] = useState("");
  const [farmers, setFarmers] = useState([]);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [message, setMessage] = useState("");

  const filteredFarmers = farmers.filter((farmer) =>
    `${farmer.name} ${farmer.county} ${farmer.status}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSuspend = (id) => {
    setFarmers((previous) =>
      previous.map((farmer) =>
        farmer.id === id
          ? {
              ...farmer,
              status: farmer.status === "Active" ? "Suspended" : "Active",
            }
          : farmer
      )
    );

    setSelectedFarmer(null);
    setMessage("Farmer account status updated.");
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-[#1f2933]">
            Farmers
          </h1>

          <section className="rounded-md border border-gray-300 bg-white p-3 sm:p-4">
            <h2 className="mb-3 font-semibold text-[#1f2933]">
              Farmer accounts
            </h2>

            {/* Search */}
            <div className="mb-4">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, county, status"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
              />
            </div>

            {/* Farmers table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-800">
                    {[
                      "Farmer",
                      "County",
                      "Verification",
                      "Products",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredFarmers.length > 0 ? (
                    filteredFarmers.map((farmer) => (
                      <tr
                        key={farmer.id}
                        className="border-b border-gray-200 text-gray-700"
                      >
                        <td className="px-3 py-3">{farmer.name}</td>
                        <td className="px-3 py-3">{farmer.county}</td>
                        <td className="px-3 py-3">
                          {farmer.verification}
                        </td>
                        <td className="px-3 py-3">{farmer.products}</td>
                        <td className="px-3 py-3">{farmer.status}</td>
                        <td className="px-3 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedFarmer(farmer)}
                            className="font-medium text-green-800 hover:underline"
                          >
                            View
                          </button>

                          <span className="px-1 text-gray-400">/</span>

                          <button
                            type="button"
                            onClick={() => handleSuspend(farmer.id)}
                            className="font-medium text-red-700 hover:underline"
                          >
                            {farmer.status === "Active"
                              ? "Suspend"
                              : "Activate"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-3 py-8 text-center text-gray-500"
                      >
                        {search
                          ? "No farmers match your search."
                          : "No farmer accounts available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {message && (
              <p className="mt-3 text-sm text-green-800" role="status">
                {message}
              </p>
            )}
          </section>

          {/* Farmer details */}
          {selectedFarmer && (
            <section className="mt-4 rounded-md border border-gray-300 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1f2933]">
                  Farmer details
                </h2>

                <button
                  type="button"
                  onClick={() => setSelectedFarmer(null)}
                  className="text-sm text-gray-600 hover:text-red-700"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p><strong>Name:</strong> {selectedFarmer.name}</p>
                <p><strong>County:</strong> {selectedFarmer.county}</p>
                <p><strong>Verification:</strong> {selectedFarmer.verification}</p>
                <p><strong>Products:</strong> {selectedFarmer.products}</p>
                <p><strong>Status:</strong> {selectedFarmer.status}</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Farmers;
