
import React, { useEffect, useState } from "react";

const STORAGE_KEY = "agribridge-orders";
const PRODUCTS_KEY = "agribridge-farmer-products";
const PAYMENTS_KEY = "agribridge-payments";

const Cart = () => {
  const [cartItems, setCartItems] = useState([
    {
      id: 1,
      product: "Grade 1 Hass Avocados",
      farmer: "Kiambu Fresh Farms",
      farmerId: "farmer-1",
      qty: 20,
      maxAvailable: 500,
      unit: "kg",
      unitPrice: 85,
    },
  ]);

  const [orderPlaced, setOrderPlaced] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Waiting for payment");
  const [message, setMessage] = useState("");
  const [placedOrders, setPlacedOrders] = useState([]);

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.qty * item.unitPrice,
    0
  );

  const getBuyer = () => {
    try {
      return JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      return {};
    }
  };

  const loadOrders = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  };

  const loadPayments = () => {
    try {
      return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];
    } catch {
      return [];
    }
  };

  // Refresh order information when another dashboard changes an order.
  useEffect(() => {
    const refreshOrders = () => {
      if (placedOrders.length === 0) return;

      const allOrders = loadOrders();

      const updatedOrders = allOrders.filter((order) =>
        placedOrders.some(
          (placedOrder) => String(placedOrder.id) === String(order.id)
        )
      );

      setPlacedOrders(updatedOrders);
    };

    window.addEventListener("storage", refreshOrders);
    window.addEventListener("agribridge-update", refreshOrders);

    return () => {
      window.removeEventListener("storage", refreshOrders);
      window.removeEventListener("agribridge-update", refreshOrders);
    };
  }, [placedOrders]);

  const handleQtyChange = (id, newQty, maxAvailable) => {
    const validQty = Math.max(
      1,
      Math.min(Number(newQty) || 1, maxAvailable)
    );

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, qty: validQty } : item
      )
    );
  };

  const getFarmerId = (item) => {
    if (item.farmerId || item.sellerId) {
      return item.farmerId || item.sellerId;
    }

    try {
      const farmerProducts =
        JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];

      const matchingProduct = farmerProducts.find(
        (product) =>
          String(product.name || product.product).toLowerCase() ===
          String(item.product).toLowerCase()
      );

      return (
        matchingProduct?.farmerId ||
        matchingProduct?.sellerId ||
        matchingProduct?.userId ||
        null
      );
    } catch {
      return null;
    }
  };

  // Save orders for the buyer, farmer and admin.
  const handlePlaceOrder = () => {
    if (cartItems.length === 0) return;

    try {
      const buyer = getBuyer();

      const buyerId = buyer.id || buyer.user_id || "buyer-1";
      const buyerName =
        buyer.fullName || buyer.name || buyer.username || "Sample buyer";

      const allOrders = loadOrders();

      const newOrders = cartItems.map((item) => {
        const farmerId = getFarmerId(item);

        if (!farmerId) {
          throw new Error(
            `The farmer ID for ${item.product} is missing.`
          );
        }

        const now = new Date().toISOString();

        return {
          id: `AB-${Date.now()}-${item.id}`,
          buyerId,
          buyerName,
          farmerId,
          farmerName: item.farmer,
          productId: item.id,
          product: item.product,
          qty: item.qty,
          quantity: item.qty,
          unit: item.unit || "kg",
          price: item.unitPrice,
          total: item.qty * item.unitPrice,
          status: "Awaiting farmer",
          paymentStatus: "Not paid",
          location: item.location || "",
          timeline: [
            {
              label: "Order placed",
              at: now,
            },
          ],
          createdAt: now,
        };
      });

      const updatedOrders = [...allOrders, ...newOrders];

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedOrders)
      );

      setPlacedOrders(newOrders);
      setOrderPlaced(true);
      setMessage("Your order has been sent to the farmer.");

      window.dispatchEvent(new Event("agribridge-update"));
    } catch (error) {
      setMessage(error.message || "Unable to place your order.");
    }
  };

  // Create shared payment records after the farmer accepts the order.
  const handleMpesaPay = (e) => {
    e.preventDefault();

    const phone = phoneNumber.trim();

    if (!phone) {
      setPaymentStatus("Please enter your M-Pesa phone number.");
      return;
    }

    if (!/^(?:\+254|254|0)7\d{8}$/.test(phone)) {
      setPaymentStatus("Enter a valid Kenyan M-Pesa phone number.");
      return;
    }

    if (acceptedOrders.length === 0) {
      setPaymentStatus("There are no accepted orders to pay for.");
      return;
    }

    try {
      const allOrders = loadOrders();
      const allPayments = loadPayments();

      const updatedPayments = [...allPayments];

      acceptedOrders.forEach((order) => {
        const existingIndex = updatedPayments.findIndex(
          (payment) =>
            String(payment.orderId) === String(order.id)
        );

        const existingPayment =
          existingIndex >= 0 ? updatedPayments[existingIndex] : null;

        // Do not overwrite a payment that has already been confirmed.
        if (existingPayment?.status === "Paid") {
          return;
        }

        const now = new Date().toISOString();

        const paymentRecord = {
          id: existingPayment?.id || `PAY-${order.id}`,
          orderId: order.id,
          order: order.id,
          buyerId: order.buyerId,
          buyerName: order.buyerName,
          farmerId: order.farmerId,
          farmerName: order.farmerName,
          amount: Number(order.total || 0),
          date: now.slice(0, 10),
          createdAt: existingPayment?.createdAt || now,
          method: "M-Pesa",
          phoneNumber: phone,
          receipt: existingPayment?.receipt || "",
          mpesaReceipt: existingPayment?.mpesaReceipt || "",
          status: "Pending",
        };

        if (existingIndex >= 0) {
          updatedPayments[existingIndex] = paymentRecord;
        } else {
          updatedPayments.push(paymentRecord);
        }
      });

      const updatedOrders = allOrders.map((order) => {
        const isAcceptedOrder = acceptedOrders.some(
          (acceptedOrder) =>
            String(acceptedOrder.id) === String(order.id)
        );

        if (!isAcceptedOrder) return order;

        return {
          ...order,
          paymentStatus:
            order.paymentStatus === "Paid" ? "Paid" : "Pending",
        };
      });

      localStorage.setItem(
        PAYMENTS_KEY,
        JSON.stringify(updatedPayments)
      );

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedOrders)
      );

      const refreshedOrders = updatedOrders.filter((order) =>
        acceptedOrders.some(
          (acceptedOrder) =>
            String(acceptedOrder.id) === String(order.id)
        )
      );

      setPlacedOrders((previous) =>
        previous.map((order) => {
          const updated = refreshedOrders.find(
            (item) => String(item.id) === String(order.id)
          );

          return updated || order;
        })
      );

      setPaymentStatus(
        "Payment request recorded. Waiting for M-Pesa confirmation."
      );

      window.dispatchEvent(new Event("agribridge-update"));
    } catch (error) {
      setPaymentStatus(
        error.message || "Unable to save payment request."
      );
    }
  };

  const acceptedOrders = placedOrders.filter(
    (order) => order.status === "Accepted"
  );

  const declinedOrders = placedOrders.filter(
    (order) => order.status === "Declined"
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-5">
        {/* Cart */}
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5 lg:col-span-3">
          <h3 className="text-base font-bold text-gray-900">
            Cart
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-600">
                  <th className="py-2.5">Product</th>
                  <th className="py-2.5">Farmer</th>
                  <th className="py-2.5">Qty</th>
                  <th className="py-2.5 text-right">Price</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200 text-xs text-gray-800">
                {cartItems.length > 0 ? (
                  cartItems.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 font-medium">
                        {item.product}
                      </td>

                      <td className="py-3 text-gray-600">
                        {item.farmer}
                      </td>

                      <td className="py-3">
                        <input
                          type="number"
                          min="1"
                          max={item.maxAvailable}
                          value={item.qty}
                          disabled={orderPlaced}
                          onChange={(e) =>
                            handleQtyChange(
                              item.id,
                              e.target.value,
                              item.maxAvailable
                            )
                          }
                          className="w-16 rounded border border-gray-300 px-2 py-1 text-xs"
                        />
                      </td>

                      <td className="py-3 text-right font-medium">
                        KSh{" "}
                        {(item.qty * item.unitPrice).toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="py-6 text-center text-gray-500"
                    >
                      Your cart is empty.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-500">
            Quantity cannot exceed what the farmer has available.
          </p>

          <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-sm font-bold text-gray-900">
            <span>Total</span>
            <span>KSh {totalAmount.toLocaleString()}</span>
          </div>
        </div>

        {/* Ordering instructions */}
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5 lg:col-span-2">
          <h3 className="text-base font-bold text-gray-900">
            How ordering works
          </h3>

          <ol className="list-inside list-decimal space-y-2 text-xs text-gray-600">
            <li>Place order: farmer receives the order.</li>
            <li>Farmer accepts or declines.</li>
            <li>If accepted, pay by M-Pesa.</li>
            <li>Order is confirmed after payment confirmation.</li>
          </ol>

          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={cartItems.length === 0 || orderPlaced}
            className="rounded-md bg-[#143d24] px-5 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#1c5231] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {orderPlaced ? "Order placed" : "Place order"}
          </button>

          {message && (
            <p className="text-xs font-medium text-green-700">
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Order status */}
      {placedOrders.length > 0 && (
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5">
          <h3 className="text-base font-bold text-gray-900">
            Your order status
          </h3>

          {placedOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col justify-between gap-2 border-b border-gray-100 pb-3 text-sm sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-semibold text-gray-900">
                  {order.product}
                </p>

                <p className="text-xs text-gray-500">
                  {order.farmerName} · Order #{order.id}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Payment: {order.paymentStatus || "Not paid"}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1 text-xs font-medium ${
                  order.status === "Accepted"
                    ? "bg-green-100 text-green-800"
                    : order.status === "Declined"
                    ? "bg-red-100 text-red-800"
                    : order.status === "Completed"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {order.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* M-Pesa payment: only after farmer accepts */}
      {acceptedOrders.length > 0 && (
        <div className="space-y-4 rounded-lg border border-gray-300 bg-white p-5">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Pay with M-Pesa
            </h3>

            <p className="mt-1 text-xs text-gray-600">
              Your farmer has accepted your order. You can now proceed to payment.
            </p>
          </div>

          <form onSubmit={handleMpesaPay} className="space-y-3">
            <input
              type="tel"
              placeholder="M-Pesa phone number (e.g. 0712345678)"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-md border border-gray-400 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-[#143d24] focus:outline-none"
            />

            <p className="text-xs text-gray-600">
              Your payment request will be recorded. Real M-Pesa confirmation will be connected through the backend.
            </p>

            <button
              type="submit"
              className="rounded-md bg-[#143d24] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#1c5231]"
            >
              Continue with payment · KSh{" "}
              {acceptedOrders
                .reduce((sum, order) => sum + Number(order.total || 0), 0)
                .toLocaleString()}
            </button>
          </form>

          <p className="text-xs font-medium text-gray-600">
            Status: {paymentStatus}
          </p>
        </div>
      )}

      {declinedOrders.length > 0 && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          The farmer declined one or more of your orders. Please check your order status.
        </p>
      )}
    </div>
  );
};

export default Cart;
