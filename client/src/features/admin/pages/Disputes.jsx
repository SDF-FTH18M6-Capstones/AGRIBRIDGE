
import { useState } from "react";

const sampleDisputes = [
  {
    id: 1,
    caseNumber: "CASE-001",
    order: "#ORD-001",
    reportedBy: "Mary Wanjiku",
    issue: "Payment made but order not confirmed",
    status: "Open",
    farmer: "John Kamau",
    amount: 2500,
    messages: ["I made the payment but my order is still pending."],
  },
  {
    id: 2,
    caseNumber: "CASE-002",
    order: "#ORD-004",
    reportedBy: "Brian Kiptoo",
    issue: "Products delivered were damaged",
    status: "Open",
    farmer: "Sarah Chebet",
    amount: 1500,
    messages: ["Some of the tomatoes arrived damaged."],
  },
  {
    id: 3,
    caseNumber: "CASE-003",
    order: "#ORD-006",
    reportedBy: "Grace Akinyi",
    issue: "Incorrect quantity delivered",
    status: "Under Review",
    farmer: "David Mwangi",
    amount: 3200,
    messages: ["I ordered 10kg but received only 7kg."],
  },
  {
    id: 4,
    caseNumber: "CASE-004",
    order: "#ORD-008",
    reportedBy: "Peter Otieno",
    issue: "Order was not delivered",
    status: "Closed",
    farmer: "Jane Njeri",
    amount: 1800,
    messages: ["My order was not delivered on the agreed date."],
  },
];

function Disputes() {
  const [disputes, setDisputes] = useState(sampleDisputes);
  const [selectedCase, setSelectedCase] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [resolution, setResolution] = useState("");

  const filteredDisputes = disputes.filter((dispute) => {
    const matchesSearch =
      dispute.caseNumber.toLowerCase().includes(search.toLowerCase()) ||
      dispute.order.toLowerCase().includes(search.toLowerCase()) ||
      dispute.reportedBy.toLowerCase().includes(search.toLowerCase()) ||
      dispute.issue.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      filterStatus === "All" || dispute.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const updateStatus = (id, status) => {
    setDisputes((previous) =>
      previous.map((dispute) =>
        dispute.id === id ? { ...dispute, status } : dispute
      )
    );

    setSelectedCase((previous) =>
      previous && previous.id === id
        ? { ...previous, status }
        : previous
    );
  };

  const addResolution = () => {
    if (!resolution.trim()) return;

    const updatedCase = {
      ...selectedCase,
      messages: [...selectedCase.messages, `Admin: ${resolution}`],
    };

    setDisputes((previous) =>
      previous.map((dispute) =>
        dispute.id === selectedCase.id ? updatedCase : dispute
      )
    );

    setSelectedCase(updatedCase);
    setResolution("");
  };

  const styles = {
    page: {
      padding: "24px",
      minHeight: "100vh",
      backgroundColor: "#f5f7f4",
      color: "#26332c",
    },
    card: {
      backgroundColor: "#fff",
      border: "1px solid #cbd5ce",
      borderRadius: "7px",
      padding: "16px",
    },
    input: {
      padding: "11px",
      width: "100%",
      boxSizing: "border-box",
      border: "1px solid #aebbb2",
      borderRadius: "6px",
      marginBottom: "16px",
    },
    button: {
      padding: "8px 14px",
      backgroundColor: "#145239",
      color: "#fff",
      border: "none",
      borderRadius: "5px",
      cursor: "pointer",
    },
    cell: {
      padding: "13px 10px",
      borderBottom: "1px solid #e2e8e3",
      fontSize: "14px",
      textAlign: "left",
    },
  };

  return (
    <div style={styles.page}>
      <h1>Disputes</h1>

      <div style={styles.card}>
        <h3>Reported issues</h3>

        <input
          style={styles.input}
          placeholder="Search case, order, buyer or issue..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: "9px", marginBottom: "16px" }}
        >
          <option value="All">All statuses</option>
          <option value="Open">Open</option>
          <option value="Under Review">Under Review</option>
          <option value="Closed">Closed</option>
        </select>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Case", "Order", "Reported by", "Issue", "Status", "Action"].map(
                  (heading) => (
                    <th key={heading} style={styles.cell}>
                      {heading}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody>
              {filteredDisputes.map((dispute) => (
                <tr key={dispute.id}>
                  <td style={styles.cell}>{dispute.caseNumber}</td>
                  <td style={styles.cell}>{dispute.order}</td>
                  <td style={styles.cell}>{dispute.reportedBy}</td>
                  <td style={styles.cell}>{dispute.issue}</td>
                  <td style={styles.cell}>{dispute.status}</td>
                  <td style={styles.cell}>
                    <button
                      style={styles.button}
                      onClick={() => {
                        setSelectedCase(dispute);
                        setResolution("");
                      }}
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}

              {filteredDisputes.length === 0 && (
                <tr>
                  <td colSpan="6" style={styles.cell}>
                    No disputes found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              ...styles.card,
              width: "550px",
              maxWidth: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
            }}
          >
            <h2>Case details</h2>

            <p><strong>Case:</strong> {selectedCase.caseNumber}</p>
            <p><strong>Order:</strong> {selectedCase.order}</p>
            <p><strong>Buyer:</strong> {selectedCase.reportedBy}</p>
            <p><strong>Farmer:</strong> {selectedCase.farmer}</p>
            <p><strong>Amount:</strong> KSh {selectedCase.amount.toLocaleString()}</p>
            <p><strong>Issue:</strong> {selectedCase.issue}</p>
            <p><strong>Status:</strong> {selectedCase.status}</p>

            <hr />

            <h3>Messages</h3>

            {selectedCase.messages.map((message, index) => (
              <p
                key={index}
                style={{
                  padding: "10px",
                  backgroundColor: "#f1f5f2",
                  borderRadius: "5px",
                }}
              >
                {message}
              </p>
            ))}

            <h3>Resolution notes</h3>

            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="Enter resolution notes..."
              rows="3"
              style={{
                width: "100%",
                padding: "10px",
                boxSizing: "border-box",
                border: "1px solid #aebbb2",
                borderRadius: "5px",
              }}
            />

            <button
              style={{ ...styles.button, marginTop: "10px" }}
              onClick={addResolution}
            >
              Add resolution note
            </button>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px", flexWrap: "wrap" }}>
              {selectedCase.status !== "Closed" && (
                <>
                  <button
                    style={styles.button}
                    onClick={() => updateStatus(selectedCase.id, "Under Review")}
                  >
                    Mark under review
                  </button>

                  <button
                    style={{
                      ...styles.button,
                      backgroundColor: "#16a34a",
                    }}
                    onClick={() => updateStatus(selectedCase.id, "Closed")}
                  >
                    Close case
                  </button>
                </>
              )}

              <button
                style={{
                  ...styles.button,
                  backgroundColor: "#647067",
                }}
                onClick={() => setSelectedCase(null)}
              >
                Close window
              </button>
            </div>
          </div>
        </div>
      )}

      <p style={{ color: "#647067", fontSize: "13px" }}>
        Showing {filteredDisputes.length} reported issues.
      </p>
    </div>
  );
}

export default Disputes;
