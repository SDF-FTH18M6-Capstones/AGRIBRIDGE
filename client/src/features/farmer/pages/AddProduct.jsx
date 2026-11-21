import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../../services/api";

const initialForm = {
  name: "",
  category: "Vegetables",
  description: "",
  price: "",
  quantity: "",
  unit: "kg",
  harvestStatus: "Ready for harvest",
  harvestDate: "",
  county: "",
  location: "",
  farmName: "",
};

const categoryIds = {
  Vegetables: 1,
  Fruits: 2,
  Grains: 3,
  "Roots & Tubers": 4,
};

const steps = [
  "Product information",
  "Price and quantity",
  "Harvest and farm",
  "Review listing",
];

function AddProduct() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadFarmerProfile = async () => {
      try {
        const response = await api.get("/profiles/me");
        const farmerProfile = response.data?.data?.farmer_profile;

        if (isMounted && farmerProfile) {
          setForm((previous) => ({
            ...previous,
            farmName: farmerProfile.farm_name || "",
            location: farmerProfile.location || "",
          }));
        }
      } catch (error) {
        console.error("Could not load existing farmer profile:", error);

        if (isMounted) {
          setProfileError(
            "Your saved farm details could not be loaded. You can still enter your own details below."
          );
        }
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };

    loadFarmerProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must not exceed 5MB.");
      return;
    }

    setImageFile(file);
    setImage(URL.createObjectURL(file));
    setImageName(file.name);
    setError("");
  };

  const validateStep = () => {
    if (currentStep === 1) {
      if (!form.name.trim() || !form.description.trim()) {
        setError("Please enter the product name and description.");
        return false;
      }
    }

    if (currentStep === 2) {
      if (
        !form.price ||
        !form.quantity ||
        Number(form.price) <= 0 ||
        Number(form.quantity) <= 0
      ) {
        setError("Enter a valid price and quantity greater than zero.");
        return false;
      }
    }

    if (currentStep === 3) {
      if (!form.location.trim() || !form.farmName.trim()) {
        setError("Please complete your farm name and location in My Farm.");
        return false;
      }
    }

    setError("");
    return true;
  };

  const nextStep = () => {
    if (currentStep === 3 && (profileLoading || profileError)) {
      setError(
        profileLoading
          ? "Please wait while your farm details load."
          : "Please update your farm details in My Farm before continuing."
      );
      return;
    }

    if (validateStep()) {
      setCurrentStep((step) => Math.min(step + 1, 4));
    }
  };

  const previousStep = () => {
    setError("");
    setCurrentStep((step) => Math.max(step - 1, 1));
  };

  const publishProduct = async () => {
    if (publishing) return;

    setPublishing(true);
    setError("");

    try {
      const payload = {
        category_id: categoryIds[form.category],
        product_name: form.name.trim(),
        description: form.description.trim(),
        price: String(Number(form.price)),
        quantity_available: String(Number(form.quantity)),
        unit: form.unit,
        quality: form.harvestStatus,
        availability_date: form.harvestDate || null,
        status: "available",
      };

      if (!payload.category_id) {
        throw new Error("Please select a valid product category.");
      }


      await api.put("/profiles/me", {
        profile_type: "farmer",
        farm_name: form.farmName.trim(),
        location: form.location.trim(),
      });

      const response = await api.post("/products", payload);
      const savedProduct = response.data.data;

      let uploadedImageUrl = "";
      let imageUploadWarning = "";

      if (imageFile) {
        try {
          const imageFormData = new FormData();
          imageFormData.append("image", imageFile);

          const imageResponse = await api.post(
            `/products/${savedProduct.product_id}/images`,
            imageFormData
          );

          uploadedImageUrl =
            imageResponse.data?.data?.image_url || "";

          if (!uploadedImageUrl) {
            throw new Error("The server did not return an image URL.");
          }
        } catch (imageError) {
          const status =
            imageError?.status ?? imageError?.response?.status ?? null;

          const message =
            imageError?.message || "Unknown image upload error.";

          console.error("Product image upload failed:", {
            status,
            message,
            data: imageError?.data ?? imageError?.response?.data ?? null,
          });

          imageUploadWarning =
            `Product created, but image upload failed${status ? ` (HTTP ${status})` : ""}: ${message}`;
        }
      }


      try {
        const storedProducts = JSON.parse(
          localStorage.getItem("agribridge-farmer-products") || "[]"
        );

        const existingProducts = Array.isArray(storedProducts)
          ? storedProducts
          : [];

        const newProduct = {
          id: savedProduct.product_id,
          name: savedProduct.product_name,
          category: form.category,
          description: savedProduct.description,
          price: Number(savedProduct.price),
          quantity: Number(savedProduct.quantity_available),
          unit: savedProduct.unit,
          harvestStatus: savedProduct.quality,
          harvestDate: savedProduct.availability_date || "",
          county: form.county,
          location: form.location.trim(),
          farmName: form.farmName.trim(),
          imageName,
          imageUrl: uploadedImageUrl,
          status: "Active",
          createdAt: new Date().toISOString(),
        };

        localStorage.setItem(
          "agribridge-farmer-products",
          JSON.stringify([...existingProducts, newProduct])
        );
      } catch (storageError) {
        console.warn("Product saved to the server, but local storage was not updated:", storageError);
      }

      navigate("/farmer/products", {
        state: {
          message:
            imageUploadWarning || "Product added successfully!",
        },
      });
    } catch (err) {
      console.error("Unable to publish product:", err);
      setError(
        err.message || "Unable to publish your product. Please try again."
      );
      setPublishing(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="mb-2 text-sm text-gray-500">
          <Link to="/farmer" className="hover:text-green-700">
            Dashboard
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800">Add product</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          Add a new product
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          List your agricultural products for buyers on AgriBridge.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">
            Product listing process
          </h2>
          <span className="text-sm font-semibold text-green-800">
            Step {currentStep} of 4
          </span>
        </div>

        <div className="flex gap-2">
          {steps.map((step, index) => (
            <div key={step} className="flex flex-1 flex-col gap-2">
              <div
                className={`h-2 rounded-full ${
                  currentStep >= index + 1
                    ? "bg-green-700"
                    : "bg-gray-200"
                }`}
              />
              <span className="hidden text-xs text-gray-600 sm:block">
                {step}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        {profileLoading && (
          <div className="mb-5 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            Loading your saved farm details...
          </div>
        )}

        {profileError && (
          <div className="mb-5 rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            {profileError}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Product information
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tell buyers about the product you are selling.
              </p>
            </div>

            <div>
              <label className={labelClass}>Product name *</label>
              <input
                className={inputClass}
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Fresh tomatoes"
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select
                className={inputClass}
                name="category"
                value={form.category}
                onChange={handleChange}
              >
                <option value="Vegetables">Vegetables</option>
                <option value="Fruits">Fruits</option>
                <option value="Grains">Grains</option>
                <option value="Roots & Tubers">Roots & Tubers</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Product description *</label>
              <textarea
                className={inputClass}
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                placeholder="Describe the quality and condition of your product..."
              />
            </div>

            <div>
              <label className={labelClass}>Product image</label>
              <input
                className={inputClass}
                type="file"
                accept="image/*"
                onChange={handleImage}
              />
              <p className="mt-1 text-xs text-gray-500">
                Image must not exceed 2MB.
              </p>

              {image && (
                <div className="mt-4">
                  <img
                    src={image}
                    alt="Product preview"
                    className="h-40 w-40 rounded-lg border object-cover"
                  />
                  <p className="mt-2 text-sm text-gray-600">
                    {imageName}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Price and quantity
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Set your selling price and available quantity.
              </p>
            </div>

            <div>
              <label className={labelClass}>Price per unit (KES) *</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="e.g. 100"
              />
            </div>

            <div>
              <label className={labelClass}>Available quantity *</label>
              <input
                className={inputClass}
                type="number"
                min="1"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="e.g. 200"
              />
            </div>

            <div>
              <label className={labelClass}>Measurement unit</label>
              <select
                className={inputClass}
                name="unit"
                value={form.unit}
                onChange={handleChange}
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="gram">Grams</option>
                <option value="tonne">Tonnes</option>
                <option value="bag">Bags</option>
                <option value="crate">Crates</option>
                <option value="piece">Pieces</option>
                <option value="litre">Litres</option>
                <option value="bunch">Bunches</option>
              </select>
            </div>

            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-800">
                Estimated listing value
              </p>
              <p className="mt-1 text-xl font-bold text-green-900">
                KES{" "}
                {(
                  Number(form.price || 0) *
                  Number(form.quantity || 0)
                ).toLocaleString("en-KE")}
              </p>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Harvest and farm details
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Give buyers information about availability and farm location.
              </p>
            </div>

            <div>
              <label className={labelClass}>Harvest status</label>
              <select
                className={inputClass}
                name="harvestStatus"
                value={form.harvestStatus}
                onChange={handleChange}
              >
                <option value="Ready for harvest">Ready for harvest</option>
                <option value="Available soon">Available soon</option>
                <option value="Recently harvested">Recently harvested</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Expected harvest date</label>
              <input
                className={inputClass}
                type="date"
                name="harvestDate"
                value={form.harvestDate}
                onChange={handleChange}
              />
            </div>

            <p className="text-xs text-gray-500">
              Enter your own farm name and location. These details will be saved to your shared farm profile.
            </p>

            <div>
              <label className={labelClass}>Farm location *</label>
              <input
                className={inputClass}
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Enter your farm location or area"
              />
            </div>

            <div>
              <label className={labelClass}>Farm name *</label>
              <input
                className={inputClass}
                name="farmName"
                value={form.farmName}
                onChange={handleChange}
                placeholder="Enter your farm name"
              />
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Review your listing
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Check your product details before publishing.
              </p>
            </div>

            {image && (
              <img
                src={image}
                alt={form.name}
                className="h-48 w-full rounded-lg object-cover"
              />
            )}

            <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
              {[
                ["Product", form.name],
                ["Category", form.category],
                ["Description", form.description],
                ["Price", `KES ${Number(form.price).toLocaleString("en-KE")} / ${form.unit}`],
                ["Quantity", `${form.quantity} ${form.unit}`],
                ["Harvest status", form.harvestStatus],
                ["Harvest date", form.harvestDate || "Not specified"],
                ["County", form.county || "Not provided in farm profile"],
                ["Location", form.location],
                ["Farm", form.farmName],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-1 gap-1 p-4 sm:grid-cols-3"
                >
                  <span className="text-sm font-semibold text-gray-600">
                    {label}
                  </span>
                  <span className="text-sm text-gray-900 sm:col-span-2">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
              Your product will be saved as an active listing.
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-col-reverse justify-between gap-3 border-t border-gray-100 pt-6 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              if (currentStep === 1) {
                navigate("/farmer/products");
              } else {
                previousStep();
              }
            }}
            className="rounded-lg border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            {currentStep === 1 ? "Cancel" : "Previous"}
          </button>

          {currentStep < 4 ? (
            <button
              type="button"
              onClick={nextStep}
              className="rounded-lg bg-green-800 px-6 py-3 text-sm font-semibold text-white hover:bg-green-900"
            >
              Continue
            </button>
          ) : (
            <button
              type="button"
              onClick={publishProduct}
              disabled={publishing}
              className="rounded-lg bg-green-800 px-6 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? "Publishing..." : "Publish product"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default AddProduct;