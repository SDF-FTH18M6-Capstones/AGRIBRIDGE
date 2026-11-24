import { Spinner } from '../../../components/ui/Loading';
import { prepareImage } from '../../v1/prepareImage';

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";

import api from "../../../services/api";
import {
  createProduct,
  updateOptimisticProduct,
} from "../products/productSlice";

const initialForm = {
  name: "",
  category: "",
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

const steps = [
  "Product information",
  "Price and quantity",
  "Harvest and farm",
  "Review listing",
];

function AddProduct() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [image, setImage] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  // Load real categories from the database.
  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const response = await api.get("/categories/");
        const loadedCategories = response.data?.data || [];

        if (isMounted) {
          setCategories(loadedCategories);

          if (loadedCategories.length > 0) {
            setForm((previous) => ({
              ...previous,
              category: String(loadedCategories[0].category_id),
            }));
          }
        }
      } catch (err) {
        console.error("Could not load categories:", err);

        if (isMounted) {
          setError(
            err.response?.data?.error?.message ||
              "Could not load product categories. Please try again."
          );
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  // Load the farmer's saved profile.
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
      } catch (err) {
        console.error("Could not load farmer profile:", err);

        if (isMounted) {
          setProfileError(
            "Your saved farm details could not be loaded. You can still enter your details below."
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

  useEffect(() => {
    return () => {
      if (image) {
        URL.revokeObjectURL(image);
      }
    };
  }, [image]);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-green-700 focus:ring-2 focus:ring-green-100";

  const labelClass = "mb-2 block text-sm font-semibold text-gray-700";

  const selectedCategory = categories.find(
    (category) => String(category.category_id) === form.category
  );

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select a photograph.'); return; }
    try {
      const prepared = await prepareImage(file);
      setImageFile(prepared); setImage(URL.createObjectURL(prepared)); setImageName(file.name); setError('');
    } catch (failure) { setError(failure.message); }
  };
  useEffect(() => () => { if (image) URL.revokeObjectURL(image); }, [image]);

  const validateStep = () => {
    if (currentStep === 1) {
      if (!form.name.trim() || !form.description.trim()) {
        setError("Please enter the product name and description.");
        return false;
      }

      if (categoriesLoading) {
        setError("Please wait while product categories load.");
        return false;
      }

      if (!form.category || !selectedCategory) {
        setError("Please select a valid product category.");
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
        setError("Please complete your farm name and location.");
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

    if (!form.category || !selectedCategory) {
      setError("Please select a valid product category.");
      setCurrentStep(1);
      return;
    }

    setPublishing(true);
    setError("");

    try {
      const categoryId = Number(form.category);

      // Listing publication uses the existing verified farm; profile changes are separate.
      const payload = {
        category_id: categoryId,
        product_name: form.name.trim(),
        description: form.description.trim(),
        price: String(Number(form.price)),
        quantity_available: String(Number(form.quantity)),
        unit: form.unit,
        quality: form.harvestStatus,
        availability_date: form.harvestDate || null,
        status: "available",
      };

      const tempId = `temp-${Date.now()}`;

      const optimisticProduct = {
        id: tempId,
        category_id: categoryId,
        name: form.name.trim(),
        category: selectedCategory.category_name,
        description: form.description.trim(),
        price: Number(form.price),
        qty: Number(form.quantity),
        unit: form.unit,
        availability:
          form.harvestStatus === "Ready for harvest"
            ? "Ready"
            : form.harvestStatus === "Recently harvested"
              ? "On farm"
              : "Upcoming",
        quality: form.harvestStatus,
        harvestDate: form.harvestDate || "",
        status: "Active",
        imageUrl: image || "",
      };

      const savedProduct = await dispatch(
        createProduct({
          payload,
          tempId,
          optimisticProduct,
        })
      ).unwrap();

      let imageUploadWarning = "";

      if (imageFile) {
        try {
          const imageFormData = new FormData();
          imageFormData.append("file", imageFile);
          imageFormData.append("purpose", "product_image");
          imageFormData.append("product_id", savedProduct.product.id);

          const imageResponse = await api.post(
            "/media",
            imageFormData,
            { timeout: 90000 }
          );

          const uploadedImageUrl =
            imageResponse.data?.data?.public_url || `/api/media/${imageResponse.data.data.asset_id}/public`;

          if (!uploadedImageUrl) {
            throw new Error("The server did not return an image URL.");
          }

          dispatch(
            updateOptimisticProduct({
              id: savedProduct.product.id,
              changes: {
                imageUrl: uploadedImageUrl,
              },
            })
          );
        } catch (imageError) {
          console.error("Product image upload failed:", imageError);

          imageUploadWarning =
            "Product created successfully, but its image could not be uploaded.";
        }
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
        typeof err === "string"
          ? err
          : err?.response?.data?.error?.message ||
              err?.message ||
              "Unable to publish your product. Please try again."
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
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

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        {profileLoading && (
          <Spinner label="Loading product form options" />
        )}

        {profileError && (
          <div className="mb-5 rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
            {profileError}
          </div>
        )}

        {categoriesLoading && (
          <Spinner label="Loading product form options" />
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
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
              <label className={labelClass}>Category *</label>
              <select
                className={inputClass}
                name="category"
                value={form.category}
                onChange={handleChange}
                disabled={categoriesLoading || categories.length === 0}
              >
                <option value="">
                  {categoriesLoading
                    ? "Loading categories..."
                    : "Select a category"}
                </option>

                {categories.map((category) => (
                  <option
                    key={category.category_id}
                    value={String(category.category_id)}
                  >
                    {category.category_name}
                  </option>
                ))}
              </select>

              {!categoriesLoading && categories.length === 0 && (
                <p className="mt-1 text-xs text-red-600">
                  No categories were returned. Please try refreshing the page.
                </p>
              )}
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
                aria-label="Choose a product photograph"
                accept="image/*"
                onChange={handleImage}
              />

              <p className="mt-1 text-xs text-gray-500">
                Images are optimized before upload and must be at most 5 MB afterward.
              </p>

              <label className="mt-3 inline-flex cursor-pointer rounded-xl border px-4 py-2 text-sm font-semibold text-green-900">Take photo<input className="sr-only" type="file" accept="image/*" capture="environment" onChange={handleImage} /></label>
              {image && (
                <div className="mt-4">
                  <img
                    src={image}
                    alt="Product preview"
                    className="h-40 w-40 rounded-xl border object-cover"
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
                Choose availability. Your verified farm details are shown below; edit them from Profile if necessary.
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
              These details will be saved to your farm profile.
            </p>

            <div>
              <label className={labelClass}>Farm location *</label>
              <input
                className={inputClass}
                name="location"
                readOnly
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
                readOnly
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

            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
              {[
                ["Product", form.name],
                ["Category", selectedCategory?.category_name || "Not selected"],
                ["Description", form.description],
                [
                  "Price",
                  `KES ${Number(form.price).toLocaleString("en-KE")} / ${form.unit}`,
                ],
                ["Quantity", `${form.quantity} ${form.unit}`],
                ["Harvest status", form.harvestStatus],
                ["Harvest date", form.harvestDate || "Not specified"],
                ["County", form.county || "Not provided"],
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
            className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
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
              disabled={publishing || categoriesLoading || categories.length === 0}
              className="rounded-lg bg-green-800 px-6 py-3 text-sm font-semibold text-white hover:bg-green-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {publishing ? <Spinner label="Publishing" /> : "Publish product"}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export default AddProduct;
