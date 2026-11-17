
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

function FieldOfficers() {
  const [officers, setOfficers] = useState([]);
  const [visits, setVisits] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");

  const [farmer, setFarmer] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [visitDate, setVisitDate] = useState("");

  const [message, setMessage] = useState("");

  const handleAddOfficer = (event) => {
    event.preventDefault();

    if (!name.trim() || !area.trim()) {
      setMessage("Enter the officer name and area.");
      return;
    }

    setOfficers((previous) => [
      ...previous,
      {
        id: Date.now(),
        name: name.trim(),
        area: area.trim(),
        activeVisits: 0,
        status: "Available",
      },
    ]);

    setName("");
    setArea("");
    setShowForm(false);
    setMessage("Field officer added successfully.");
  };

  const handleAssignVisit = (event) => {
    event.preventDefault();

    if (!farmer.trim() || !selectedOfficer || !visitDate) {
      setMessage("Complete all visit assignment fields.");
      return;
    }

    const officer = officers.find(
      (item) => item.id === Number(selectedOfficer)
    );

    if (!officer) {
      setMessage("Please select a valid field officer.");
      return;
    }

    const newVisit = {
      id: Date.now(),
      farmer: farmer.trim(),
      officer: officer.name,
      visitDate,
      status: "Scheduled",
    };

    setVisits((previous) => [...previous, newVisit]);

    setOfficers((previous) =>
      previous.map((item) =>
        item.id === officer.id
          ? {
              ...item,
              activeVisits: item.activeVisits + 1,
            }
          : item
      )
    );

    setFarmer("");
    setSelectedOfficer("");
    setVisitDate("");
    setMessage("Field visit assigned successfully.");
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-[#1f2933]">
            Field officers
          </h1>

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">

            {/* Officers */}
            <section className="rounded-md border border-gray-300 bg-white p-3">
              <h2 className="mb-3 font-semibold text-[#1f2933]">
                Officers
              </h2>

              <button
                type="button"
                onClick={() => {
                  setShowForm(!showForm);
                  setMessage("");
                }}
                className="mb-4 rounded-md bg-[#12432f] px-4 py-2 text-sm text-white hover:bg-green-900"
              >
                {showForm ? "Cancel" : "Add officer"}
              </button>

              {showForm && (
                <form
                  onSubmit={handleAddOfficer}
                  className="mb-4 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3"
                >
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Officer name
                    </label>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter officer name"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Area
                    </label>
                    <input
                      value={area}
                      onChange={(event) => setArea(event.target.value)}
                      placeholder="Enter assigned area"
                      className="w-full rounded-md border border-gray-300 px-3 py-2"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-md bg-[#12432f] px-4 py-2 text-sm text-white"
                  >
                    Save officer
                  </button>
                </form>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Name", "Area", "Active visits", "Status"].map(
                        (heading) => (
                          <th key={heading} className="px-2 py-3 font-medium">
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {officers.length > 0 ? (
                      officers.map((officer) => (
                        <tr key={officer.id} className="border-b">
                          <td className="px-2 py-3">{officer.name}</td>
                          <td className="px-2 py-3">{officer.area}</td>
                          <td className="px-2 py-3">
                            {officer.activeVisits}
                          </td>
                          <td className="px-2 py-3">{officer.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-2 py-5 text-center text-gray-500">
                          No field officers added yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Assign and track visits */}
            <section className="rounded-md border border-gray-300 bg-white p-3">
              <h2 className="mb-4 font-semibold text-[#1f2933]">
                Assign and track visits
              </h2>

              <form
                onSubmit={handleAssignVisit}
                className="mb-5 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3"
              >
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Farmer
                  </label>
                  <input
                    value={farmer}
                    onChange={(event) => setFarmer(event.target.value)}
                    placeholder="Enter farmer name"
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Officer
                  </label>
                  <select
                    value={selectedOfficer}
                    onChange={(event) => setSelectedOfficer(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Select field officer</option>
                    {officers.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.name} - {officer.area}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Visit date
                  </label>
                  <input
                    type="date"
                    value={visitDate}
                    onChange={(event) => setVisitDate(event.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={officers.length === 0}
                  className="rounded-md bg-[#12432f] px-4 py-2 text-sm text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Assign visit
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      {["Farmer", "Officer", "Visit date", "Report status"].map(
                        (heading) => (
                          <th key={heading} className="px-2 py-3 font-medium">
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>

                  <tbody>
                    {visits.length > 0 ? (
                      visits.map((visit) => (
                        <tr key={visit.id} className="border-b">
                          <td className="px-2 py-3">{visit.farmer}</td>
                          <td className="px-2 py-3">{visit.officer}</td>
                          <td className="px-2 py-3">{visit.visitDate}</td>
                          <td className="px-2 py-3">{visit.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" className="px-2 py-5 text-center text-gray-500">
                          No visits assigned yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 border-t border-gray-200 pt-3 text-xs text-gray-600">
                Report fields: visit date, GPS, photos with consent, crops,
                capacity, observations.
              </p>
            </section>
          </div>

          {message && (
            <p className="mt-4 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {message}
            </p>
          )}
        </main>
      </div>
    </div>
  );
}

export default FieldOfficers;
