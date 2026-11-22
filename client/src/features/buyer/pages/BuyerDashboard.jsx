
import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBox,
  faMoneyBillWave,
  faClipboardList,
  faHeart,
  faCartShopping,
  faCreditCard,
  faArrowRight,
  faPlus,
  faLeaf,
} from "@fortawesome/free-solid-svg-icons";

const BuyerDashboard = ({ setActiveTab }) => {
  const navigate = useNavigate();

  const stats = [
    {
      label: "Active Orders",
      value: "0",
      icon: faBox,
      description: "Orders in progress",
    },
    {
      label: "Total Spending",
      value: "0",
      icon: faMoneyBillWave,
      description: "Your purchases",
    },
    {
      label: "Buying Requests",
      value: "0",
      icon: faClipboardList,
      description: "Requests submitted",
    },
    {
      label: "Saved Products",
      value: "0",
      icon: faHeart,
      description: "Products saved",
    },
  ];

  const handleNavigation = (tab, path) => {
    if (setActiveTab) {
      setActiveTab(tab);
    } else {
      navigate(path);
    }
  };

  const actionCardStyle =
    "rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:border-green-300 hover:shadow-md";

  return (
    <div className="min-h-full space-y-8 bg-[#f4f7f4] p-5 sm:p-6 lg:p-10">

      {/* Welcome banner */}
      <section className="flex flex-col justify-between gap-6 rounded-2xl bg-[#174832] p-7 text-white shadow-sm md:flex-row md:items-center md:p-8">
        <div>
          <p className="mb-2 text-sm font-medium text-green-100">
            Buyer Portal
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Welcome to AgriBridge!
          </h1>

          <p className="mt-3 max-w-2xl text-sm text-green-50 sm:text-base">
            Discover fresh farm products, connect with farmers and manage
            your purchases from one place.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            handleNavigation("Browse products", "/buyer/products")
          }
          className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-4 font-bold text-[#174832] shadow-sm transition hover:bg-green-50"
        >
          <FontAwesomeIcon icon={faLeaf} />
          Browse Products
        </button>
      </section>

      {/* Overview */}
      <section>
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Overview
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Here's what's happening with your purchases.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-500">
                  {stat.label}
                </p>

                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-lg text-[#174832]">
                  <FontAwesomeIcon icon={stat.icon} />
                </div>
              </div>

              <h3 className="mt-4 text-3xl font-bold text-gray-900">
                {stat.value}
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                {stat.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Orders and buying requests */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* My Orders */}
        <div className="min-h-[250px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              My Orders
            </h3>

            <button
              type="button"
              onClick={() =>
                handleNavigation("My orders", "/buyer/orders")
              }
              className="flex items-center gap-2 text-sm font-semibold text-[#174832] hover:underline"
            >
              View all
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>

          <div className="grid grid-cols-4 border-b border-gray-200 pb-3 text-xs font-semibold text-gray-600 sm:text-sm">
            <span>Order #</span>
            <span>Product</span>
            <span>Status</span>
            <span>Payment</span>
          </div>

          <div className="flex min-h-[110px] items-center justify-center text-sm text-gray-400">
            No orders available yet.
          </div>

          <p className="text-xs text-gray-500">
            Track your orders and monitor their progress.
          </p>
        </div>

        {/* Buying Requests */}
        <div className="min-h-[250px] rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              Buying Requests
            </h3>

            <button
              type="button"
              onClick={() =>
                handleNavigation("Buying requests", "/buyer/requests")
              }
              className="flex items-center gap-2 text-sm font-semibold text-[#174832] hover:underline"
            >
              View all
              <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </div>

          <div className="grid grid-cols-3 border-b border-gray-200 pb-3 text-xs font-semibold text-gray-600 sm:text-sm">
            <span>Product</span>
            <span>Quantity</span>
            <span>Responses</span>
          </div>

          <div className="flex min-h-[110px] items-center justify-center text-sm text-gray-400">
            No buying requests available yet.
          </div>

          <button
            type="button"
            onClick={() =>
              handleNavigation("Buying requests", "/buyer/requests")
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#174832] px-5 py-3 font-bold text-white transition hover:bg-[#103923]"
          >
            <FontAwesomeIcon icon={faPlus} />
            Post a Buying Request
          </button>
        </div>
      </section>

      {/* Quick access */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">

        <button
          type="button"
          onClick={() => handleNavigation("Cart", "/buyer/cart")}
          className={actionCardStyle}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-lg text-[#174832]">
            <FontAwesomeIcon icon={faCartShopping} />
          </div>

          <h3 className="text-lg font-bold text-[#174832]">
            My Cart
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            View selected products, quantities and your order total.
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleNavigation("Payments", "/buyer/payments")}
          className={actionCardStyle}
        >
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-lg text-[#174832]">
            <FontAwesomeIcon icon={faCreditCard} />
          </div>

          <h3 className="text-lg font-bold text-[#174832]">
            Payments
          </h3>

          <p className="mt-2 text-sm text-gray-500">
            View your payment history and M-Pesa transactions.
          </p>
        </button>

      </section>
    </div>
  );
};

export default BuyerDashboard;
