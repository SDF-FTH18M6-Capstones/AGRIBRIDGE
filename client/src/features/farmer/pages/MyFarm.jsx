import { useEffect, useState } from "react";

const PROFILE_KEY = "agribridge-farmer-profile";
const VERIFICATION_KEY = "agribridge-farmer-verification";

function readInitialProfile() {
  try {
    const savedProfile = JSON.parse(localStorage.getItem(PROFILE_KEY) || "null");
    const savedVerification = JSON.parse(localStorage.getItem(VERIFICATION_KEY) || "null");
    const form = savedVerification?.form || {};

    return {
      photo: savedProfile?.photo || "",
      fullName: savedProfile?.fullName || form.fullName || "",
      phone: savedProfile?.phone || form.phone || "",
      countyAndSubCounty:
        savedProfile?.countyAndSubCounty ||
        [form.county, form.subCounty].filter(Boolean).join(", ") ||
        "",
      farmName: savedProfile?.farmName || form.farmName || "",
      location: savedProfile?.location || form.farmLocation || "",
      crops: savedProfile?.crops || form.crops || "",
      farmSize: savedProfile?.farmSize || form.farmSize || "",
      isApproved: savedVerification?.status === "approved",
    };
  } catch (error) {
    console.error("Failed to read farmer profile:", error);
    return {
      photo: "",
      fullName: "",
      phone: "",
      countyAndSubCounty: "",
      farmName: "",
      location: "",
      crops: "",
      farmSize: "",
      isApproved: false,
    };
  }
}

function MyFarm() {
  const [profile, setProfile] = useState(readInitialProfile);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (
        event.key === PROFILE_KEY ||
        event.key === VERIFICATION_KEY ||
        event.key === null
      ) {
        setProfile(readInitialProfile());
      }
    };

    const refreshOnFocus = () => setProfile(readInitialProfile());

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
    setMessage("");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, photo: reader.result }));
      setMessage("");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();

    try {
      const profileToSave = {
        photo: profile.photo,
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        countyAndSubCounty: profile.countyAndSubCounty.trim(),
        farmName: profile.farmName.trim(),
        location: profile.location.trim(),
        crops: profile.crops.trim(),
        farmSize: profile.farmSize.trim(),
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profileToSave));

      const existingVerification = JSON.parse(
        localStorage.getItem(VERIFICATION_KEY) || "null"
      );

      if (existingVerification && existingVerification.form) {
        const [countyPart, ...subCountyParts] = profile.countyAndSubCounty
          .split(",")
          .map((s) => s.trim());

        const updatedVerification = {
          ...existingVerification,
          form: {
            ...existingVerification.form,
            fullName: profileToSave.fullName || existingVerification.form.fullName,
            phone: profileToSave.phone || existingVerification.form.phone,
            county: countyPart || existingVerification.form.county,
            subCounty: subCountyParts.join(", ") || existingVerification.form.subCounty,
            farmName: profileToSave.farmName || existingVerification.form.farmName,
            farmLocation: profileToSave.location || existingVerification.form.farmLocation,
            crops: profileToSave.crops || existingVerification.form.crops,
            farmSize: profileToSave.farmSize || existingVerification.form.farmSize,
          },
        };
        localStorage.setItem(VERIFICATION_KEY, JSON.stringify(updatedVerification));
      }

      setMessage("Changes saved successfully.");
    } catch (error) {
      console.error("Could not save profile:", error);
      setMessage("Error saving changes. Please try again.");
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1f2933]">My farm</h1>
        {profile.isApproved && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            ✓ Verified Farmer
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Card: Farmer profile */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">
            Farmer profile
          </h2>

          <div className="mb-4">
            <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 text-sm text-gray-500 transition hover:bg-gray-200">
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Farmer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>[Photo] — Click to upload</span>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <input
                type="text"
                name="fullName"
                value={profile.fullName}
                onChange={handleChange}
                placeholder="Full name"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>

            <div>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleChange}
                placeholder="Phone number"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>

            <div>
              <input
                type="text"
                name="countyAndSubCounty"
                value={profile.countyAndSubCounty}
                onChange={handleChange}
                placeholder="County and sub-county"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="submit"
              className="rounded-lg bg-[#14532d] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0f3f22]"
            >
              Save changes
            </button>

            {message && (
              <span className="text-xs font-medium text-green-700">
                {message}
              </span>
            )}
          </div>
        </section>

        {/* Right Card: Farm profile */}
        <section className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-gray-900">
            Farm profile
          </h2>

          <div className="space-y-3">
            <div>
              <input
                type="text"
                name="farmName"
                value={profile.farmName}
                onChange={handleChange}
                placeholder="Farm name"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>

            <div>
              <input
                type="text"
                name="location"
                value={profile.location}
                onChange={handleChange}
                placeholder="Location"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>

            <div>
              <input
                type="text"
                name="crops"
                value={profile.crops}
                onChange={handleChange}
                placeholder="Main crops or livestock"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>

            <div>
              <input
                type="text"
                name="farmSize"
                value={profile.farmSize}
                onChange={handleChange}
                placeholder="Farm size"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-[#14532d]"
              />
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            This profile is shown to buyers with the Verified badge once approved.
          </p>
        </section>
      </form>
    </div>
  );
}

export default MyFarm;