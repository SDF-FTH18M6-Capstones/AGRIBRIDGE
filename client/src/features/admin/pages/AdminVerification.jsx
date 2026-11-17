
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const initialApplications = [
  {
    id: 1,
    name: "Demo Farmer",
    applied: "17 Nov 2026",
    county: "Nakuru",
    documents: "Complete",
    officer: "Not assigned",
    status: "Pending",
    nationalId: "Demo ID",
    farmLocation: "Nakuru County",
    crops: "Maize, Tomatoes",
    capacity: "Demo capacity",
    inspectionDate: "Not inspected",
    gps: "Not available",
  },
];

const filterOptions = [
  "All",
  "Pending",
  "Documents rejected",
  "Field visit",
  "Inspection",
  "Approved",
  "Rejected",
];

function AdminVerification() {
  const [applications, setApplications] = useState(initialApplications);
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState("");

  const filteredApplications =
    filter === "All"
      ? applications
      : applications.filter((farmer) => farmer.status === filter);

  // Always get the selected farmer from the latest state
  const selectedFarmer =
    applications.find((farmer) => farmer.id === selectedId) || null;

  // Handle review actions
  const handleAction = (action) => {
    if (!selectedFarmer) {
      setMessage("Please open a farmer application first.");
      return;
    }

    const farmerName = selectedFarmer.name;

    if (action === "Approve" || action === "Reject") {
      const newStatus = action === "Approve" ? "Approved" : "Rejected";

      setApplications((previous) =>
        previous.map((farmer) =>
          farmer.id === selectedId
            ? { ...farmer, status: newStatus }
            : farmer
        )
      );

      setMessage(`${farmerName}'s application has been ${newStatus.toLowerCase()}.`);
      return;
    }

    if (action === "Request more information") {
      setMessage(`More information has been requested from ${farmerName}.`);
      return;
    }

    if (action === "Assign field officer") {
      setApplications((previous) =>
        previous.map((farmer) =>
          farmer.id === selectedId
            ? {
                ...farmer,
                officer: "Demo Field Officer",
                status: "Field visit",
              }
            : farmer
        )
      );

      setMessage(`A demo field officer has been assigned to ${farmerName}.`);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-[#1f2933]">
            Farmer verification review
          </h1>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">

            {/* Application queue */}
            <section className="rounded-md border border-gray-300 bg-white p-3">
              <h2 className="mb-3 font-semibold text-[#1f2933]">
                Application queue
              </h2>

              <div className="mb-4">
                <label
                  htmlFor="verification-filter"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Filter applications by status
                </label>

                <select
                  id="verification-filter"
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value);
                    setSelectedId(null);
                    setMessage("");
                  }}
                  className="w-full rounded-md border border-gray-400 bg-white px-3 py-3 text-sm text-gray-700 focus:border-green-700 focus:outline-none"
                >
                  {filterOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "All" ? "All applications" : option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-800">
                      {[
                        "Farmer",
                        "Applied",
                        "County",
                        "Documents",
                        "Officer",
                        "Status",
                        "Review",
                      ].map((heading) => (
                        <th key={heading} className="px-2 py-3 font-medium">
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredApplications.length > 0 ? (
                      filteredApplications.map((farmer) => (
                        <tr
                          key={farmer.id}
                          className={`border-b border-gray-200 ${
                            selectedId === farmer.id ? "bg-green-50" : ""
                          }`}
                        >
                          <td className="px-2 py-3">{farmer.name}</td>
                          <td className="px-2 py-3">{farmer.applied}</td>
                          <td className="px-2 py-3">{farmer.county}</td>
                          <td className="px-2 py-3">{farmer.documents}</td>
                          <td className="px-2 py-3">{farmer.officer}</td>
                          <td className="px-2 py-3">{farmer.status}</td>
                          <td className="px-2 py-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedId(farmer.id);
                                setMessage("");
                              }}
                              className="cursor-pointer font-medium text-green-800 underline hover:text-green-600"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan="7"
                          className="px-3 py-8 text-center text-gray-500"
                        >
                          No applications found for this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Review panel */}
            <section className="rounded-md border border-gray-300 bg-white p-3">
              <h2 className="mb-3 font-semibold text-[#1f2933]">
                Review panel
              </h2>

              {selectedFarmer ? (
                <div className="mb-4 space-y-2 text-sm text-gray-700">
                  <p><strong>Farmer:</strong> {selectedFarmer.name}</p>
                  <p><strong>National ID:</strong> {selectedFarmer.nationalId}</p>
                  <p><strong>Farm location:</strong> {selectedFarmer.farmLocation}</p>
                  <p><strong>County:</strong> {selectedFarmer.county}</p>
                  <p><strong>Applied:</strong> {selectedFarmer.applied}</p>
                  <p><strong>Documents:</strong> {selectedFarmer.documents}</p>
                  <p><strong>Officer:</strong> {selectedFarmer.officer}</p>
                  <p><strong>Status:</strong> {selectedFarmer.status}</p>
                  <p><strong>Inspection date:</strong> {selectedFarmer.inspectionDate}</p>
                  <p><strong>GPS:</strong> {selectedFarmer.gps}</p>
                  <p><strong>Crops:</strong> {selectedFarmer.crops}</p>
                  <p><strong>Capacity:</strong> {selectedFarmer.capacity}</p>
                </div>
              ) : (
                <p className="mb-4 text-sm leading-relaxed text-gray-600">
                  Select an application using the Open button to view farmer
                  details, ID, farm information, documents and inspection report.
                </p>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  disabled={!selectedFarmer}
                  onClick={() => handleAction("Approve")}
                  className="cursor-pointer rounded-md border border-[#12432f] bg-[#12432f] px-3 py-3 text-sm text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Approve
                </button>

                <button
                  type="button"
                  disabled={!selectedFarmer}
                  onClick={() => handleAction("Reject")}
                  className="cursor-pointer rounded-md border border-[#12432f] bg-white px-3 py-3 text-sm text-[#12432f] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Reject
                </button>

                <button
                  type="button"
                  disabled={!selectedFarmer}
                  onClick={() => handleAction("Request more information")}
                  className="cursor-pointer rounded-md border border-[#12432f] bg-white px-3 py-3 text-sm text-[#12432f] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Request more info
                </button>

                <button
                  type="button"
                  disabled={!selectedFarmer}
                  onClick={() => handleAction("Assign field officer")}
                  className="cursor-pointer rounded-md border border-[#12432f] bg-white px-3 py-3 text-sm text-[#12432f] hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Assign field officer
                </button>
              </div>

              {message && (
                <div
                  role="status"
                  className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
                >
                  {message}
                </div>
              )}

              <p className="mt-3 text-xs text-gray-600">
                Audit history: who reviewed or approved and when.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminVerification;
