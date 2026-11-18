import { useState } from "react";

const defaultProfile = {
  fullName: "Jane Wanjiku",
  phone: "0712345678",
  county: "Nakuru",
  farmName: "Green Valley Farm",
  location: "Nakuru, Kenya",
  crops: "Tomatoes, Kale, Potatoes",
  farmSize: "5 acres",
};

function MyFarm() {
  const [profile, setProfile] = useState(() => {
    const savedProfile = localStorage.getItem("agribridge-farmer-profile");
    return savedProfile ? JSON.parse(savedProfile) : defaultProfile;
  });

  const [photo, setPhoto] = useState("");
  const [message, setMessage] = useState("");

  const handleChange = (event) => {
    setProfile({
      ...profile,
      [event.target.name]: event.target.value,
    });
    setMessage("");
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files[0];

    if (file) {
      setPhoto(URL.createObjectURL(file));
    }
  };

  const handleSave = (event) => {
    event.preventDefault();

    localStorage.setItem(
      "agribridge-farmer-profile",
      JSON.stringify(profile)
    );

    setMessage("Your farm profile has been saved successfully.");
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const labelClass = "mb-2 block text-sm font-medium text-gray-700";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My farm</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal and farm information.
        </p>
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
              {photo ? (
                <img
                  src={photo}
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
                  value={profile.fullName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone number
                </label>
                <input
                  id="phone"
                  name="phone"
                  value={profile.phone}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="county" className={labelClass}>
                  County and sub-county
                </label>
                <input
                  id="county"
                  name="county"
                  value={profile.county}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="mt-5 rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
            >
              Save changes
            </button>
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
                  value={profile.farmName}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="location" className={labelClass}>
                  Location
                </label>
                <input
                  id="location"
                  name="location"
                  value={profile.location}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="crops" className={labelClass}>
                  Main crops or livestock
                </label>
                <input
                  id="crops"
                  name="crops"
                  value={profile.crops}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label htmlFor="farmSize" className={labelClass}>
                  Farm size
                </label>
                <input
                  id="farmSize"
                  name="farmSize"
                  value={profile.farmSize}
                  onChange={handleChange}
                  className={inputClass}
                  required
                />
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              This profile is shown to buyers with the Verified Farmer badge
              once approved.
            </p>
          </section>
        </div>
      </form>
    </div>
  );
}

export default MyFarm;