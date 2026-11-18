
import { useState } from "react";
import { Link } from "react-router-dom";

const buyerTypes = [
  { value: "household", label: "Household" },
  { value: "shop", label: "Shop" },
  { value: "supermarket", label: "Supermarket" },
  { value: "hotel_restaurant", label: "Hotel / Restaurant" },
  { value: "wholesaler", label: "Wholesaler" },
];

export default function RoleSelectionPage() {
  const [buyerType, setBuyerType] = useState("");
  const [message, setMessage] = useState("");

  function handleFarmer() {
    // TODO: Submit farmer role to backend.
    // Backend must confirm role before dashboard access.
    setMessage(
      "Farmer onboarding is awaiting backend integration."
    );
  }

  function handleBuyer() {
    if (!buyerType) {
      setMessage("Please select your buyer type.");
      return;
    }

    // TODO: Submit buyer role and buyer type to backend.
    // Backend must confirm role before dashboard access.
    setMessage(
      "Buyer onboarding is awaiting backend integration."
    );
  }

  return (
    <main className="min-h-[75vh] bg-[#f7faf6] px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10 text-center">
          <Link
            to="/"
            className="text-3xl font-extrabold text-green-800"
          >
            AgriBridge
          </Link>

          <p className="mt-6 text-sm font-semibold text-green-700">
            Step 2 of 2 · First-time setup
          </p>

          <h1 className="mt-3 text-3xl font-bold text-green-950">
            How do you want to use AgriBridge?
          </h1>

          <p className="mt-3 text-gray-600">
            Choose how you would like to get started.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* FARMER CARD */}
          <section className="flex flex-col rounded-2xl border border-green-100 bg-white p-7 shadow-sm">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
              
            </div>

            <h2 className="text-2xl font-bold text-green-950">
              I want to sell produce
            </h2>

            <p className="mt-4 text-gray-600">
              List your farm produce, receive orders and
              respond to buyer requests.
            </p>

            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Verification is required before you can
              publish produce listings.
            </p>

            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={handleFarmer}
                className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900"
              >
                Continue as Farmer
              </button>
            </div>
          </section>

          {/* BUYER CARD */}
          <section className="flex flex-col rounded-2xl border border-green-100 bg-white p-7 shadow-sm">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-3xl">
              
            </div>

            <h2 className="text-2xl font-bold text-green-950">
              I want to buy produce
            </h2>

            <p className="mt-4 text-gray-600">
              Browse verified farmers, place orders
              and post buying requests.
            </p>

            <div className="mt-6">
              <label
                htmlFor="buyer-type"
                className="mb-2 block text-sm font-semibold text-gray-800"
              >
                Buyer type
              </label>

              <select
                id="buyer-type"
                value={buyerType}
                onChange={(event) => {
                  setBuyerType(event.target.value);
                  setMessage("");
                }}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100"
              >
                <option value="">Select buyer type</option>
                {buyerTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-auto pt-8">
              <button
                type="button"
                onClick={handleBuyer}
                className="w-full rounded-lg bg-green-800 px-5 py-3 font-semibold text-white transition hover:bg-green-900"
              >
                Continue as Buyer
              </button>
            </div>
          </section>
        </div>

        {message && (
          <p
            role="status"
            className="mx-auto mt-6 max-w-xl rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-900"
          >
            {message}
          </p>
        )}

        <p className="mt-8 text-center text-sm text-gray-600">
          You can add the other role later from your
          account menu: Switch to Buyer / Switch to Farmer.
        </p>
      </div>
    </main>
  );
}
