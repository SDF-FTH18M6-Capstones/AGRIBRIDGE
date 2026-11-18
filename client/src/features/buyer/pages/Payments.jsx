
import React, { useEffect, useMemo, useState } from "react";

const PAYMENTS_KEY = "agribridge-payments";

const Payments = () => {
  const [transactions, setTransactions] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getBuyerId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      return String(user.id || user.user_id || "buyer-1");
    } catch {
      return "buyer-1";
    }
  };

  const loadPayments = () => {
    try {
      return JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const refreshPayments = () => {
      const buyerId = getBuyerId();

      const buyerPayments = loadPayments().filter(
        (payment) => String(payment.buyerId) === buyerId
      );

      setTransactions(buyerPayments);
    };

    refreshPayments();

    window.addEventListener("storage", refreshPayments);
    window.addEventListener("agribridge-update", refreshPayments);

    return () => {
      window.removeEventListener("storage", refreshPayments);
      window.removeEventListener("agribridge-update", refreshPayments);
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesDate =
        !dateFilter || transaction.date === dateFilter;

      const matchesStatus =
        statusFilter === "All" ||
        transaction.status === statusFilter;

      return matchesDate && matchesStatus;
    });
  }, [transactions, dateFilter, statusFilter]);

  const downloadCSV = () => {
    const headers = [
      "Date",
      "Order",
      "Farmer",
      "Amount",
      "Method",
      "Receipt",
      "Status",
    ];

    const rows = filteredTransactions.map((transaction) => [
      transaction.date || "",
      transaction.order || transaction.orderId || "",
      transaction.farmerName || "",
      transaction.amount || 0,
      transaction.method || "M-Pesa",
      transaction.receipt || transaction.mpesaReceipt || "",
      transaction.status || "Pending",
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "buyer-payments.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const totalPaid = transactions
    .filter((transaction) => transaction.status === "Paid")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const totalPending = transactions
    .filter((transaction) => transaction.status === "Pending")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your payment transactions and M-Pesa records.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total paid</p>
          <h2 className="mt-2 text-2xl font-bold text-green-700">
            KSh {totalPaid.toLocaleString("en-KE")}
          </h2>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending payments</p>
          <h2 className="mt-2 text-2xl font-bold text-yellow-700">
            KSh {totalPending.toLocaleString("en-KE")}
          </h2>
        </div>
      </div>

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-base font-bold text-gray-900">
            Payment history
          </h3>

          <button
            type="button"
            onClick={downloadCSV}
            disabled={filteredTransactions.length === 0}
            className="rounded-md bg-[#143d24] px-4 py-2 text-xs font-medium text-white hover:bg-[#1c5231] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download CSV
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Filter by date
            </label>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Filter by status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="All">All statuses</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-gray-600">
                {[
                  "Date",
                  "Order",
                  "Farmer",
                  "Amount",
                  "Method",
                  "Receipt",
                  "Status",
                ].map((heading) => (
                  <th key={heading} className="px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="whitespace-nowrap px-3 py-4">
                      {transaction.date || "—"}
                    </td>
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {transaction.order || transaction.orderId}
                    </td>
                    <td className="px-3 py-4">
                      {transaction.farmerName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      KSh {Number(transaction.amount || 0).toLocaleString("en-KE")}
                    </td>
                    <td className="px-3 py-4">
                      {transaction.method || "M-Pesa"}
                    </td>
                    <td className="px-3 py-4">
                      {transaction.receipt || transaction.mpesaReceipt || "Awaiting"}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : transaction.status === "Failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="7"
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
          Showing {filteredTransactions.length} of {transactions.length} transactions.
        </p>
      </div>
    </div>
  );
};

export default Payments;
