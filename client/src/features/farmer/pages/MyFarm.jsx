import { useEffect, useState } from "react";
import api from "../../../services/api";

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

function MyFarm() {
  const [profile, setProfile] = useState(readInitialProfile);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const labelClass = "mb-2 block text-sm font-medium text-gray-700";

  useEffect(() => {
    let isMounted = true;

    const loadBackendProfile = async () => {
      try {
        const response = await api.get("/profiles/me");

        const farmerProfile = response.data?.data?.farmer_profile;

        if (isMounted && farmerProfile) {
          setProfile((previous) => ({
            ...previous,
            farmName: farmerProfile.farm_name || previous.farmName,
            location: farmerProfile.location || previous.location,
          }));
        }
      } catch (error) {
        console.error("Failed to load farmer profile:", error);

        if (isMounted) {
          setMessage(
            error.message || "Could not load your farm profile."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const handleStorageSync = (event) => {
      if (
        event.key === PROFILE_KEY ||
        event.key === VERIFICATION_KEY ||
        event.key === null
      ) {
        setProfile((previous) => ({
          ...readInitialProfile(),
          farmName: previous.farmName,
          location: previous.location,
        }));
      }
    };

    const refreshOnFocus = () => {
      handleStorageSync({ key: null });
    };

    loadBackendProfile();

    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("focus", refreshOnFocus);

    return () => {
      isMounted = false;
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

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setProfile((previous) => ({
        ...previous,
        photo: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  const handleSave = async (event) => {
    event.preventDefault();

    const farmName = profile.farmName.trim();
    const location = profile.location.trim();

    if (farmName.length < 2 || location.length < 2) {
      setMessage("Please enter a valid farm name and location.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      const response = await api.put("/profiles/me", {
        profile_type: "farmer",
        farm_name: farmName,
        location: location,
      });

      const savedFarmerProfile = response.data.data;

      const profileToSave = {
        photo: profile.photo,
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        countyAndSubCounty: profile.countyAndSubCounty.trim(),
        farmName: savedFarmerProfile.farm_name,
        location: savedFarmerProfile.location,
        crops: profile.crops.trim(),
        farmSize: profile.farmSize.trim(),
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem(
        PROFILE_KEY,
        JSON.stringify(profileToSave)
      );

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
            fullName:
              profileToSave.fullName ||
              existingVerification.form.fullName,
            phone:
              profileToSave.phone ||
              existingVerification.form.phone,
            county:
              countyPart ||
              existingVerification.form.county,
            subCounty:
              subCountyParts.join(", ") ||
              existingVerification.form.subCounty,
            farmName: profileToSave.farmName,
            farmLocation: profileToSave.location,
            crops:
              profileToSave.crops ||
              existingVerification.form.crops,
            farmSize:
              profileToSave.farmSize ||
              existingVerification.form.farmSize,
          },
        };

        localStorage.setItem(
          VERIFICATION_KEY,
          JSON.stringify(updatedVerification)
        );
      }

      setProfile((previous) => ({
        ...previous,
        farmName: savedFarmerProfile.farm_name,
        location: savedFarmerProfile.location,
      }));

      window.dispatchEvent(new Event("agribridge-update"));

      setMessage(
        response.data.message ||
          "Your farm profile has been saved successfully."
      );
    } catch (error) {
      console.error("Could not save farmer profile:", error);

      setMessage(
        error.message ||
          "Error saving your farm profile. Please try again."
      );
    } finally {
      setIsSaving(false);
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
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
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
          disabled={isSaving || isLoading}
          className="mt-5 rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}

export default MyFarm;