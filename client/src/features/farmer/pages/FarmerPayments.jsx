
import { useEffect, useMemo, useState } from "react";

const PAYMENTS_KEY = "agribridge-payments";

function getFarmerId() {
  try {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    return String(user.id || user.user_id || "farmer-1");
  } catch {
    return "farmer-1";
  }
}

function loadPayments() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PAYMENTS_KEY) || "[]"
    );

    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

const getPaymentStatus = (payment) => {
  const status = String(payment.status || "Pending").toLowerCase();

  if (status === "received" || status === "paid" || status === "completed") {
    return "Paid";
  }

  if (status === "failed" || status === "cancelled") {
    return "Failed";
  }

  return "Pending";
};

const formatKsh = (amount) =>
  `KSh ${Number(amount || 0).toLocaleString("en-KE")}`;

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function PaymentsReceivedPage() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const refreshPayments = () => {
      const farmerId = getFarmerId();

      const farmerPayments = loadPayments().filter(
        (payment) =>
          String(payment.farmerId || payment.sellerId || "") === farmerId
      );

      setPayments(farmerPayments);
    };

    refreshPayments();

    window.addEventListener("storage", refreshPayments);
    window.addEventListener("agribridge-update", refreshPayments);

    return () => {
      window.removeEventListener("storage", refreshPayments);
      window.removeEventListener("agribridge-update", refreshPayments);
    };
  }, []);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch = [
        payment.order,
        payment.orderId,
        payment.buyerName,
        payment.buyer,
        payment.date,
        payment.receipt,
        payment.mpesaReceipt,
        payment.method,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        getPaymentStatus(payment) === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const totalReceived = payments
    .filter((payment) => getPaymentStatus(payment) === "Paid")
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

  const totalPending = payments
    .filter((payment) => getPaymentStatus(payment) === "Pending")
    .reduce(
      (sum, payment) => sum + Number(payment.amount || 0),
      0
    );

  const downloadCSV = () => {
    const headers = [
      "Date",
      "Order",
      "Buyer",
      "Amount",
      "Method",
      "Receipt",
      "Status",
    ];

    const rows = filteredPayments.map((payment) => [
      payment.date || "",
      payment.order || payment.orderId || "",
      payment.buyerName || payment.buyer || "",
      payment.amount || 0,
      payment.method || "M-Pesa",
      payment.receipt || payment.mpesaReceipt || "",
      getPaymentStatus(payment),
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "farmer-payments.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Payments Received
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          View payments connected to your orders.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total received</p>

          <h2 className="mt-2 text-2xl font-bold text-green-700">
            {formatKsh(totalReceived)}
          </h2>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending payments</p>

          <h2 className="mt-2 text-2xl font-bold text-yellow-700">
            {formatKsh(totalPending)}
          </h2>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-base font-bold text-gray-900">
            Payment transactions
          </h3>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={filteredPayments.length === 0}
            className="rounded-md bg-[#143d24] px-4 py-2 text-xs font-medium text-white hover:bg-[#1c5231] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Search order, buyer or date..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="All">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-600">
                {[
                  "Date",
                  "Order",
                  "Buyer",
                  "Amount",
                  "Method",
                  "Receipt",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-3 py-3 font-semibold"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => {
                  const status = getPaymentStatus(payment);

                  return (
                    <tr key={payment.id}>
                      <td className="whitespace-nowrap px-3 py-4">
                        {formatDate(payment.date || payment.createdAt)}
                      </td>

                      <td className="px-3 py-4 font-medium text-gray-900">
                        {payment.order || payment.orderId || "—"}
                      </td>

                      <td className="px-3 py-4">
                        {payment.buyerName || payment.buyer || "—"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4">
                        {formatKsh(payment.amount)}
                      </td>

                      <td className="px-3 py-4">
                        {payment.method || "M-Pesa"}
                      </td>

                      <td className="px-3 py-4">
                        {payment.receipt ||
                          payment.mpesaReceipt ||
                          "Awaiting"}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            status === "Paid"
                              ? "bg-green-100 text-green-700"
                              : status === "Failed"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-10 text-center text-gray-500"
                  >
                    No payment transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-500">
          Showing {filteredPayments.length} of {payments.length} transactions.
        </p>
      </div>
    </div>
  );
}

export default PaymentsReceivedPage;
