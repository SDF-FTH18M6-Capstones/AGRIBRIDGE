
import { useState } from "react";
import AdminSidebar from "./components/AdminSidebar.jsx";
import AdminHeader from "./components/AdminHeader.jsx";

function Buyers() {
  const [search, setSearch] = useState("");
  const [buyers, setBuyers] = useState([]);
  const [selectedBuyer, setSelectedBuyer] = useState(null);
  const [message, setMessage] = useState("");

  const filteredBuyers = buyers.filter((buyer) =>
    `${buyer.name} ${buyer.type}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSuspend = (id) => {
    setBuyers((currentBuyers) =>
      currentBuyers.map((buyer) =>
        buyer.id === id
          ? { ...buyer, status: "Suspended" }
          : buyer
      )
    );

    setSelectedBuyer(null);
    setMessage("Buyer account suspended successfully.");
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-5 text-2xl font-bold text-[#1f2933]">
            Buyers
          </h1>

          <section className="rounded-md border border-gray-300 bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1f2933]">
              Buyer accounts
            </h2>

            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, type"
              aria-label="Search buyer accounts"
              className="mb-4 w-full rounded-md border border-gray-400 bg-white px-3 py-3 text-sm outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[650px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-800">
                    {["Buyer", "Type", "Orders", "Status", "Action"].map(
                      (heading) => (
                        <th
                          key={heading}
                          className="px-3 py-3 font-medium"
                        >
                          {heading}
                        </th>
                      )
                    )}
                  </tr>
                </thead>

                <tbody>
                  {filteredBuyers.length > 0 ? (
                    filteredBuyers.map((buyer) => (
                      <tr
                        key={buyer.id}
                        className="border-b border-gray-200 text-gray-700"
                      >
                        <td className="px-3 py-3">{buyer.name}</td>
                        <td className="px-3 py-3">{buyer.type}</td>
                        <td className="px-3 py-3">{buyer.orders}</td>
                        <td className="px-3 py-3">{buyer.status}</td>

                        <td className="px-3 py-3">
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBuyer(buyer);
                                setMessage("");
                              }}
                              className="font-medium text-green-800 underline hover:text-green-600"
                            >
                              View
                            </button>

                            <button
                              type="button"
                              disabled={buyer.status === "Suspended"}
                              onClick={() => handleSuspend(buyer.id)}
                              className="font-medium text-red-700 underline hover:text-red-500 disabled:opacity-40"
                            >
                              Suspend
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="5"
                        className="px-3 py-8 text-center text-gray-500"
                      >
                        No buyer accounts available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {message && (
              <p className="mt-4 text-sm text-green-700">
                {message}
              </p>
            )}
          </section>

          {selectedBuyer && (
            <section className="mt-4 rounded-md border border-gray-300 bg-white p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-[#1f2933]">
                  Buyer details
                </h2>

                <button
                  type="button"
                  onClick={() => setSelectedBuyer(null)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm text-gray-700">
                <p><strong>Buyer:</strong> {selectedBuyer.name}</p>
                <p><strong>Type:</strong> {selectedBuyer.type}</p>
                <p><strong>Orders:</strong> {selectedBuyer.orders}</p>
                <p><strong>Status:</strong> {selectedBuyer.status}</p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default Buyers;
