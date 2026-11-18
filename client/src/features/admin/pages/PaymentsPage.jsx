
import { useEffect, useMemo, useState } from "react";

const PAYMENTS_KEY = "agribridge-payments";

function PaymentsPage() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    const refreshPayments = () => {
      try {
        const savedPayments =
          JSON.parse(localStorage.getItem(PAYMENTS_KEY)) || [];

        setTransactions(savedPayments);
      } catch {
        setTransactions([]);
      }
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
      const searchText = search.toLowerCase();

      const matchesSearch =
        String(transaction.date || "").toLowerCase().includes(searchText) ||
        String(transaction.order || transaction.orderId || "")
          .toLowerCase()
          .includes(searchText) ||
        String(transaction.buyerName || "")
          .toLowerCase()
          .includes(searchText) ||
        String(transaction.farmerName || "")
          .toLowerCase()
          .includes(searchText);

      const matchesStatus =
        statusFilter === "All" ||
        transaction.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [transactions, search, statusFilter]);

  const totalPaid = transactions
    .filter((transaction) => transaction.status === "Paid")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const totalPending = transactions
    .filter((transaction) => transaction.status === "Pending")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const totalFailed = transactions
    .filter((transaction) => transaction.status === "Failed")
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

  const downloadCSV = () => {
    const headers = [
      "Date",
      "Order",
      "Buyer",
      "Farmer",
      "Amount",
      "Method",
      "Receipt",
      "Status",
    ];

    const rows = filteredTransactions.map((transaction) => [
      transaction.date || "",
      transaction.order || transaction.orderId || "",
      transaction.buyerName || "",
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
    link.download = "agribridge-transactions.csv";
    link.click();

    URL.revokeObjectURL(url);
  };

  const styles = {
    page: {
      padding: "24px",
      color: "#26332c",
      backgroundColor: "#f5f7f4",
      minHeight: "100vh",
    },
    heading: {
      fontSize: "24px",
      fontWeight: "700",
      marginBottom: "8px",
    },
    description: {
      fontSize: "14px",
      color: "#647067",
      marginBottom: "24px",
    },
    card: {
      backgroundColor: "#ffffff",
      border: "1px solid #cbd5ce",
      borderRadius: "7px",
      padding: "16px",
    },
    input: {
      width: "100%",
      padding: "11px",
      border: "1px solid #aebbb2",
      borderRadius: "6px",
      fontSize: "14px",
      boxSizing: "border-box",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
    },
    cell: {
      padding: "14px 10px",
      borderBottom: "1px solid #e2e8e3",
      fontSize: "13px",
    },
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Transactions</h1>

      <p style={styles.description}>
        Monitor all buyer and farmer payment transactions.
      </p>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-green-200 bg-white p-5">
          <p className="text-sm text-gray-500">Total paid</p>
          <h2 className="mt-2 text-2xl font-bold text-green-700">
            KSh {totalPaid.toLocaleString("en-KE")}
          </h2>
        </div>

        <div className="rounded-lg border border-yellow-200 bg-white p-5">
          <p className="text-sm text-gray-500">Pending payments</p>
          <h2 className="mt-2 text-2xl font-bold text-yellow-700">
            KSh {totalPending.toLocaleString("en-KE")}
          </h2>
        </div>

        <div className="rounded-lg border border-red-200 bg-white p-5">
          <p className="text-sm text-gray-500">Failed payments</p>
          <h2 className="mt-2 text-2xl font-bold text-red-700">
            KSh {totalFailed.toLocaleString("en-KE")}
          </h2>
        </div>
      </div>

      <div style={styles.card}>
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h3 className="text-base font-bold text-gray-900">
            M-Pesa transactions
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

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder="Search: date, order, buyer, farmer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={styles.input}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.input}
          >
            <option value="All">All statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                {[
                  "Date",
                  "Order",
                  "Buyer",
                  "Farmer",
                  "Amount",
                  "Method",
                  "Receipt",
                  "Status",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      ...styles.cell,
                      fontWeight: "600",
                      color: "#526057",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={styles.cell}>
                      {transaction.date || "—"}
                    </td>

                    <td style={styles.cell}>
                      {transaction.order || transaction.orderId}
                    </td>

                    <td style={styles.cell}>
                      {transaction.buyerName || "—"}
                    </td>

                    <td style={styles.cell}>
                      {transaction.farmerName || "—"}
                    </td>

                    <td style={styles.cell}>
                      KSh{" "}
                      {Number(transaction.amount || 0).toLocaleString("en-KE")}
                    </td>

                    <td style={styles.cell}>
                      {transaction.method || "M-Pesa"}
                    </td>

                    <td style={styles.cell}>
                      {transaction.receipt || transaction.mpesaReceipt || "Awaiting"}
                    </td>

                    <td style={styles.cell}>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          transaction.status === "Paid"
                            ? "bg-green-100 text-green-700"
                            : transaction.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-700"
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
                    colSpan="8"
                    style={{
                      ...styles.cell,
                      textAlign: "center",
                      padding: "25px",
                      color: "#647067",
                    }}
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-gray-500">
          Showing {filteredTransactions.length} of {transactions.length} transactions.
        </p>
      </div>
    </div>
  );
}

export default PaymentsPage;
