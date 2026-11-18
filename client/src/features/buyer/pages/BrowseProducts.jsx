
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCircleCheck,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

const sampleProducts = [
  {
    id: 1,
    name: "Grade 1 Hass Avocados",
    price: 85,
    unit: "kg",
    category: "Fruits",
    variety: "Hass",
    quantityAvailable: "500 kg",
    minimumOrder: "20 kg",
    availability: "Ready",
    harvestedDate: "2026-11-15",
    shelfLife: "14 days",
    storageRecommendation: "Cool, dry place (5°C - 10°C)",
    description:
      "Freshly harvested export-grade Hass avocados from Kiambu highlands. Sorted, unbruised, and ready for immediate dispatch.",
    images: [
      "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1601039641847-7857b994d704?auto=format&fit=crop&w=400&q=80",
      "https://images.unsplash.com/photo-1519162808019-7de1683fa2ad?auto=format&fit=crop&w=400&q=80",
    ],
    farmer: {
      id: "farmer-1",
      name: "Kiambu Fresh Farms",
      verified: true,
      county: "Kiambu",
      subCounty: "Limuru",
      otherProductsCount: 4,
    },
  },
];

const cardClass = "rounded-xl border border-gray-200 bg-white p-5";

const BrowseProducts = ({
  product,
  isSignedIn = true,
  onLoginRequired,
  onViewFarmer,
  onAddToCart,
  onPlaceOrder,
  onBack,
}) => {
  const navigate = useNavigate();
  const selectedProduct = product || sampleProducts[0];

  const [activeImage, setActiveImage] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});
  const [quantity, setQuantity] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const images = selectedProduct.images || [];
  const farmer = selectedProduct.farmer || {};
  const mainImageOk = images.length > 0 && !brokenImages[activeImage];

  const markBroken = (index) =>
    setBrokenImages((previous) => ({ ...previous, [index]: true }));

  const handleViewFarmer = () => {
    if (!farmer.id && !farmer.farmerId) {
      setError("Farmer profile information is unavailable.");
      return;
    }

    if (onViewFarmer) {
      onViewFarmer(farmer);
      return;
    }

    navigate(`/buyer/farmer/${farmer.id || farmer.farmerId}`, {
      state: { farmer },
    });
  };

  const handleAction = (actionType) => {
    setMessage("");
    setError("");

    if (!isSignedIn) {
      if (onLoginRequired) onLoginRequired();
      else setError("Please sign in to continue.");
      return;
    }

    const amount = Number(quantity);
    const minimum = parseFloat(selectedProduct.minimumOrder) || 1;
    const available = parseFloat(selectedProduct.quantityAvailable);

    if (!amount || amount <= 0) {
      setError("Enter the quantity you want.");
      return;
    }

    if (amount < minimum) {
      setError(`The minimum order is ${selectedProduct.minimumOrder}.`);
      return;
    }

    if (available && amount > available) {
      setError(`Only ${selectedProduct.quantityAvailable} is available.`);
      return;
    }

    const payload = {
      product: selectedProduct,
      quantity: amount,
    };

    if (actionType === "cart") {
      if (onAddToCart) onAddToCart(payload);
      setMessage("Added to cart.");
    } else {
      if (onPlaceOrder) onPlaceOrder(payload);
      setMessage("Order placed. The farmer must accept it before payment.");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-[#1f2933]">
          Product details
        </h1>

        <button
          type="button"
          onClick={onBack || (() => navigate(-1))}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to all products</span>
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Left column: images and farmer */}
        <div className="space-y-5">
          <section className={`${cardClass} space-y-4`}>
            <h2 className="font-semibold text-gray-900">Images</h2>

            <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-100">
              {mainImageOk ? (
                <img
                  src={images[activeImage]}
                  alt={selectedProduct.name}
                  onError={() => markBroken(activeImage)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-gray-500">
                  Main product image
                </span>
              )}
            </div>

            <div className="flex min-h-[84px] w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 p-2.5">
              {images.length > 0 ? (
                images.map((img, index) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={`h-16 w-16 overflow-hidden rounded border-2 transition-all ${
                      activeImage === index
                        ? "scale-105 border-[#12432f]"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    {brokenImages[index] ? (
                      <span className="flex h-full w-full items-center justify-center bg-gray-200 text-[10px] text-gray-500">
                        N/A
                      </span>
                    ) : (
                      <img
                        src={img}
                        alt={`Thumbnail ${index + 1}`}
                        onError={() => markBroken(index)}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))
              ) : (
                <span className="text-sm text-gray-500">
                  Thumbnails
                </span>
              )}
            </div>
          </section>

          <section className={`${cardClass} space-y-3`}>
            <h2 className="font-semibold text-gray-900">Farmer</h2>

            <div className="flex h-36 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-100 px-4 text-center">
              <span className="text-sm font-medium text-gray-800">
                {farmer.name || "Farmer information unavailable"}
              </span>

              {farmer.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-[#12432f]">
                  <FontAwesomeIcon icon={faCircleCheck} />
                  Verified farmer
                </span>
              )}
            </div>

            <div className="space-y-1 pt-1 text-sm text-gray-600">
              <p>
                Farm location: {farmer.county || "N/A"},{" "}
                {farmer.subCounty || "N/A"}
              </p>

              <p className="text-gray-500">
                Other products from this farmer (
                {farmer.otherProductsCount ?? 0})
              </p>
            </div>

            <button
              type="button"
              onClick={handleViewFarmer}
              className="rounded-lg bg-[#12432f] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-900"
            >
              View farmer profile
            </button>
          </section>
        </div>

        {/* Right column: product info and description */}
        <div className="space-y-5">
          <section className={`${cardClass} space-y-4`}>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {selectedProduct.name}
              </h2>

              <p className="mt-1 text-base font-semibold text-gray-800">
                KSh {selectedProduct.price} / {selectedProduct.unit}
              </p>
            </div>

            <div className="space-y-1.5 text-sm text-gray-600">
              <p>
                Category and variety: {selectedProduct.category} (
                {selectedProduct.variety}) · Quantity available:{" "}
                {selectedProduct.quantityAvailable} · Minimum order:{" "}
                {selectedProduct.minimumOrder}
              </p>

              <p>
                Availability: {selectedProduct.availability} · Harvested:{" "}
                {selectedProduct.harvestedDate} · Shelf life estimate:{" "}
                {selectedProduct.shelfLife}
              </p>

              <p>
                Storage recommendation:{" "}
                {selectedProduct.storageRecommendation}
              </p>
            </div>

            <input
              type="number"
              min="1"
              placeholder={`Quantity (${selectedProduct.unit})`}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-[#12432f]"
            />

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleAction("cart")}
                className="rounded-lg bg-[#12432f] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-green-900"
              >
                Add to cart
              </button>

              <button
                type="button"
                onClick={() => handleAction("order")}
                className="rounded-lg border border-[#12432f] bg-white px-5 py-3 text-sm font-semibold text-[#12432f] transition-colors hover:bg-green-50"
              >
                Place order
              </button>
            </div>

            {!isSignedIn && (
              <p className="text-xs text-gray-500">
                Login is requested here if the visitor is not signed in.
              </p>
            )}

            {message && (
              <p className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {message}
              </p>
            )}

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}
          </section>

          <section className={`${cardClass} space-y-2`}>
            <h2 className="font-semibold text-gray-900">
              Description
            </h2>

            <p className="text-sm leading-relaxed text-gray-600">
              {selectedProduct.description}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default BrowseProducts;
