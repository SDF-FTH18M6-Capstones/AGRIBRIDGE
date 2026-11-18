
import { useEffect, useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const STORAGE_KEY = "agribridge-farmer-verification";
const OFFICERS_KEY = "agribridge-field-officers";
const VISITS_KEY = "agribridge-field-visits";

const statusLabels = {
  pending_review: "Pending",
  field_visit_scheduled: "Field visit",
  field_verified: "Field verified",
  more_information_requested: "More information requested",
  approved: "Approved",
  rejected: "Rejected",
};

const documentLabels = {
  nationalId: "National ID",
  titleDeed: "Title deed",
  lease: "Lease agreement",
  ownership: "Proof of ownership",
  contract: "Contract",
  coop: "Cooperative document",
};

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
  }
}

function notifyStorage(key) {
  window.dispatchEvent(
    new StorageEvent("storage", { key })
  );
}

function getApplication() {
  const saved = readStorage(STORAGE_KEY, null);

  if (!saved || saved.status === "not_submitted") {
    return null;
  }

  const form = saved.form || {};
  const visits = readStorage(VISITS_KEY, []);

  const inspectionVisit = visits.find(
    (visit) => String(visit.applicationId) === "farmer-1"
  );

  return {
    ...saved,
    id: "farmer-1",
    name: form.fullName || "Unnamed farmer",
    applied: saved.submittedAt
      ? new Date(saved.submittedAt).toLocaleDateString()
      : "Date unavailable",
    county: form.county || "Not provided",
    nationalId: form.nationalId || "Not provided",
    phone: form.phone || "Not provided",
    subCounty: form.subCounty || "Not provided",
    farmName: form.farmName || "Not provided",
    farmLocation: form.farmLocation || "Not provided",
    activities: form.activities || "Not provided",
    crops: form.crops || "Not provided",
    farmSize: form.farmSize || "Not provided",
    relationship: form.relationship || "Not provided",
    documents: saved.docs || {},
    status: saved.status,
    officer: saved.officer || "Not assigned",
    officerId: saved.officerId || "",
    visitDate: saved.visitDate || "",
    reviewReason: saved.reviewReason || "",
    inspectionCompleted: saved.inspectionCompleted === true,
    inspectionVisit: inspectionVisit || null,
  };
}

function AdminVerification() {
  const [application, setApplication] = useState(getApplication);

  const [officers, setOfficers] = useState(() =>
    readStorage(OFFICERS_KEY, [])
  );

  const [filter, setFilter] = useState("All");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [selectedOfficer, setSelectedOfficer] = useState("");
  const [visitDate, setVisitDate] = useState("");

  useEffect(() => {
    const refreshData = (event) => {
      // Also handle custom storage events dispatched in this tab.
      if (
        !event.key ||
        event.key === STORAGE_KEY ||
        event.key === VISITS_KEY
      ) {
        setApplication(getApplication());
      }

      if (
        !event.key ||
        event.key === OFFICERS_KEY
      ) {
        setOfficers(readStorage(OFFICERS_KEY, []));
      }
    };

    const refreshOnFocus = () => {
      setApplication(getApplication());
      setOfficers(readStorage(OFFICERS_KEY, []));
    };

    window.addEventListener("storage", refreshData);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("storage", refreshData);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const status = application?.status || "";

  const visibleApplication =
    application &&
    (filter === "All" || statusLabels[status] === filter)
      ? application
      : null;

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  // Save application review and status.
  const saveReview = (
    newStatus,
    reviewReason = "",
    extraUpdates = {}
  ) => {
    if (!application) return;

    try {
      const saved = readStorage(STORAGE_KEY, null);

      if (!saved) {
        showMessage(
          "The farmer application could not be found.",
          "error"
        );
        return false;
      }

      // A farmer with an assigned field visit must complete
      // inspection before approval.
      if (newStatus === "approved") {
        const visits = readStorage(VISITS_KEY, []);

        const visit = visits.find(
          (item) =>
            String(item.applicationId) === "farmer-1"
        );

        const inspectionRequired =
          Boolean(saved.officer || saved.visitDate || visit) ||
          saved.status === "field_visit_scheduled" ||
          saved.status === "field_verified";

        if (inspectionRequired) {
          if (!visit?.feedback) {
            showMessage(
              "The field officer must submit an inspection report before approval.",
              "error"
            );
            return false;
          }

          if (saved.inspectionCompleted !== true) {
            showMessage(
              "Please complete the inspection before approving this farmer.",
              "error"
            );
            return false;
          }
        }
      }

      const updated = {
        ...saved,
        ...extraUpdates,
        status: newStatus,
        reviewReason,
        reviewedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );

      notifyStorage(STORAGE_KEY);

      setApplication(getApplication());
      setReason("");

      showMessage(
        `${application.name}'s application has been updated to ${
          statusLabels[newStatus]
        }.`
      );

      return true;
    } catch (error) {
      console.error("Could not save review:", error);

      showMessage(
        "Unable to save the review. Please try again.",
        "error"
      );

      return false;
    }
  };

  // Complete inspection.
  const handleCompleteInspection = () => {
    if (!application) return;

    const latestApplication = readStorage(STORAGE_KEY, null);
    const visits = readStorage(VISITS_KEY, []);

    const visit = visits.find(
      (item) =>
        String(item.applicationId) === "farmer-1"
    );

    if (!visit?.feedback) {
      showMessage(
        "The field officer must submit an inspection report first.",
        "error"
      );
      return;
    }

    if (latestApplication?.status === "approved") {
      showMessage(
        "This farmer has already been approved.",
        "error"
      );
      return;
    }

    const feedback = visit.feedback;

    if (
      feedback.identityVerified !== "Yes" ||
      feedback.ownershipVerified === "No"
    ) {
      showMessage(
        "Inspection cannot be completed. The farmer's identity or farm ownership requires further review.",
        "error"
      );
      return;
    }

    saveReview(
      "field_verified",
      latestApplication.reviewReason || "",
      {
        inspectionCompleted: true,
        inspectionCompletedAt: new Date().toISOString(),
        inspectionOfficer: visit.officer,
      }
    );
  };

  const handleApprove = () => {
    saveReview("approved");
  };

  const handleReject = () => {
    if (!reason.trim()) {
      showMessage(
        "Please enter a reason for rejecting the application.",
        "error"
      );
      return;
    }

    saveReview("rejected", reason.trim());
  };

  const handleRequestInformation = () => {
    if (!reason.trim()) {
      showMessage(
        "Please enter the additional information required.",
        "error"
      );
      return;
    }

    saveReview(
      "more_information_requested",
      reason.trim()
    );
  };

  // Assign a field officer.
  const handleAssignOfficer = () => {
    setMessage("");

    if (!application) {
      showMessage(
        "There is no farmer application to assign.",
        "error"
      );
      return;
    }

    if (!selectedOfficer || !visitDate) {
      showMessage(
        "Select a field officer and visit date.",
        "error"
      );
      return;
    }

    const latestOfficers = readStorage(
      OFFICERS_KEY,
      []
    );

    setOfficers(latestOfficers);

    const officer = latestOfficers.find(
      (item) =>
        String(item.id) === String(selectedOfficer)
    );

    if (!officer) {
      showMessage(
        "The selected officer could not be found.",
        "error"
      );
      return;
    }

    try {
      const saved = readStorage(STORAGE_KEY, null);

      if (!saved) {
        showMessage(
          "The farmer application could not be found.",
          "error"
        );
        return;
      }

      const existingVisits = readStorage(
        VISITS_KEY,
        []
      );

      const existingVisit = existingVisits.find(
        (visit) =>
          String(visit.applicationId) === "farmer-1"
      );

      const newVisit = {
        ...(existingVisit || {}),
        id: existingVisit?.id || Date.now(),
        applicationId: "farmer-1",
        farmer: application.name,
        officer: officer.name,
        officerId: officer.id,
        visitDate,
        status: "Scheduled",
        feedback: null,
      };

      const updatedVisits = existingVisit
        ? existingVisits.map((visit) =>
            visit.id === existingVisit.id
              ? newVisit
              : visit
          )
        : [...existingVisits, newVisit];

      localStorage.setItem(
        VISITS_KEY,
        JSON.stringify(updatedVisits)
      );

      const updatedApplication = {
        ...saved,
        status: "field_visit_scheduled",
        officer: officer.name,
        officerId: officer.id,
        visitDate,
        inspectionCompleted: false,
        assignedAt: new Date().toISOString(),
        reviewReason: "",
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedApplication)
      );

      notifyStorage(VISITS_KEY);
      notifyStorage(STORAGE_KEY);

      setApplication(getApplication());
      setSelectedOfficer("");
      setVisitDate("");
      setFilter("All");

      showMessage(
        `${officer.name} has been assigned to ${application.name}. The visit is now visible on the Field Officers page.`
      );
    } catch (error) {
      console.error("Could not assign officer:", error);

      showMessage(
        "Unable to assign the field officer. Please try again.",
        "error"
      );
    }
  };

  // Render uploaded documents.
  const renderDocument = ([key, documentFile]) => {
    const isLegacyFile =
      typeof documentFile === "string";

    const fileName = isLegacyFile
      ? documentFile
      : documentFile?.name || "Uploaded document";

    const fileType = isLegacyFile
      ? ""
      : documentFile?.type || "";

    const dataUrl = isLegacyFile
      ? ""
      : documentFile?.dataUrl || "";

    const isPdf = fileType === "application/pdf";
    const isImage = fileType.startsWith("image/");

    return (
      <div
        key={key}
        className="rounded-lg border border-gray-200 p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-gray-800">
              {documentLabels[key] || key}
            </p>

            <p className="mt-1 break-all text-sm text-gray-500">
              {fileName}
            </p>
          </div>

          {dataUrl && (
            <div className="flex gap-3 text-sm">
              <a
                href={dataUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-green-700 hover:underline"
              >
                Open
              </a>

              <a
                href={dataUrl}
                download={fileName}
                className="font-medium text-blue-700 hover:underline"
              >
                Download
              </a>
            </div>
          )}
        </div>

        {isLegacyFile && (
          <p className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
            This older upload only contains its filename.
            Ask the farmer to upload it again to preview it.
          </p>
        )}

        {!isLegacyFile && !dataUrl && (
          <p className="mt-3 text-sm text-gray-500">
            File preview is unavailable.
          </p>
        )}

        {dataUrl && isPdf && (
          <iframe
            src={dataUrl}
            title={fileName}
            className="mt-4 h-[500px] w-full rounded-lg border border-gray-200"
          />
        )}

        {dataUrl && isImage && (
          <img
            src={dataUrl}
            alt={fileName}
            className="mt-4 max-h-[500px] w-full rounded-lg border border-gray-200 object-contain"
          />
        )}

        {dataUrl && !isPdf && !isImage && (
          <p className="mt-3 text-sm text-orange-700">
            This format cannot be previewed. Please download it.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="space-y-5 p-5 sm:p-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1f2933]">
              Farmer verification review
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Review farmer information, documents and field inspection reports.
            </p>
          </div>

          {/* Messages */}
          {message && (
            <div
              role="status"
              className={`rounded-lg border p-3 text-sm ${
                messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-green-200 bg-green-50 text-green-800"
              }`}
            >
              {message}
            </div>
          )}

          {/* Application queue */}
          <section className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold text-gray-900">
                Application queue
              </h2>

              <select
                value={filter}
                onChange={(event) => {
                  setFilter(event.target.value);
                  setMessage("");
                }}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                {[
                  "All",
                  "Pending",
                  "Field visit",
                  "Field verified",
                  "More information requested",
                  "Approved",
                  "Rejected",
                ].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {visibleApplication ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[650px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-gray-600">
                      <th className="p-3">Farmer</th>
                      <th className="p-3">Applied</th>
                      <th className="p-3">County</th>
                      <th className="p-3">Documents</th>
                      <th className="p-3">Officer</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-medium">
                        {visibleApplication.name}
                      </td>

                      <td className="p-3">
                        {visibleApplication.applied}
                      </td>

                      <td className="p-3">
                        {visibleApplication.county}
                      </td>

                      <td className="p-3">
                        {Object.keys(
                          visibleApplication.documents
                        ).length} uploaded
                      </td>

                      <td className="p-3">
                        {visibleApplication.officer}
                      </td>

                      <td className="p-3">
                        {statusLabels[visibleApplication.status] || "Unknown"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-gray-50 p-6 text-center text-sm text-gray-500">
                {application
                  ? "No applications match this filter."
                  : "No farmer applications have been submitted yet."}
              </p>
            )}
          </section>

          {visibleApplication && (
            <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-lg font-bold text-gray-900">
                Farmer application details
              </h2>

              {/* Farmer information */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  ["Full name", visibleApplication.name],
                  ["National ID", visibleApplication.nationalId],
                  ["Phone", visibleApplication.phone],
                  ["County", visibleApplication.county],
                  ["Sub-county", visibleApplication.subCounty],
                  ["Farm name", visibleApplication.farmName],
                  ["Farm location", visibleApplication.farmLocation],
                  ["Activities", visibleApplication.activities],
                  ["Crops or livestock", visibleApplication.crops],
                  ["Farm size", visibleApplication.farmSize],
                  ["Farm relationship", visibleApplication.relationship],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-lg bg-gray-50 p-3"
                  >
                    <p className="text-xs text-gray-500">
                      {label}
                    </p>

                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Documents */}
              <div>
                <h3 className="mb-3 font-semibold text-gray-900">
                  Supporting documents
                </h3>

                <div className="space-y-4">
                  {Object.entries(
                    visibleApplication.documents
                  ).length > 0 ? (
                    Object.entries(
                      visibleApplication.documents
                    ).map(renderDocument)
                  ) : (
                    <p className="text-sm text-gray-500">
                      No documents uploaded.
                    </p>
                  )}
                </div>
              </div>

              {/* Previous feedback */}
              {visibleApplication.reviewReason && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <strong>Previous review feedback:</strong>{" "}
                  {visibleApplication.reviewReason}
                </div>
              )}

              {/* Assign field officer */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                <h3 className="mb-3 font-semibold text-gray-900">
                  Assign field officer
                </h3>

                {visibleApplication.officer !== "Not assigned" && (
                  <p className="mb-3 text-sm text-green-800">
                    Currently assigned:{" "}
                    <strong>{visibleApplication.officer}</strong>

                    {visibleApplication.visitDate
                      ? ` — Visit date: ${visibleApplication.visitDate}`
                      : ""}
                  </p>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="field-officer"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Select field officer
                    </label>

                    <select
                      id="field-officer"
                      value={selectedOfficer}
                      onChange={(event) =>
                        setSelectedOfficer(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">
                        Choose an officer
                      </option>

                      {officers.map((officer) => (
                        <option
                          key={officer.id}
                          value={String(officer.id)}
                        >
                          {officer.name} - {officer.area}
                        </option>
                      ))}
                    </select>

                    {officers.length === 0 && (
                      <p className="mt-1 text-xs text-red-600">
                        No officers available. Add an officer on the Field Officers page first.
                      </p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="visit-date"
                      className="mb-1 block text-sm font-medium text-gray-700"
                    >
                      Field visit date
                    </label>

                    <input
                      id="visit-date"
                      type="date"
                      value={visitDate}
                      onChange={(event) =>
                        setVisitDate(event.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAssignOfficer}
                  disabled={officers.length === 0}
                  className="mt-4 rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Assign field officer
                </button>
              </div>

              {/* Inspection feedback */}
              <section className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold text-gray-900">
                    Field officer inspection feedback
                  </h3>

                  {visibleApplication.inspectionCompleted && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      Inspection completed
                    </span>
                  )}
                </div>

                {visibleApplication.inspectionVisit?.feedback ? (
                  <div className="space-y-2 text-sm text-gray-800">
                    <p>
                      <strong>Officer:</strong>{" "}
                      {visibleApplication.inspectionVisit.officer}
                    </p>

                    <p>
                      <strong>Visit date:</strong>{" "}
                      {visibleApplication.inspectionVisit.visitDate}
                    </p>

                    <p>
                      <strong>Identity verified:</strong>{" "}
                      {visibleApplication.inspectionVisit.feedback.identityVerified}
                    </p>

                    <p>
                      <strong>Farm ownership verified:</strong>{" "}
                      {visibleApplication.inspectionVisit.feedback.ownershipVerified}
                    </p>

                    <p>
                      <strong>Farm condition:</strong>{" "}
                      {visibleApplication.inspectionVisit.feedback.farmCondition}
                    </p>

                    <p>
                      <strong>Observations:</strong>{" "}
                      {visibleApplication.inspectionVisit.feedback.observations}
                    </p>

                    <p>
                      <strong>Recommendations:</strong>{" "}
                      {visibleApplication.inspectionVisit.feedback.recommendations}
                    </p>

                    <p className="pt-2 text-xs text-gray-500">
                      Submitted:{" "}
                      {visibleApplication.inspectionVisit.feedback.submittedAt
                        ? new Date(
                            visibleApplication.inspectionVisit.feedback.submittedAt
                          ).toLocaleString()
                        : "Date unavailable"}
                    </p>

                    {visibleApplication.inspectionCompletedAt && (
                      <p className="text-xs font-medium text-green-800">
                        Completed:{" "}
                        {new Date(
                          visibleApplication.inspectionCompletedAt
                        ).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {visibleApplication.officer === "Not assigned"
                      ? "No field officer has been assigned yet."
                      : "Waiting for the assigned field officer to submit the inspection report."}
                  </p>
                )}

                {/* Complete Inspection button */}
                <button
                  type="button"
                  onClick={handleCompleteInspection}
                  disabled={
                    !visibleApplication.inspectionVisit?.feedback ||
                    visibleApplication.inspectionCompleted ||
                    status === "approved" ||
                    status === "rejected"
                  }
                  className="mt-4 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {visibleApplication.inspectionCompleted
                    ? "Inspection Completed"
                    : "Complete Inspection"}
                </button>
              </section>

              {/* Admin comments */}
              <div>
                <label
                  htmlFor="review-reason"
                  className="mb-2 block text-sm font-semibold text-gray-800"
                >
                  Review comments or rejection reason
                </label>

                <textarea
                  id="review-reason"
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  rows={3}
                  placeholder="Enter feedback for the farmer..."
                  className="w-full rounded-lg border border-gray-300 p-3 text-sm outline-none focus:border-green-700"
                />
              </div>

              {/* Admin actions */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={
                    status === "approved" ||
                    status === "rejected" ||
                    (
                      Boolean(
                        visibleApplication.officer ||
                        visibleApplication.visitDate ||
                        visibleApplication.inspectionVisit
                      ) &&
                      !visibleApplication.inspectionCompleted
                    )
                  }
                  className="rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Approve Farmer
                </button>

                <button
                  type="button"
                  onClick={handleReject}
                  disabled={
                    status === "approved" ||
                    status === "rejected"
                  }
                  className="rounded-lg border border-red-600 px-5 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Reject
                </button>

                <button
                  type="button"
                  onClick={handleRequestInformation}
                  disabled={
                    status === "approved" ||
                    status === "rejected"
                  }
                  className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Request more information
                </button>
              </div>
            </section>
          )}

          <p className="text-xs text-gray-500">
            Demonstration mode: verification records and field reports
            are stored in this browser's local storage until backend integration.
          </p>
        </main>
      </div>
    </div>
  );
}

export default AdminVerification;

