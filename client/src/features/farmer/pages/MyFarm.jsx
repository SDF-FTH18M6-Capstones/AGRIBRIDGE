
import { useEffect, useState } from "react";

const PROFILE_KEY = "agribridge-farmer-profile";
const VERIFICATION_KEY = "agribridge-farmer-verification";

function readInitialProfile() {
  try {
    const savedProfile = JSON.parse(
      localStorage.getItem(PROFILE_KEY) || "null"
    );

    const savedVerification = JSON.parse(
      localStorage.getItem(VERIFICATION_KEY) || "null"
    );

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

// Compress images before storing them.
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const maxSize = 500;

        const scale = Math.min(
          1,
          maxSize / Math.max(image.width, image.height)
        );

        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);

        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Could not process image.");
        }

        context.drawImage(
          image,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const compressedPhoto = canvas.toDataURL(
          "image/jpeg",
          0.55
        );

        URL.revokeObjectURL(imageUrl);
        resolve(compressedPhoto);
      } catch (error) {
        URL.revokeObjectURL(imageUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not load image."));
    };

    image.src = imageUrl;
  });
}

function MyFarm() {
  const [profile, setProfile] = useState(readInitialProfile);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const labelClass =
    "mb-2 block text-sm font-medium text-gray-700";

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

    const refreshOnFocus = () => {
      setProfile(readInitialProfile());
    };

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setProfile((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  };

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setMessage("Please select an image smaller than 10 MB.");
      return;
    }

    try {
      const compressedPhoto = await compressImage(file);

      setProfile((previous) => ({
        ...previous,
        photo: compressedPhoto,
      }));

      setMessage("Photo ready. Save your profile to keep your changes.");
    } catch (error) {
      console.error("Photo compression failed:", error);
      setMessage("Could not process the photo. Please try another image.");
    }
  };

  const handleSave = (event) => {
    event.preventDefault();

    setSaving(true);
    setMessage("");

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

    try {
      // Save the profile, retrying without the photo if storage is full.
      try {
        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify(profileToSave)
        );
      } catch (storageError) {
        if (storageError.name !== "QuotaExceededError") {
          throw storageError;
        }

        const profileWithoutPhoto = {
          ...profileToSave,
          photo: "",
        };

        localStorage.setItem(
          PROFILE_KEY,
          JSON.stringify(profileWithoutPhoto)
        );

        setProfile((previous) => ({
          ...previous,
          photo: "",
        }));

        setMessage(
          "Farm details saved, but the photo could not be saved because browser storage is full."
        );
      }

      // Update existing verification details without changing approval status.
      try {
        const existingVerification = JSON.parse(
          localStorage.getItem(VERIFICATION_KEY) || "null"
        );

        if (existingVerification?.form) {
          const [countyPart, ...subCountyParts] =
            profileToSave.countyAndSubCounty
              .split(",")
              .map((part) => part.trim());

          const updatedVerification = {
            ...existingVerification,
            form: {
              ...existingVerification.form,
              fullName: profileToSave.fullName,
              phone: profileToSave.phone,
              county: countyPart || "",
              subCounty: subCountyParts.join(", "),
              farmName: profileToSave.farmName,
              farmLocation: profileToSave.location,
              crops: profileToSave.crops,
              farmSize: profileToSave.farmSize,
            },
          };

          localStorage.setItem(
            VERIFICATION_KEY,
            JSON.stringify(updatedVerification)
          );
        }
      } catch (verificationError) {
        console.error(
          "Could not update verification details:",
          verificationError
        );
      }

      window.dispatchEvent(new Event("agribridge-update"));

      setMessage((previous) =>
        previous.includes("photo could not be saved")
          ? previous
          : "Your farm profile has been saved successfully."
      );
    } catch (error) {
      console.error("Could not save profile:", error);
      setMessage(
        "Could not save farm details. Browser storage may be full."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My farm
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your personal and farm information.
          </p>
        </div>

        {profile.isApproved && (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            ✓ Verified Farmer
          </span>
        )}
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {/* Farmer profile */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Farmer profile
            </h2>

            <label
              htmlFor="farmer-photo"
              className="mb-5 flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition hover:border-[#168343] hover:bg-green-50"
            >
              {profile.photo ? (
                <img
                  src={profile.photo}
                  alt="Farmer profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="text-center">
                  <span className="text-3xl text-gray-400">＋</span>
                  <p className="mt-1 text-sm text-gray-500">
                    Upload profile photo
                  </p>
                </div>
              )}
            </label>

            <input
              id="farmer-photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="Full name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={handleChange}
                  placeholder="Phone number"
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="countyAndSubCounty"
                  className={labelClass}
                >
                  County and sub-county
                </label>

                <input
                  id="countyAndSubCounty"
                  name="countyAndSubCounty"
                  type="text"
                  value={profile.countyAndSubCounty}
                  onChange={handleChange}
                  placeholder="County and sub-county"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Farm profile */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-5 text-lg font-bold text-gray-900">
              Farm profile
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="farmName" className={labelClass}>
                  Farm name
                </label>

                <input
                  id="farmName"
                  name="farmName"
                  type="text"
                  value={profile.farmName}
                  onChange={handleChange}
                  placeholder="Farm name"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="location" className={labelClass}>
                  Location
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={profile.location}
                  onChange={handleChange}
                  placeholder="Location"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="crops" className={labelClass}>
                  Main crops or livestock
                </label>

                <input
                  id="crops"
                  name="crops"
                  type="text"
                  value={profile.crops}
                  onChange={handleChange}
                  placeholder="Main crops or livestock"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="farmSize" className={labelClass}>
                  Farm size
                </label>

                <input
                  id="farmSize"
                  name="farmSize"
                  type="text"
                  value={profile.farmSize}
                  onChange={handleChange}
                  placeholder="Farm size"
                  className={inputClass}
                />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              This profile is shown to buyers with the Verified Farmer
              badge once approved.
            </p>
          </section>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export default MyFarm;
