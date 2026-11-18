import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const OFFICERS_KEY = "agribridge-field-officers";
const VISITS_KEY = "agribridge-field-visits";
const APPLICATION_KEY = "agribridge-farmer-verification";

function readStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

// Pushes the officer's report into the farmer's application so the
// Admin Verification page can see it.
function syncReportToApplication(visit, feedback) {
  try {
    const application = JSON.parse(
      localStorage.getItem(APPLICATION_KEY) || "null"
    );

    if (!application) return false;

    const sameFarmer =
      String(visit.applicationId) === "farmer-1" ||
      String(application.form?.fullName || "").trim().toLowerCase() ===
        String(visit.farmer || "").trim().toLowerCase();

    if (!sameFarmer) return false;

    const passed =
      feedback.identityVerified === "Yes" &&
      feedback.ownershipVerified !== "No";

    localStorage.setItem(
      APPLICATION_KEY,
      JSON.stringify({
        ...application,
        status: passed ? "field_verified" : "more_information_requested",
        fieldReport: feedback,
        officer: visit.officer,
        reviewReason: passed
          ? application.reviewReason
          : feedback.recommendations,
      })
    );

    window.dispatchEvent(new Event("storage"));
    return true;
  } catch (err) {
    console.error("Could not update the application:", err);
    return false;
  }
}

function FieldOfficers() {
  const [officers, setOfficers] = useState(() => readStorage(OFFICERS_KEY));
  const [visits, setVisits] = useState(() => readStorage(VISITS_KEY));

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");

  const [farmer, setFarmer] = useState("");
  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [visitDate, setVisitDate] = useState("");

  const [reports, setReports] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.setItem(OFFICERS_KEY, JSON.stringify(officers));
  }, [officers]);

  useEffect(() => {
    localStorage.setItem(VISITS_KEY, JSON.stringify(visits));
  }, [visits]);

  useEffect(() => {
    const refreshData = (event) => {
      if (event.key === OFFICERS_KEY || !event.key) {
        setOfficers(readStorage(OFFICERS_KEY));
      }

      if (event.key === VISITS_KEY || !event.key) {
        setVisits(readStorage(VISITS_KEY));
      }
    };

    const refreshOnFocus = () => {
      setOfficers(readStorage(OFFICERS_KEY));
      setVisits(readStorage(VISITS_KEY));
    };

    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const handleAddOfficer = (event) => {
    event.preventDefault();

    if (!name.trim() || !area.trim()) {
      setMessage("Enter the officer name and area.");
      return;
    }

    const newOfficer = {
      id: Date.now(),
      name: name.trim(),
      area: area.trim(),
      activeVisits: 0,
      status: "Available",
    };

    const updated = [...officers, newOfficer];

    setOfficers(updated);
    localStorage.setItem(OFFICERS_KEY, JSON.stringify(updated));

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
      (item) => String(item.id) === String(selectedOfficer)
    );

    if (!officer) {
      setMessage("Please select a valid field officer.");
      return;
    }

    const newVisit = {
      id: Date.now(),
      applicationId: "farmer-1",
      farmer: farmer.trim(),
      officer: officer.name,
      officerId: officer.id,
      visitDate,
      status: "Scheduled",
      feedback: null,
    };

    const updatedVisits = [...visits, newVisit];
    const updatedOfficers = officers.map((item) =>
      item.id === officer.id
        ? {
            ...item,
            activeVisits: (item.activeVisits || 0) + 1,
            status: "Assigned",
          }
        : item
    );

    setVisits(updatedVisits);
    setOfficers(updatedOfficers);

    localStorage.setItem(VISITS_KEY, JSON.stringify(updatedVisits));
    localStorage.setItem(OFFICERS_KEY, JSON.stringify(updatedOfficers));

    setFarmer("");
    setSelectedOfficer("");
    setVisitDate("");
    setMessage("Field visit assigned successfully.");
  };

  const updateReportField = (visitId, field, value) => {
    setReports((previous) => ({
      ...previous,
      [visitId]: {
        ...previous[visitId],
        [field]: value,
      },
    }));
  };

  const handleSubmitReport = (event, visit) => {
    event.preventDefault();

    const report = reports[visit.id] || {};

    if (
      !report.identityVerified ||
      !report.ownershipVerified ||
      !report.farmCondition?.trim() ||
      !report.observations?.trim() ||
      !report.recommendations?.trim()
    ) {
      setMessage("Complete all inspection report fields before submitting.");
      return;
    }

    const feedback = {
      identityVerified: report.identityVerified,
      ownershipVerified: report.ownershipVerified,
      farmCondition: report.farmCondition.trim(),
      observations: report.observations.trim(),
      recommendations: report.recommendations.trim(),
      submittedAt: new Date().toISOString(),
      officer: visit.officer,
    };

    const updatedVisits = visits.map((item) =>
      item.id === visit.id
        ? {
            ...item,
            feedback,
            status: "Report submitted",
          }
        : item
    );

    setVisits(updatedVisits);
    localStorage.setItem(VISITS_KEY, JSON.stringify(updatedVisits));

    const updatedOfficers = officers.map((item) =>
      item.id === visit.officerId
        ? {
            ...item,
            activeVisits: Math.max(0, (item.activeVisits || 0) - 1),
            status:
              Math.max(0, (item.activeVisits || 0) - 1) === 0
                ? "Available"
                : "Assigned",
          }
        : item
    );

    setOfficers(updatedOfficers);
    localStorage.setItem(OFFICERS_KEY, JSON.stringify(updatedOfficers));

    const synced = syncReportToApplication(visit, feedback);

    setMessage(
      synced
        ? "Inspection report submitted and sent to Admin Verification."
        : "Report saved, but no farmer application matches this name. Check that the farmer name is spelled exactly as on the application."
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="space-y-5 p-5 sm:p-6">
          <h1 className="text-2xl font-bold text-[#1f2933]">
            Field officers
          </h1>

          {message && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
            {/* Left Column: Officers Management */}
            <section className="rounded-md border border-gray-300 bg-white p-4">
              <h2 className="mb-3 font-semibold text-[#1f2933]">Officers</h2>

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
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Jane Wanjiku"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Assigned area / county
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Nakuru County"
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    className="rounded-md bg-[#12432f] px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
                  >
                    Save officer
                  </button>
                </form>
              )}

              {officers.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No field officers registered yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-600">
                        <th className="py-2">Name</th>
                        <th className="py-2">Area</th>
                        <th className="py-2">Active visits</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {officers.map((officer) => (
                        <tr key={officer.id} className="border-b">
                          <td className="py-2 font-medium">{officer.name}</td>
                          <td className="py-2">{officer.area}</td>
                          <td className="py-2">{officer.activeVisits || 0}</td>
                          <td className="py-2">{officer.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Right Column: Assign Visit & Field Reports */}
            <section className="space-y-4 rounded-md border border-gray-300 bg-white p-4">
              <h2 className="font-semibold text-[#1f2933]">
                Assign field visit
              </h2>

              <form onSubmit={handleAssignVisit} className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Farmer full name
                  </label>
                  <input
                    type="text"
                    value={farmer}
                    onChange={(e) => setFarmer(e.target.value)}
                    placeholder="Must match farmer application name"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Field officer
                    </label>
                    <select
                      value={selectedOfficer}
                      onChange={(e) => setSelectedOfficer(e.target.value)}
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select officer</option>
                      {officers.map((officer) => (
                        <option key={officer.id} value={officer.id}>
                          {officer.name} ({officer.area})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">
                      Visit date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="rounded-md bg-[#12432f] px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
                >
                  Schedule visit
                </button>
              </form>

              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-[#1f2933]">
                  Scheduled visits & inspection reports
                </h3>

                {visits.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No field visits scheduled yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {visits.map((visit) => {
                      const currentReport = reports[visit.id] || {};

                      return (
                        <div
                          key={visit.id}
                          className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm"
                        >
                          <div className="mb-2 flex flex-wrap justify-between gap-2">
                            <p className="font-semibold text-gray-900">
                              Farmer: {visit.farmer}
                            </p>
                            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                              {visit.status}
                            </span>
                          </div>

                          <p className="text-xs text-gray-600">
                            Officer: {visit.officer} | Date: {visit.visitDate}
                          </p>

                          {visit.feedback ? (
                            <div className="mt-3 space-y-1 rounded border border-blue-200 bg-blue-50 p-2.5 text-xs text-gray-800">
                              <p>
                                <strong>Identity verified:</strong>{" "}
                                {visit.feedback.identityVerified}
                              </p>
                              <p>
                                <strong>Ownership verified:</strong>{" "}
                                {visit.feedback.ownershipVerified}
                              </p>
                              <p>
                                <strong>Farm condition:</strong>{" "}
                                {visit.feedback.farmCondition}
                              </p>
                              <p>
                                <strong>Observations:</strong>{" "}
                                {visit.feedback.observations}
                              </p>
                              <p>
                                <strong>Recommendations:</strong>{" "}
                                {visit.feedback.recommendations}
                              </p>
                            </div>
                          ) : (
                            <form
                              onSubmit={(e) => handleSubmitReport(e, visit)}
                              className="mt-3 space-y-2 border-t pt-3"
                            >
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <select
                                  value={currentReport.identityVerified || ""}
                                  onChange={(e) =>
                                    updateReportField(
                                      visit.id,
                                      "identityVerified",
                                      e.target.value
                                    )
                                  }
                                  className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <option value="">Identity verified?</option>
                                  <option value="Yes">Yes</option>
                                  <option value="No">No</option>
                                </select>

                                <select
                                  value={currentReport.ownershipVerified || ""}
                                  onChange={(e) =>
                                    updateReportField(
                                      visit.id,
                                      "ownershipVerified",
                                      e.target.value
                                    )
                                  }
                                  className="rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                                >
                                  <option value="">Ownership verified?</option>
                                  <option value="Yes">Yes</option>
                                  <option value="Partial">Partial</option>
                                  <option value="No">No</option>
                                </select>
                              </div>

                              <input
                                type="text"
                                placeholder="Farm condition (e.g. Good, active crops)"
                                value={currentReport.farmCondition || ""}
                                onChange={(e) =>
                                  updateReportField(
                                    visit.id,
                                    "farmCondition",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                              />

                              <textarea
                                rows={2}
                                placeholder="Field observations..."
                                value={currentReport.observations || ""}
                                onChange={(e) =>
                                  updateReportField(
                                    visit.id,
                                    "observations",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                              />

                              <textarea
                                rows={2}
                                placeholder="Recommendations for admin..."
                                value={currentReport.recommendations || ""}
                                onChange={(e) =>
                                  updateReportField(
                                    visit.id,
                                    "recommendations",
                                    e.target.value
                                  )
                                }
                                className="w-full rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs"
                              />

                              <button
                                type="submit"
                                className="rounded bg-[#12432f] px-3 py-1.5 text-xs font-medium text-white hover:bg-green-900"
                              >
                                Submit inspection report
                              </button>
                            </form>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}

export default FieldOfficers;