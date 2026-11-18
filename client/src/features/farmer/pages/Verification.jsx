
import { useEffect, useState } from "react";

const STORAGE_KEY = "agribridge-farmer-verification";
const PROFILE_KEY = "agribridge-farmer-profile";

const MAX_TOTAL_CHARS = 3_000_000;
const MAX_PDF_BYTES = 1024 * 1024;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const TARGET_IMAGE_CHARS = 400_000;

const initialForm = {
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
  relationship: "",
};

const documentsList = [
  { key: "nationalId", label: "National ID", required: true },
  { key: "titleDeed", label: "Title deed", required: false },
  { key: "lease", label: "Lease agreement", required: false },
  { key: "ownership", label: "Proof of ownership", required: false },
  { key: "contract", label: "Farm contract", required: false },
  { key: "coop", label: "Cooperative membership", required: false },
];

const statusSteps = [
  { key: "pending_review", label: "Documents submitted" },
  { key: "field_visit_scheduled", label: "Field visit scheduled" },
  { key: "field_verified", label: "Field verified" },
  { key: "approved", label: "Approved" },
];

const statusLabels = {
  not_submitted: "Not submitted",
  pending_review: "Pending admin review",
  field_visit_scheduled: "Field visit scheduled",
  field_verified: "Field verification complete",
  more_information_requested: "More information requested",
  approved: "Approved",
  rejected: "Rejected",
};

function readSavedApplication() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  } catch (error) {
    console.error("Could not read verification application:", error);
    return null;
  }
}

function readSavedProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
  } catch (error) {
    console.error("Could not read farmer profile:", error);
    return null;
  }
}

function totalChars(docs) {
  return Object.values(docs).reduce(
    (sum, doc) => sum + (doc?.dataUrl?.length || 0),
    0
  );
}

function formatKB(chars) {
  return `${Math.round((chars * 0.75) / 1024)} KB`;
}

function isQuotaError(error) {
  return (
    error &&
    (error.name === "QuotaExceededError" ||
      error.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      error.code === 22 ||
      error.code === 1014)
  );
}

function compressImage(file) {
  const attempts = [
    { maxDim: 1400, quality: 0.75 },
    { maxDim: 1100, quality: 0.6 },
    { maxDim: 800, quality: 0.5 },
  ];

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      try {
        let result = "";

        for (const { maxDim, quality } of attempts) {
          const scale = Math.min(
            1,
            maxDim / Math.max(image.width, image.height)
          );

          const canvas = document.createElement("canvas");
          canvas.width = Math.round(image.width * scale);
          canvas.height = Math.round(image.height * scale);

          const context = canvas.getContext("2d");

          if (!context) {
            throw new Error("Could not process image");
          }

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.drawImage(image, 0, 0, canvas.width, canvas.height);

          result = canvas.toDataURL("image/jpeg", quality);

          if (result.length <= TARGET_IMAGE_CHARS) {
            break;
          }
        }

        URL.revokeObjectURL(url);
        resolve(result);
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image could not be read"));
    };

    image.src = url;
  });
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File could not be read"));

    reader.readAsDataURL(file);
  });
}

function Verification() {
  const [form, setForm] = useState(initialForm);
  const [documents, setDocuments] = useState({});
  const [application, setApplication] = useState(readSavedApplication);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const currentStatus = application?.status || "not_submitted";

  const editable = [
    "not_submitted",
    "rejected",
    "more_information_requested",
  ].includes(currentStatus);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100 disabled:bg-gray-50 disabled:text-gray-500";

  const labelClass = "mb-2 block text-sm font-medium text-gray-700";

  const sectionClass =
    "rounded-xl border border-gray-200 bg-white p-5 shadow-sm";

  useEffect(() => {
    const profile = readSavedProfile();
    const saved = readSavedApplication();

    if (profile) {
      const [countyPart, ...subCountyParts] = (
        profile.countyAndSubCounty || ""
      )
        .split(",")
        .map((part) => part.trim());

      setForm((previous) => ({
        ...previous,
        fullName: profile.fullName || previous.fullName,
        phone: profile.phone || previous.phone,
        county: profile.county || countyPart || previous.county,
        subCounty:
          profile.subCounty ||
          subCountyParts.join(", ") ||
          previous.subCounty,
        farmName: profile.farmName || previous.farmName,
        farmLocation:
          profile.location ||
          profile.farmLocation ||
          previous.farmLocation,
        crops: profile.crops || previous.crops,
        farmSize: profile.farmSize || previous.farmSize,
      }));
    }

    if (saved?.form) {
      setForm((previous) => ({
        ...previous,
        ...saved.form,
      }));

      setDocuments(saved.docs || {});
    }

    setApplication(saved);

    const refreshApplication = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === null ||
        event.type === "agribridge-update"
      ) {
        const latest = readSavedApplication();

        setApplication(latest);

        if (latest?.form) {
          setForm((previous) => ({
            ...previous,
            ...latest.form,
          }));

          setDocuments(latest.docs || {});
        }
      }
    };

    window.addEventListener("storage", refreshApplication);
    window.addEventListener("agribridge-update", refreshApplication);

    return () => {
      window.removeEventListener("storage", refreshApplication);
      window.removeEventListener("agribridge-update", refreshApplication);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleFileChange = async (event, key) => {
    const input = event.target;
    const file = input.files?.[0];

    if (!file) return;

    const isPdf = file.type === "application/pdf";
    const isImage =
      file.type === "image/png" || file.type === "image/jpeg";

    if (!isPdf && !isImage) {
      setError("Please upload a PDF, PNG, or JPG document.");
      input.value = "";
      return;
    }

    if (isPdf && file.size > MAX_PDF_BYTES) {
      setError(
        "This PDF is larger than 1 MB. Compress it or upload a photo of the document instead."
      );
      input.value = "";
      return;
    }

    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setError(
        "This image is larger than 10 MB. Please choose a smaller one."
      );
      input.value = "";
      return;
    }

    setError("");
    setMessage("");
    setUploading(true);

    try {
      const dataUrl = isImage
        ? await compressImage(file)
        : await readAsDataUrl(file);

      const { [key]: removed, ...otherDocuments } = documents;
      const newTotal = totalChars(otherDocuments) + dataUrl.length;

      if (newTotal > MAX_TOTAL_CHARS) {
        setError(
          `Your documents exceed the storage limit of ${formatKB(
            MAX_TOTAL_CHARS
          )}. Remove a document or upload a smaller one.`
        );

        input.value = "";
        return;
      }

      setDocuments((previous) => ({
        ...previous,
        [key]: {
          name: file.name,
          type: isImage ? "image/jpeg" : file.type,
          size: Math.round(dataUrl.length * 0.75),
          dataUrl,
        },
      }));
    } catch (uploadError) {
      console.error("Document upload failed:", uploadError);

      setError(`Unable to read ${file.name}. Please try again.`);
      input.value = "";
    } finally {
      setUploading(false);
    }
  };

  const removeDocument = (key) => {
    setDocuments((previous) => {
      const { [key]: removed, ...rest } = previous;
      return rest;
    });
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!editable) {
      setError("Your application cannot currently be edited.");
      return;
    }

    if (uploading) {
      setError("Please wait for your documents to finish uploading.");
      return;
    }

    const requiredFields = [
      "fullName",
      "nationalId",
      "phone",
      "county",
      "subCounty",
      "farmName",
      "farmLocation",
      "activities",
      "crops",
      "farmSize",
      "relationship",
    ];

    const missingField = requiredFields.some(
      (field) => !String(form[field] || "").trim()
    );

    if (missingField) {
      setError("Please complete all required fields.");
      return;
    }

    if (!documents.nationalId?.dataUrl) {
      setError("Please upload your National ID.");
      return;
    }

    const savedApplication = {
      status: "pending_review",
      form,
      docs: documents,
      submittedAt: new Date().toISOString(),
      reviewReason: "",
      officer: "Not assigned",
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(savedApplication)
      );
    } catch (saveError) {
      console.error("Unable to save verification application:", saveError);

      setError(
        isQuotaError(saveError)
          ? `Browser storage is full. Your documents total ${formatKB(
              totalChars(documents)
            )}. Remove optional documents or upload smaller files.`
          : "Your application could not be saved. Please try again."
      );

      return;
    }

    try {
      const existingProfile = readSavedProfile() || {};

      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify({
          ...existingProfile,
          fullName: form.fullName,
          phone: form.phone,
          countyAndSubCounty: `${form.county}, ${form.subCounty}`,
          farmName: form.farmName,
          location: form.farmLocation,
          crops: form.crops,
          farmSize: form.farmSize,
        })
      );
    } catch (profileError) {
      console.warn("Unable to sync farmer profile:", profileError);
    }

    setApplication(savedApplication);
    setMessage(
      "Your verification application has been submitted successfully."
    );

    window.dispatchEvent(new Event("agribridge-update"));
  };

  const usedChars = totalChars(documents);

  const currentStep = statusSteps.findIndex(
    (step) => step.key === currentStatus
  );

  const reached = currentStatus === "approved"
    ? statusSteps.length
    : currentStep >= 0
      ? currentStep + 1
      : 0;

  return (
    <div className="min-h-screen bg-[#f4f7f2] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Farmer Verification
          </h1>

          <p className="mt-2 text-sm text-gray-600">
            Complete your farm information and upload the required documents
            to verify your farmer account.
          </p>
        </div>

        {application && (
          <section className={sectionClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Verification status
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Application submitted:{" "}
                  {application.submittedAt
                    ? new Date(
                        application.submittedAt
                      ).toLocaleDateString()
                    : "Date unavailable"}
                </p>
              </div>

              <span className="rounded-full bg-green-100 px-4 py-2 text-sm font-semibold text-green-800">
                {statusLabels[currentStatus] || currentStatus}
              </span>
            </div>

            {currentStatus === "rejected" && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="font-semibold text-red-800">
                  Your application needs attention.
                </p>

                <p className="mt-1 text-sm text-red-700">
                  {application.reviewReason ||
                    "Please correct your information and submit again."}
                </p>
              </div>
            )}

            {currentStatus === "more_information_requested" && (
              <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
                <strong>Additional information requested:</strong>{" "}
                {application.reviewReason ||
                  "Please update your information and resubmit."}
              </div>
            )}

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statusSteps.map((step, index) => {
                const completed = index < reached;

                return (
                  <div
                    key={step.key}
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        completed
                          ? "bg-green-800 text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {completed ? "✓" : index + 1}
                    </div>

                    <span className="text-xs font-medium text-gray-700">
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {application.officer &&
              application.officer !== "Not assigned" && (
                <p className="mt-4 text-sm text-gray-600">
                  Assigned field officer: {application.officer}
                </p>
              )}
          </section>
        )}

        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
        >
          <fieldset
            disabled={!editable || uploading}
            className="min-w-0 space-y-6 border-0 p-0"
          >
            <section>
              <h2 className="mb-4 border-b pb-3 text-lg font-bold text-gray-900">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  ["fullName", "Full name"],
                  ["nationalId", "National ID number"],
                  ["phone", "Phone number"],
                  ["county", "County"],
                  ["subCounty", "Sub-county"],
                ].map(([name, label]) => (
                  <div key={name}>
                    <label htmlFor={name} className={labelClass}>
                      {label} *
                    </label>

                    <input
                      id={name}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      required
                      className={inputClass}
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-4 border-b pb-3 text-lg font-bold text-gray-900">
                Farm Information
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="farmName" className={labelClass}>
                    Farm name *
                  </label>

                  <input
                    id="farmName"
                    name="farmName"
                    value={form.farmName}
                    onChange={handleChange}
                    required
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
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="activities" className={labelClass}>
                    Farming activities *
                  </label>

                  <input
                    id="activities"
                    name="activities"
                    value={form.activities}
                    onChange={handleChange}
                    placeholder="e.g. Crop farming, livestock"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="crops" className={labelClass}>
                    Crops or livestock *
                  </label>

                  <input
                    id="crops"
                    name="crops"
                    value={form.crops}
                    onChange={handleChange}
                    placeholder="e.g. Maize, beans, dairy cattle"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="farmSize" className={labelClass}>
                    Farm size *
                  </label>

                  <input
                    id="farmSize"
                    name="farmSize"
                    value={form.farmSize}
                    onChange={handleChange}
                    placeholder="e.g. 2 acres"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="relationship" className={labelClass}>
                    Relationship to farm *
                  </label>

                  <select
                    id="relationship"
                    name="relationship"
                    value={form.relationship}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  >
                    <option value="">Select relationship</option>
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                    <option value="Leaseholder">Leaseholder</option>
                    <option value="Family farm">Family farm</option>
                    <option value="Farm manager">Farm manager</option>
                    <option value="Contract farming">Contract farming</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="mb-2 border-b pb-3 text-lg font-bold text-gray-900">
                Supporting Documents
              </h2>

              <p className="mb-1 text-sm text-gray-500">
                Upload your National ID and any available supporting farm
                documents. Accepted formats: PDF, PNG and JPG. Photos are
                compressed automatically. PDFs must be under 1 MB.
              </p>

              <p className="mb-4 text-xs text-gray-500">
                Storage used: {formatKB(usedChars)} of{" "}
                {formatKB(MAX_TOTAL_CHARS)}
              </p>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {documentsList.map((document) => (
                  <div
                    key={document.key}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <label className="mb-2 block text-sm font-semibold text-gray-800">
                      {document.label}
                      {document.required ? " *" : " (optional)"}
                    </label>

                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg"
                      required={
                        document.required &&
                        !documents[document.key]?.dataUrl
                      }
                      onChange={(event) =>
                        handleFileChange(event, document.key)
                      }
                      className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-green-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-green-800 hover:file:bg-green-200"
                    />

                    {documents[document.key] && (
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <p className="break-all text-xs text-green-700">
                          Selected: {documents[document.key].name}
                        </p>

                        {!document.required && (
                          <button
                            type="button"
                            onClick={() =>
                              removeDocument(document.key)
                            }
                            className="shrink-0 text-xs font-semibold text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-wrap justify-end gap-3 border-t pt-5">
              <button
                type="button"
                onClick={() => {
                  setForm(initialForm);
                  setDocuments({});
                  setError("");
                  setMessage("");
                }}
                className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Clear form
              </button>

              <button
                type="submit"
                disabled={uploading}
                className="rounded-lg bg-green-800 px-6 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading
                  ? "Reading document..."
                  : "Submit for verification"}
              </button>
            </div>
          </fieldset>

          {!editable && (
            <p className="rounded-lg bg-gray-50 p-4 text-sm text-gray-600">
              Your application is currently under review or has been approved.
              Editing is disabled until the administrator requests changes.
            </p>
          )}
        </form>

        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          <strong>What happens next?</strong>
          <p className="mt-1">
            The AgriBridge admin team will review your information and
            supporting documents. A field visit may be scheduled before your
            account is approved.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Verification;
