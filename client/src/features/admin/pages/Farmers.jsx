import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const STORAGE_KEY = "agribridge-farmer-verification";

function readFarmers() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved || saved.status === "not_submitted") {
      return [];
    }

    const form = saved.form || {};
    return [
      {
        id: "farmer-1",
        fullName: form.fullName || "Unnamed farmer",
        county: form.county || "Not provided",
        verification: saved.officer && saved.officer !== "Not assigned" ? saved.officer : "Pending inspection",
        products: form.crops || "Not provided",
        status: saved.status || "pending_review",
      },
    ];
  } catch (error) {
    console.error("Could not load farmer accounts:", error);
    return [];
  }
}

const statusLabels = {
  pending_review: "Pending",
  field_visit_scheduled: "Field visit",
  field_verified: "Inspection",
  more_information_requested: "Info requested",
  approved: "Approved",
  rejected: "Rejected",
};

function Farmers() {
  const [farmers, setFarmers] = useState(readFarmers);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refreshFarmers = (event) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        setFarmers(readFarmers());
      }
    };

    window.addEventListener("storage", refreshFarmers);
    window.addEventListener("focus", () => setFarmers(readFarmers()));

    return () => {
      window.removeEventListener("storage", refreshFarmers);
    };
  }, []);

  const filteredFarmers = farmers.filter((farmer) => {
    const query = search.toLowerCase();
    return (
      farmer.fullName.toLowerCase().includes(query) ||
      farmer.county.toLowerCase().includes(query) ||
      farmer.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="space-y-5 p-5 sm:p-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2933]">Farmers</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage registered and approved farmer accounts.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-semibold text-gray-900">Farmer accounts</h2>
              <input
                type="text"
                placeholder="Search name, county, status"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-700"
              />
            </div>

            {filteredFarmers.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">
                No farmer accounts available.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b text-gray-600">
                    <tr>
                      <th className="p-3">Farmer</th>
                      <th className="p-3">County</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Products</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredFarmers.map((farmer) => (
                      <tr key={farmer.id} className="hover:bg-gray-50">
                        <td className="p-3 font-medium text-gray-900">
                          {farmer.fullName}
                        </td>
                        <td className="p-3 text-gray-700">{farmer.county}</td>
                        <td className="p-3 text-gray-700">{farmer.verification}</td>
                        <td className="p-3 text-gray-700">{farmer.products}</td>
                        <td className="p-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              farmer.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {statusLabels[farmer.status] || farmer.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => alert(`Viewing details for ${farmer.fullName}`)}
                            className="font-medium text-green-700 hover:underline"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Farmers;