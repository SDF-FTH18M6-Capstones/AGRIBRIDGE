
import React from "react";
import { useNavigate } from "react-router-dom";

const BuyerDashboard = ({ setActiveTab }) => {
  const navigate = useNavigate();

  const stats = [
    { label: "Active orders", value: "0" },
    { label: "Spending", value: "0" },
    { label: "Open requests", value: "0" },
    { label: "Saved items", value: "0" },
  ];

  const handleNavigation = (tab, path) => {
    if (setActiveTab) {
      setActiveTab(tab);
    } else {
      navigate(path);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top 4 Stat Cards */}
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-gray-300 bg-white p-4"
            >
              <p className="mb-1 text-xs font-medium text-gray-500">
                {stat.label}
              </p>
              <p className="text-xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-2 text-xs text-gray-500">
          Cards: active orders, spending, open requests, saved items
        </p>
      </div>

      {/* Middle Row: My orders & Buying requests */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My orders */}
        <div className="flex min-h-[210px] flex-col justify-between rounded-lg border border-gray-300 bg-white p-5">
          <div>
            <h3 className="mb-4 text-base font-bold text-gray-900">
              My orders
            </h3>

            <div className="grid grid-cols-4 border-b border-gray-200 pb-2 text-xs font-medium text-gray-600">
              <span>Order [#]</span>
              <span>Product</span>
              <span>Status</span>
              <span>Pay now</span>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Statuses: Awaiting farmer, Accepted, Paid, Completed, Declined
            </p>
          </div>
        </div>

        {/* Buying requests */}
        <div className="flex min-h-[210px] flex-col justify-between rounded-lg border border-gray-300 bg-white p-5">
          <div>
            <h3 className="mb-4 text-base font-bold text-gray-900">
              Buying requests
            </h3>

            <div className="grid grid-cols-3 border-b border-gray-200 pb-2 text-xs font-medium text-gray-600">
              <span>Product</span>
              <span>Quantity</span>
              <span>Responses</span>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={() =>
                handleNavigation("Buying requests", "/buyer/requests")
              }
              className="w-full rounded-md bg-[#143d24] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1c5231]"
            >
              Post a buying request
            </button>

            <p className="mt-2 text-xs text-gray-500">
              Form: product, quantity, price range, location, needed-by date,
              quality notes
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Row: Cart & Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => handleNavigation("Cart", "/buyer/cart")}
          className="rounded-lg border border-gray-300 bg-white p-5 text-left transition-colors hover:border-gray-400"
        >
          <h3 className="mb-1 text-base font-bold text-gray-900">
            Cart
          </h3>
          <p className="text-xs text-gray-500">
            Items, quantities, total, Place order (farmer must accept before
            payment)
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleNavigation("Payments", "/buyer/payments")}
          className="rounded-lg border border-gray-300 bg-white p-5 text-left transition-colors hover:border-gray-400"
        >
          <h3 className="mb-1 text-base font-bold text-gray-900">
            Payments
          </h3>
          <p className="text-xs text-gray-500">
            M-Pesa transaction history
          </p>
        </button>
      </div>
    </div>
  );
};

export default BuyerDashboard;
