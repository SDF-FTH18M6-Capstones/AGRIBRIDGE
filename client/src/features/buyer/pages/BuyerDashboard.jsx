
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

  const actionCardStyle =
    "group rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700";

  return (
    <div className="space-y-6">
      <div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-h-[210px] flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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

        <div className="flex min-h-[210px] flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
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
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#174832] px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#103923] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <button
          type="button"
          onClick={() => handleNavigation("Cart", "/buyer/cart")}
          className={actionCardStyle}
        >
          <h3 className="mb-1 text-base font-bold text-[#174832] group-hover:underline">
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
          className={actionCardStyle}
        >
          <h3 className="mb-1 text-base font-bold text-[#174832] group-hover:underline">
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
