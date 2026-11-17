import { useState } from "react";

const STORAGE_KEY = "agribridge-farmer-verification";
const PROFILE_KEY = "agribridge-farmer-profile"; // saved by My farm

const steps = [
  "Documents submitted",
  "Pending admin review",
  "Field visit scheduled",
  "Field verification",
  "Approved",
];

// How many tracker steps are complete for each status
const stepsReached = {
  not_submitted: 0,
  rejected: 0,
  pending_review: 2,
  field_visit_scheduled: 3,
  field_verified: 4,
  approved: 5,
};

const statusText = {
  not_submitted: "Not submitted",
  rejected: "Documents rejected (corrections needed)",
  pending_review: "Pending admin review",
  field_visit_scheduled: "Field visit scheduled",
  field_verified: "Field verification complete",
  approved: "Approved",
};

const nextStatus = {
  pending_review: "field_visit_scheduled",
  field_visit_scheduled: "field_verified",
  field_verified: "approved",
};

const documents = [
  { key: "nationalId", label: "National ID", hint: "Front and back", required: true },
  { key: "titleDeed", label: "Land title deed", hint: "Not everyone owns land" },
  { key: "lease", label: "Land lease agreement", hint: "If you lease" },
  { key: "ownership", label: "Farm ownership or management agreement" },
  { key: "contract", label: "Contract farming agreement" },
  { key: "coop", label: "Cooperative membership evidence" },
];

const emptyForm = {
  fullName: "",
  nationalId: "",
  phone: "",
  county: "",
  subCounty: "",
  farmName: "",
  farmLocation: "",
  activities: "",
  crops: "",
  farmSize: "",
  relationship: "Owner",
};

const loadSaved = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);

    // First visit: prefill from the My farm profile if there is one
    const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    return {
      status: "not_submitted",
      docs: {},
      form: profile
        ? {
            ...emptyForm,
            fullName: profile.fullName || "",
            phone: profile.phone || "",
            county: profile.county || "",
            farmName: profile.farmName || "",
            farmLocation: profile.location || "",
            crops: profile.crops || "",
            farmSize: profile.farmSize || "",
          }
        : emptyForm,
    };
  } catch {
    return { status: "not_submitted", docs: {}, form: emptyForm };
  }
};

function FarmerVerification() {
  const [saved] = useState(loadSaved);
  const [status, setStatus] = useState(saved.status);
  const [form, setForm] = useState(saved.form);
  const [docs, setDocs] = useState(saved.docs); // { nationalId: "file-name.pdf" }
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const editable = status === "not_submitted" || status === "rejected";
  const reached = stepsReached[status] ?? 0;

  const persist = (nextStatus, nextForm = form, nextDocs = docs) => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ status: nextStatus, form: nextForm, docs: nextDocs })
    );
  };

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value });
    setError("");
  };

  const handleFile = (key, event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Sample version stores only the file name.
    // When your API is ready, send the File itself with FormData.
    setDocs({ ...docs, [key]: file.name });
    setError("");
  };

  const removeFile = (key) => {
    const { [key]: removed, ...rest } = docs;
    setDocs(rest);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!docs.nationalId) {
      setError("Upload your National ID to continue.");
      return;
    }

    if (!consent) {
      setError("Confirm the consent box to submit.");
      return;
    }

    setStatus("pending_review");
    persist("pending_review");
    setError("");
    setMessage(
      "Your documents have been submitted. An admin will review them shortly."
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Testing controls (sample only): pretend the admin took an action
  const moveStatus = (next) => {
    setStatus(next);
    persist(next);
    setMessage("");
  };

  const resetAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setStatus("not_submitted");
    setForm(emptyForm);
    setDocs({});
    setConsent(false);
    setError("");
    setMessage("");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-500";

  const labelClass = "mb-2 block text-sm font-medium text-gray-700";

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Farmer verification</h1>
        <p className="mt-1 text-sm text-gray-500">
          Get verified to show the Verified Farmer badge and list products.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {message}
        </div>
      )}

      {status === "rejected" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Your documents were rejected. Correct the details below and submit
          again.
        </div>
      )}

      {/* Status tracker */}
      <section className={sectionClass}>
        <h2 className="mb-4 text-lg font-bold text-gray-900">Status tracker</h2>

        <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {steps.map((step, index) => (
            <li
              key={step}
              className={`rounded-lg border px-4 py-3 text-sm ${
                index < reached
                  ? "border-[#168343] bg-green-50 font-semibold text-[#174832]"
                  : "border-gray-300 text-gray-500"
              }`}
            >
              {index + 1}. {step}
            </li>
          ))}
        </ol>

        <p className="mt-3 text-xs text-gray-500">
          Current status: {statusText[status]}
        </p>
      </section>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_320px]">
          <div className="space-y-5">
            <fieldset disabled={!editable} className="min-w-0 space-y-5 border-0 p-0">
              {/* 1. Personal identification */}
              <section className={sectionClass}>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  1. Personal identification
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Full legal name *
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="nationalIdNumber" className={labelClass}>
                      National ID number *
                    </label>
                    <input
                      id="nationalIdNumber"
                      name="nationalId"
                      value={form.nationalId}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone number *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="county" className={labelClass}>
                      County *
                    </label>
                    <input
                      id="county"
                      name="county"
                      value={form.county}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="subCounty" className={labelClass}>
                      Sub-county *
                    </label>
                    <input
                      id="subCounty"
                      name="subCounty"
                      value={form.subCounty}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* 2. Farming information */}
              <section className={sectionClass}>
                <h2 className="mb-5 text-lg font-bold text-gray-900">
                  2. Farming information
                </h2>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="farmName" className={labelClass}>
                      Farm name (if applicable)
                    </label>
                    <input
                      id="farmName"
                      name="farmName"
                      value={form.farmName}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="farmLocation" className={labelClass}>
                      Farm location *
                    </label>
                    <input
                      id="farmLocation"
                      name="farmLocation"
                      value={form.farmLocation}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label htmlFor="activities" className={labelClass}>
                      Main agricultural activities *
                    </label>
                    <input
                      id="activities"
                      name="activities"
                      value={form.activities}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="crops" className={labelClass}>
                      Crops or livestock produced *
                    </label>
                    <input
                      id="crops"
                      name="crops"
                      value={form.crops}
                      onChange={handleChange}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="farmSize" className={labelClass}>
                      Approximate farm size
                    </label>
                    <input
                      id="farmSize"
                      name="farmSize"
                      value={form.farmSize}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label htmlFor="relationship" className={labelClass}>
                    Your relationship to the farm *
                  </label>
                  <select
                    id="relationship"
                    name="relationship"
                    value={form.relationship}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option>Owner</option>
                    <option>Leasing</option>
                    <option>Family land</option>
                    <option>Managing for someone</option>
                    <option>Contract farming</option>
                  </select>
                </div>
              </section>

              {/* 3. Supporting documents */}
              <section className={sectionClass}>
                <h2 className="mb-2 text-lg font-bold text-gray-900">
                  3. Supporting documents
                </h2>

                <div>
                  {documents.map((doc) => (
                    <div
                      key={doc.key}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 py-4 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {doc.label} ({doc.required ? "required" : "optional"})
                        </p>

                        {doc.hint && (
                          <p className="text-xs text-gray-500">{doc.hint}</p>
                        )}

                        {docs[doc.key] && (
                          <p className="mt-1 text-xs font-medium text-[#168343]">
                            Selected: {docs[doc.key]}
                            {editable && (
                              <button
                                type="button"
                                onClick={() => removeFile(doc.key)}
                                className="ml-2 text-gray-500 underline hover:text-red-600"
                              >
                                Remove
                              </button>
                            )}
                          </p>
                        )}
                      </div>

                      <label
                        className={`whitespace-nowrap rounded-lg border border-[#174832] px-4 py-2 text-sm font-semibold text-[#174832] transition ${
                          editable
                            ? "cursor-pointer hover:bg-green-50"
                            : "cursor-not-allowed opacity-50"
                        }`}
                      >
                        {docs[doc.key] ? "Replace file" : "Upload file"}
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(event) => handleFile(doc.key, event)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </section>
            </fieldset>

            {/* Consent and submit */}
            {editable ? (
              <section className={sectionClass}>
                <label className="flex items-start gap-3 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(event) => {
                      setConsent(event.target.checked);
                      setError("");
                    }}
                    className="mt-1 h-4 w-4 accent-[#168343]"
                  />
                  I confirm the information is true and I consent to
                  verification, including a possible farm visit by an AgriBridge
                  field officer.
                </label>

                {error && (
                  <p role="alert" className="mt-3 text-sm font-medium text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  className="mt-5 rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
                >
                  Submit for verification
                </button>
              </section>
            ) : (
              <section className={sectionClass}>
                <p className="text-sm text-gray-700">
                  {status === "approved"
                    ? "Your farm is verified. You can now list products."
                    : "Your application is being reviewed. You cannot edit it while it is in review."}
                </p>
              </section>
            )}
          </div>

          {/* What happens next */}
          <aside className="space-y-5 xl:sticky xl:top-4">
            <section className={sectionClass}>
              <h2 className="mb-3 text-lg font-bold text-gray-900">
                What happens next
              </h2>

              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-gray-600">
                <li>Admin reviews your documents.</li>
                <li>A field officer is assigned to visit your farm.</li>
                <li>
                  The officer confirms identity, farming activity and produce.
                </li>
                <li>Admin approves, rejects or asks for more information.</li>
                <li>You get the Verified Farmer badge and can list products.</li>
              </ol>

              <div
                className={`mt-4 flex h-24 items-center justify-center rounded-lg border-2 text-sm ${
                  status === "approved"
                    ? "border-[#168343] bg-green-50 font-bold text-[#174832]"
                    : "border-dashed border-gray-300 bg-gray-50 text-gray-500"
                }`}
              >
                {status === "approved"
                  ? "✓ Verified Farmer"
                  : "Verified Farmer badge preview"}
              </div>

              <p className="mt-4 text-xs leading-5 text-gray-500">
                Your ID and documents are private. Only verification staff can
                see them. They never appear on product pages.
              </p>
            </section>

            {/* Sample-only controls */}
            <section className="rounded-xl border border-dashed border-gray-300 p-4">
              <p className="mb-3 text-xs font-medium text-gray-500">
                Testing only: act as the admin
              </p>

              <div className="flex flex-wrap gap-2">
                {nextStatus[status] && (
                  <button
                    type="button"
                    onClick={() => moveStatus(nextStatus[status])}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-[#168343] hover:text-[#168343]"
                  >
                    Move to next stage
                  </button>
                )}

                {status === "pending_review" && (
                  <button
                    type="button"
                    onClick={() => moveStatus("rejected")}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-red-500 hover:text-red-600"
                  >
                    Reject documents
                  </button>
                )}

                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:border-gray-500"
                >
                  Reset
                </button>
              </div>
            </section>
          </aside>
        </div>
      </form>
    </div>
  );
}

export default FarmerVerification;