
import { useEffect, useState } from "react";

const OFFICERS_KEY = "agribridge-field-officers";
const VISITS_KEY = "agribridge-field-visits";
const SELECTED_OFFICER_KEY = "agribridge-current-field-officer";

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function FieldOfficerDashboard() {
  const [officers, setOfficers] = useState(() =>
    readStorage(OFFICERS_KEY, [])
  );

  const [visits, setVisits] = useState(() =>
    readStorage(VISITS_KEY, [])
  );

  const [selectedOfficerId, setSelectedOfficerId] = useState(
    () => localStorage.getItem(SELECTED_OFFICER_KEY) || ""
  );

  const [activeVisitId, setActiveVisitId] = useState(null);

  const [report, setReport] = useState({
    identityVerified: "Yes",
    ownershipVerified: "Yes",
    farmCondition: "Good",
    observations: "",
    recommendations: "",
  });

  useEffect(() => {
    function refreshData() {
      setOfficers(readStorage(OFFICERS_KEY, []));
      setVisits(readStorage(VISITS_KEY, []));
    }

    window.addEventListener("focus", refreshData);
    window.addEventListener("storage", refreshData);

    return () => {
      window.removeEventListener("focus", refreshData);
      window.removeEventListener("storage", refreshData);
    };
  }, []);

  useEffect(() => {
    if (selectedOfficerId) {
      localStorage.setItem(SELECTED_OFFICER_KEY, selectedOfficerId);
    }
  }, [selectedOfficerId]);

  const selectedOfficer = officers.find(
    (officer) => String(officer.id) === String(selectedOfficerId)
  );

  const assignedVisits = visits.filter(
    (visit) =>
      String(visit.officerId) === String(selectedOfficerId) ||
      (!visit.officerId &&
        selectedOfficer &&
        visit.officer === selectedOfficer.name)
  );

  const pendingVisits = assignedVisits.filter(
    (visit) => !visit.feedback
  );

  const submittedVisits = assignedVisits.filter(
    (visit) => Boolean(visit.feedback)
  );

  function openReport(visit) {
    setActiveVisitId(visit.id);
    setReport({
      identityVerified: "Yes",
      ownershipVerified: "Yes",
      farmCondition: "Good",
      observations: "",
      recommendations: "",
    });
  }

  function updateReport(field, value) {
    setReport((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function submitReport(event) {
    event.preventDefault();

    if (!report.observations.trim() || !report.recommendations.trim()) {
      alert("Please complete the observations and recommendations.");
      return;
    }

    const updatedVisits = visits.map((visit) => {
      if (String(visit.id) !== String(activeVisitId)) {
        return visit;
      }

      return {
        ...visit,
        status: "Report submitted",
        feedback: {
          ...report,
          officerName: selectedOfficer?.name || "",
          submittedAt: new Date().toISOString(),
        },
      };
    });

    localStorage.setItem(VISITS_KEY, JSON.stringify(updatedVisits));
    setVisits(updatedVisits);
    setActiveVisitId(null);

    alert("Inspection report submitted successfully.");
  }

  const activeVisit = assignedVisits.find(
    (visit) => String(visit.id) === String(activeVisitId)
  );

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-green-900 px-6 py-5 text-white shadow">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">AgriBridge</h1>
            <p className="text-sm text-green-100">
              Field Officer Portal
            </p>
          </div>

          <span className="rounded-full bg-green-800 px-4 py-2 text-sm">
            Field Officer Dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <section className="rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
            Welcome, Field Officer
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            View your assigned farm visits and submit inspection reports.
          </p>

          <div className="mt-5 max-w-md">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Select your officer account
            </label>

            <select
              value={selectedOfficerId}
              onChange={(event) => {
                setSelectedOfficerId(event.target.value);
                setActiveVisitId(null);
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-green-700"
            >
              <option value="">Choose your name</option>
              {officers.map((officer) => (
                <option key={officer.id} value={officer.id}>
                  {officer.name} - {officer.area}
                </option>
              ))}
            </select>
          </div>
        </section>

        {!selectedOfficerId && (
          <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-800">
            Select your officer account above to view assigned farm visits.
          </section>
        )}

        {selectedOfficerId && !selectedOfficer && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            This officer account could not be found. Please select an available officer.
          </section>
        )}

        {selectedOfficer && (
          <>
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Assigned visits</p>
                <p className="mt-2 text-3xl font-bold text-gray-800">
                  {assignedVisits.length}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Pending inspections</p>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {pendingVisits.length}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Reports submitted</p>
                <p className="mt-2 text-3xl font-bold text-green-700">
                  {submittedVisits.length}
                </p>
              </div>
            </section>

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xl font-bold text-gray-800">
                My Assigned Farm Visits
              </h2>

              {assignedVisits.length === 0 ? (
                <p className="rounded-lg bg-gray-50 p-5 text-gray-500">
                  You currently have no assigned farm visits.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="p-3">Farmer</th>
                        <th className="p-3">Visit date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {assignedVisits.map((visit) => (
                        <tr key={visit.id} className="border-b">
                          <td className="p-3 font-medium text-gray-800">
                            {visit.farmer || "Farmer"}
                          </td>
                          <td className="p-3">
                            {visit.visitDate || "Not specified"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                visit.feedback
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              {visit.feedback
                                ? "Report submitted"
                                : visit.status || "Scheduled"}
                            </span>
                          </td>
                          <td className="p-3">
                            {visit.feedback ? (
                              <button
                                type="button"
                                onClick={() => setActiveVisitId(visit.id)}
                                className="font-semibold text-green-700 hover:underline"
                              >
                                View report
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => openReport(visit)}
                                className="rounded-lg bg-green-700 px-4 py-2 font-medium text-white hover:bg-green-800"
                              >
                                Complete inspection
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {activeVisit && (
              <section className="rounded-xl bg-white p-6 shadow-sm">
                {activeVisit.feedback ? (
                  <>
                    <h2 className="text-xl font-bold text-gray-800">
                      Submitted Inspection Report
                    </h2>
                    <div className="mt-4 space-y-3 text-sm text-gray-700">
                      <p><strong>Farmer:</strong> {activeVisit.farmer}</p>
                      <p><strong>Identity verified:</strong> {activeVisit.feedback.identityVerified}</p>
                      <p><strong>Ownership verified:</strong> {activeVisit.feedback.ownershipVerified}</p>
                      <p><strong>Farm condition:</strong> {activeVisit.feedback.farmCondition}</p>
                      <p><strong>Observations:</strong> {activeVisit.feedback.observations}</p>
                      <p><strong>Recommendations:</strong> {activeVisit.feedback.recommendations}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-800">
                      Farm Inspection Form
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Farmer: {activeVisit.farmer || "Farmer"}
                    </p>

                    <form onSubmit={submitReport} className="mt-6 space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Is the farmer's identity verified?
                          </label>
                          <select
                            value={report.identityVerified}
                            onChange={(e) => updateReport("identityVerified", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-3"
                          >
                            <option>Yes</option>
                            <option>No</option>
                            <option>Needs further checking</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            Is farm ownership verified?
                          </label>
                          <select
                            value={report.ownershipVerified}
                            onChange={(e) => updateReport("ownershipVerified", e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-3"
                          >
                            <option>Yes</option>
                            <option>No</option>
                            <option>Needs further checking</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Farm condition
                        </label>
                        <select
                          value={report.farmCondition}
                          onChange={(e) => updateReport("farmCondition", e.target.value)}
                          className="w-full rounded-lg border border-gray-300 p-3"
                        >
                          <option>Good</option>
                          <option>Fair</option>
                          <option>Poor</option>
                          <option>Not inspected</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Inspection observations
                        </label>
                        <textarea
                          required
                          rows="4"
                          value={report.observations}
                          onChange={(e) => updateReport("observations", e.target.value)}
                          placeholder="Describe what you observed during the farm visit..."
                          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-700"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          Recommendations
                        </label>
                        <textarea
                          required
                          rows="4"
                          value={report.recommendations}
                          onChange={(e) => updateReport("recommendations", e.target.value)}
                          placeholder="Give your recommendations to the admin..."
                          className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-green-700"
                        />
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          className="rounded-lg bg-green-700 px-6 py-3 font-semibold text-white hover:bg-green-800"
                        >
                          Submit inspection report
                        </button>

                        <button
                          type="button"
                          onClick={() => setActiveVisitId(null)}
                          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default FieldOfficerDashboard;
