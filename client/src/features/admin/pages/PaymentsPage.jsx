
import { useState } from "react";

const sampleTransactions = [
  {
    id: 1,
    date: "2026-11-17",
    order: "#ORD-001",
    buyer: "Mary Wanjiku",
    farmer: "John Kamau",
    amount: 2500,
    status: "Paid",
  },
  {
    id: 2,
    date: "2026-11-16",
    order: "#ORD-002",
    buyer: "Peter Otieno",
    farmer: "Jane Njeri",
    amount: 1800,
    status: "Pending",
  },
  {
    id: 3,
    date: "2026-11-15",
    order: "#ORD-003",
    buyer: "Grace Akinyi",
    farmer: "David Mwangi",
    amount: 3200,
    status: "Paid",
  },
  {
    id: 4,
    date: "2026-11-14",
    order: "#ORD-004",
    buyer: "Brian Kiptoo",
    farmer: "Sarah Chebet",
    amount: 1500,
    status: "Failed",
  },
  {
    id: 5,
    date: "2026-11-13",
    order: "#ORD-005",
    buyer: "Faith Atieno",
    farmer: "Michael Maina",
    amount: 4200,
    status: "Paid",
  },
];

function PaymentsPage() {
  const [transactions] = useState(sampleTransactions);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filteredTransactions = transactions.filter((transaction) => {
    const searchMatch =
      transaction.date.toLowerCase().includes(search.toLowerCase()) ||
      transaction.order.toLowerCase().includes(search.toLowerCase()) ||
      transaction.buyer.toLowerCase().includes(search.toLowerCase()) ||
      transaction.farmer.toLowerCase().includes(search.toLowerCase());

    const statusMatch =
      statusFilter === "All" || transaction.status === statusFilter;

    return searchMatch && statusMatch;
  });

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
      marginBottom: "16px",
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
      fontSize: "14px",
    },
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>Transactions</h1>

      <div style={styles.card}>
        <h3 style={{ marginTop: 0, marginBottom: "18px" }}>
          M-Pesa transactions
        </h3>

        <input
          type="text"
          placeholder="Search: date, order, buyer, farmer..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.input}
        />

        <div style={{ marginBottom: "18px" }}>
          <label style={{ marginRight: "10px", fontSize: "14px" }}>
            Filter by status:
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px",
              border: "1px solid #aebbb2",
              borderRadius: "5px",
            }}
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
                {["Date", "Order", "Buyer", "Farmer", "Amount", "Status"].map(
                  (heading) => (
                    <th
                      key={heading}
                      style={{
                        ...styles.cell,
                        fontWeight: "600",
                      }}
                    >
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td style={styles.cell}>{transaction.date}</td>
                    <td style={styles.cell}>{transaction.order}</td>
                    <td style={styles.cell}>{transaction.buyer}</td>
                    <td style={styles.cell}>{transaction.farmer}</td>
                    <td style={styles.cell}>
                      KSh {transaction.amount.toLocaleString("en-KE")}
                    </td>
                    <td style={styles.cell}>
                      <span
                        style={{
                          padding: "5px 10px",
                          borderRadius: "20px",
                          fontSize: "12px",
                          fontWeight: "600",
                          backgroundColor:
                            transaction.status === "Paid"
                              ? "#dcfce7"
                              : transaction.status === "Pending"
                                ? "#fef3c7"
                                : "#fee2e2",
                          color:
                            transaction.status === "Paid"
                              ? "#166534"
                              : transaction.status === "Pending"
                                ? "#92400e"
                                : "#991b1b",
                        }}
                      >
                        {transaction.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      ...styles.cell,
                      textAlign: "center",
                      padding: "25px",
                    }}
                  >
                    No transactions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: "13px", color: "#647067", marginBottom: 0 }}>
          Showing {filteredTransactions.length} of {transactions.length} transactions.
        </p>

        <p style={{ fontSize: "12px", color: "#647067" }}>
          Failed or disputed payments are flagged.
        </p>
      </div>
    </div>
  );
}

export default PaymentsPage;
