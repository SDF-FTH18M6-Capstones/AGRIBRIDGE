
import { useState } from "react";
import { Link } from "react-router-dom";

const INITIAL_CART = {
  id: 1,
  name: "Fresh tomatoes",
  farmer: "Jane Wanjiku",
  location: "Nakuru",
  price: 120,
  quantity: 3,
  unit: "kg",
};

const DELIVERY_FEE = 150;

const formatKES = (amount) =>
  `KES ${amount.toLocaleString("en-KE")}`;

export default function CheckoutPage() {
  const [cart, setCart] = useState(INITIAL_CART);
  const [paymentMethod, setPaymentMethod] = useState("mpesa");
  const [delivery, setDelivery] = useState({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    notes: "",
    mpesaPhone: "",
  });
  const [message, setMessage] = useState("");

  const subtotal = cart ? cart.price * cart.quantity : 0;
  const deliveryFee = cart ? DELIVERY_FEE : 0;
  const total = subtotal + deliveryFee;

  const updateDelivery = (event) => {
    const { name, value } = event.target;
    setDelivery((previous) => ({
      ...previous,
      [name]: value,
    }));
    setMessage("");
  };

  const changeQuantity = (amount) => {
    setCart((previous) =>
      previous
        ? {
            ...previous,
            quantity: Math.max(1, previous.quantity + amount),
          }
        : null
    );
  };

  const handleConfirm = (event) => {
    event.preventDefault();

    if (!cart) {
      setMessage("Your cart is empty.");
      return;
    }

    const phonePattern = /^(?:\+254|254|0)[17]\d{8}$/;

    if (!phonePattern.test(delivery.phone.trim())) {
      setMessage("Enter a valid Kenyan phone number.");
      return;
    }

    if (
      paymentMethod === "mpesa" &&
      !phonePattern.test(delivery.mpesaPhone.trim())
    ) {
      setMessage("Enter a valid M-Pesa phone number.");
      return;
    }

    setMessage(
      "Checkout details validated. This is a demo; no order or payment has been submitted."
    );
  };

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100";

  const labelClass = "mb-2 block text-sm font-medium text-gray-700";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold">
          Shopping cart & checkout
        </h1>

        {/* Checkout progress */}
        <div className="mt-5 flex flex-wrap items-center gap-2 text-sm font-medium text-green-800 sm:gap-4">
          <span>1. Review cart</span>
          <span>→</span>
          <span>2. Delivery</span>
          <span>→</span>
          <span>3. Payment</span>
          <span>→</span>
          <span>4. Confirm</span>
        </div>

        <form onSubmit={handleConfirm} className="mt-10">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
            {/* Left column */}
            <div className="space-y-8 lg:col-span-3">
              <section>
                <h2 className="mb-5 text-2xl font-semibold">
                  Your cart ({cart ? "1 product" : "0 products"})
                </h2>

                {cart ? (
                  <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-col gap-5 sm:flex-row">
                      <div className="flex h-36 w-full shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-700 sm:w-40">
                        <span className="text-center text-sm">
                          Product image
                        </span>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-xl font-semibold">
                          {cart.name}
                        </h3>
                        <p className="mt-1 text-gray-500">
                          {cart.farmer} · {cart.location}
                        </p>
                        <p className="mt-3 font-medium text-green-800">
                          {formatKES(cart.price)} / {cart.unit}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => changeQuantity(-1)}
                              disabled={cart.quantity === 1}
                              aria-label="Decrease quantity"
                              className="rounded-lg border px-4 py-2 disabled:opacity-40"
                            >
                              −
                            </button>

                            <span className="font-semibold">
                              {cart.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => changeQuantity(1)}
                              aria-label="Increase quantity"
                              className="rounded-lg border px-4 py-2"
                            >
                              +
                            </button>

                            <span className="text-gray-500">
                              {cart.unit}
                            </span>
                          </div>

                          <span className="font-bold">
                            {formatKES(subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCart(null)}
                      className="mt-5 text-sm font-medium text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl bg-white p-8 text-center text-gray-500">
                    Your shopping cart is empty.
                  </div>
                )}

                <Link
                  to="/marketplace"
                  className="mt-5 inline-block font-medium text-green-800 hover:underline"
                >
                  ← Continue shopping
                </Link>
              </section>

              {/* Delivery information */}
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Delivery information
                </h2>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="fullName" className={labelClass}>
                      Full name
                    </label>
                    <input
                      id="fullName"
                      name="fullName"
                      value={delivery.fullName}
                      onChange={updateDelivery}
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
                      type="tel"
                      value={delivery.phone}
                      onChange={updateDelivery}
                      placeholder="0712345678"
                      className={inputClass}
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="address" className={labelClass}>
                      Delivery address
                    </label>
                    <input
                      id="address"
                      name="address"
                      value={delivery.address}
                      onChange={updateDelivery}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="city" className={labelClass}>
                      Town / city
                    </label>
                    <input
                      id="city"
                      name="city"
                      value={delivery.city}
                      onChange={updateDelivery}
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className={labelClass}>
                      Delivery notes (optional)
                    </label>
                    <input
                      id="notes"
                      name="notes"
                      value={delivery.notes}
                      onChange={updateDelivery}
                      className={inputClass}
                    />
                  </div>
                </div>

                <p className="mt-6 text-sm text-gray-500">
                  Order tracking will be available through My Orders
                  once checkout is connected to the backend.
                </p>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-8 lg:col-span-2">
              {/* Order summary */}
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Order summary
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatKES(subtotal)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-600">Delivery fee</span>
                    <span>{formatKES(deliveryFee)}</span>
                  </div>

                  <div className="flex justify-between border-t pt-5 text-xl font-bold">
                    <span>Total</span>
                    <span className="text-green-800">
                      {formatKES(total)}
                    </span>
                  </div>
                </div>

                {cart && (
                  <p className="mt-5 text-sm text-gray-500">
                    1 product · {cart.quantity} {cart.unit} of{" "}
                    {cart.name.toLowerCase()}
                  </p>
                )}
              </section>

              {/* Payment */}
              <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <h2 className="mb-6 text-2xl font-semibold">
                  Payment method
                </h2>

                <div className="space-y-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="mpesa"
                      checked={paymentMethod === "mpesa"}
                      onChange={() => {
                        setPaymentMethod("mpesa");
                        setMessage("");
                      }}
                      className="accent-green-700"
                    />
                    M-Pesa
                  </label>

                  <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-4">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="delivery"
                      checked={paymentMethod === "delivery"}
                      onChange={() => {
                        setPaymentMethod("delivery");
                        setMessage("");
                      }}
                      className="accent-green-700"
                    />
                    Pay on delivery
                  </label>

                  {paymentMethod === "mpesa" && (
                    <div>
                      <label
                        htmlFor="mpesaPhone"
                        className={labelClass}
                      >
                        M-Pesa phone number
                      </label>
                      <input
                        id="mpesaPhone"
                        name="mpesaPhone"
                        type="tel"
                        placeholder="0712345678"
                        value={delivery.mpesaPhone}
                        onChange={updateDelivery}
                        className={inputClass}
                        required
                      />
                      <p className="mt-3 text-sm text-gray-500">
                        Once M-Pesa is integrated, a payment request
                        can be sent to this number.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!cart}
                  className="mt-7 w-full rounded-lg bg-green-700 px-6 py-4 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Confirm Order →
                </button>

                <p className="mt-4 text-center text-sm font-medium text-gray-600">
                  Total payable: {formatKES(total)}
                </p>

                {message && (
                  <p
                    role="status"
                    className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900"
                  >
                    {message}
                  </p>
                )}
              </section>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
