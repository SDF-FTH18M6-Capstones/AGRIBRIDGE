
import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faCircleCheck,
  faLocationDot,
  faBoxOpen,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

function FarmerProfile() {
  const navigate = useNavigate();
  const location = useLocation();
  const { farmerId } = useParams();

  const farmer = location.state?.farmer;

  const cardClass = "rounded-xl border border-gray-200 bg-white p-5";

  if (!farmer) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => navigate("/buyer/browse")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to products
        </button>

        <div className={cardClass}>
          <h1 className="text-xl font-bold text-gray-900">
            Farmer profile unavailable
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            We could not find the farmer details. Please return to Browse
            Products and select the farmer's profile again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1f2933]">
            Farmer Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View farmer information and farm details.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate("/buyer/browse")}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to products
        </button>
      </div>

      <section className={`${cardClass} space-y-5`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-50 text-4xl text-[#12432f]">
            <FontAwesomeIcon icon={faUser} />
          </div>

          <div className="text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold text-gray-900">
                {farmer.name}
              </h2>

              {farmer.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                  <FontAwesomeIcon icon={faCircleCheck} />
                  Verified farmer
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Farmer ID: {farmer.id || farmer.farmerId || farmerId}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-5">
          <h3 className="mb-4 font-semibold text-gray-900">
            Farm Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <FontAwesomeIcon icon={faLocationDot} />
                Farm Location
              </div>
              <p className="font-semibold text-gray-900">
                {farmer.county || "Not provided"}
              </p>
              <p className="text-sm text-gray-600">
                {farmer.subCounty || "Not provided"}
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
                <FontAwesomeIcon icon={faBoxOpen} />
                Other Products
              </div>
              <p className="text-2xl font-bold text-[#12432f]">
                {farmer.otherProductsCount ?? 0}
              </p>
              <p className="text-sm text-gray-600">
                Products from this farmer
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className={`${cardClass} space-y-3`}>
        <h3 className="font-semibold text-gray-900">
          About the Farmer
        </h3>

        <p className="text-sm leading-relaxed text-gray-600">
          {farmer.description ||
            `${farmer.name} is a farmer based in ${farmer.county || "Kenya"}. View available products from this farmer through the Browse Products page.`}
        </p>
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => navigate("/buyer/browse")}
          className="rounded-lg bg-[#12432f] px-5 py-3 text-sm font-semibold text-white hover:bg-green-900"
        >
          Browse products
        </button>
      </div>
    </div>
  );
}

export default FarmerProfile;
