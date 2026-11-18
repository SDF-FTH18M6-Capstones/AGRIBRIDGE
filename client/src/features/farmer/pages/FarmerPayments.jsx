
import { useEffect, useMemo, useState } from "react";

const PAYMENTS_KEY = "agribridge-payments";

function PaymentsReceivedPage() {
  const [payments, setPayments] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const getFarmerId = () => {
    try {
      const user = JSON.parse(localStorage.getItem("user")) || {};
      return String(user.id || user.user_id || "farmer-1");
    } catch {
      return "farmer-1";
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
      const farmerId = getFarmerId();

      const farmerPayments = loadPayments().filter(
        (payment) => String(payment.farmerId) === farmerId
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
      const searchText = search.toLowerCase();

      const matchesSearch =
        String(payment.order || payment.orderId || "")
          .toLowerCase()
          .includes(searchText) ||
        String(payment.buyerName || "")
          .toLowerCase()
          .includes(searchText) ||
        String(payment.date || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" || payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [payments, search, statusFilter]);

  const totalReceived = payments
    .filter((payment) => payment.status === "Paid")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

  const totalPending = payments
    .filter((payment) => payment.status === "Pending")
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);

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
      payment.buyerName || "",
      payment.amount || 0,
      payment.method || "M-Pesa",
      payment.receipt || payment.mpesaReceipt || "",
      payment.status || "Pending",
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
            KSh {totalReceived.toLocaleString("en-KE")}
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
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />

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
                  <th key={heading} className="px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap px-3 py-4">
                      {payment.date || "—"}
                    </td>
                    <td className="px-3 py-4 font-medium text-gray-900">
                      {payment.order || payment.orderId}
                    </td>
                    <td className="px-3 py-4">
                      {payment.buyerName || "—"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4">
                      KSh {Number(payment.amount || 0).toLocaleString("en-KE")}
                    </td>
                    <td className="px-3 py-4">
                      {payment.method || "M-Pesa"}
                    </td>
                    <td className="px-3 py-4">
                      {payment.receipt || payment.mpesaReceipt || "Awaiting"}
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          payment.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : payment.status === "Failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {payment.status}
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
          Showing {filteredPayments.length} of {payments.length} transactions.
        </p>
      </div>
    </div>
  );
}

export default PaymentsReceivedPage;
