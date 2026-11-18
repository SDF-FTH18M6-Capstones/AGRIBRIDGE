
import { useMemo, useState } from "react";

const sampleUsers = [
  { date: "2026-11-10", name: "Mary Wanjiku", role: "Buyer", county: "Nakuru" },
  { date: "2026-11-11", name: "John Kamau", role: "Farmer", county: "Kiambu" },
  { date: "2026-11-12", name: "Grace Akinyi", role: "Buyer", county: "Kisumu" },
  { date: "2026-11-13", name: "David Mwangi", role: "Farmer", county: "Nakuru" },
  { date: "2026-11-14", name: "Peter Otieno", role: "Buyer", county: "Kisumu" },
];

const sampleOrders = [
  { date: "2026-11-10", order: "ORD-001", county: "Nakuru", amount: 2500 },
  { date: "2026-11-11", order: "ORD-002", county: "Kiambu", amount: 1800 },
  { date: "2026-11-12", order: "ORD-003", county: "Kisumu", amount: 3200 },
  { date: "2026-11-13", order: "ORD-004", county: "Nakuru", amount: 1500 },
  { date: "2026-11-14", order: "ORD-005", county: "Kiambu", amount: 4200 },
  { date: "2026-11-15", order: "ORD-006", county: "Nakuru", amount: 3000 },
];

const sampleVerifications = [
  { date: "2026-11-10", name: "John Kamau", type: "Farmer", status: "Approved" },
  { date: "2026-11-11", name: "Mary Njeri", type: "Farmer", status: "Pending" },
  { date: "2026-11-12", name: "Peter Otieno", type: "Buyer", status: "Approved" },
  { date: "2026-11-13", name: "Grace Akinyi", type: "Farmer", status: "Rejected" },
  { date: "2026-11-14", name: "David Mwangi", type: "Farmer", status: "Approved" },
];

const reportTypes = [
  {
    name: "Users",
    description: "Farmers and buyers over time",
  },
  {
    name: "Orders",
    description: "Orders and sales by county",
  },
  {
    name: "Verification",
    description: "Applications and approvals",
  },
];

function Reports() {
  const [startDate, setStartDate] = useState("2026-11-10");
  const [endDate, setEndDate] = useState("2026-11-17");
  const [selectedReport, setSelectedReport] = useState("Users");

  const filterByDate = (items) =>
    items.filter(
      (item) => item.date >= startDate && item.date <= endDate
    );

  const filteredUsers = useMemo(
    () => filterByDate(sampleUsers),
    [startDate, endDate]
  );

  const filteredOrders = useMemo(
    () => filterByDate(sampleOrders),
    [startDate, endDate]
  );

  const filteredVerifications = useMemo(
    () => filterByDate(sampleVerifications),
    [startDate, endDate]
  );

  const countyData = useMemo(() => {
    return filteredOrders.reduce((result, order) => {
      result[order.county] = (result[order.county] || 0) + 1;
      return result;
    }, {});
  }, [filteredOrders]);

  const dailyOrders = useMemo(() => {
    return filteredOrders.reduce((result, order) => {
      result[order.date] = (result[order.date] || 0) + 1;
      return result;
    }, {});
  }, [filteredOrders]);

  const totalSales = filteredOrders.reduce(
    (total, order) => total + order.amount,
    0
  );

  const exportCSV = (name, data) => {
    if (!data.length) {
      alert("No data available to export.");
      return;
    }

    const headers = Object.keys(data[0]);

    const rows = data.map((item) =>
      headers
        .map((header) => `"${String(item[header]).replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");

    const file = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(file);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${name.toLowerCase()}-report.csv`;
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleExport = (reportName) => {
    if (reportName === "Users") {
      exportCSV("Users", filteredUsers);
    } else if (reportName === "Orders") {
      exportCSV("Orders", filteredOrders);
    } else {
      exportCSV("Verification", filteredVerifications);
    }
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
      width: "100%",
      padding: "10px",
      border: "1px solid #aebbb2",
      borderRadius: "5px",
      boxSizing: "border-box",
    },
    button: {
      padding: "8px 14px",
      border: "none",
      borderRadius: "5px",
      backgroundColor: "#145239",
      color: "#fff",
      cursor: "pointer",
    },
    cell: {
      padding: "13px 10px",
      borderBottom: "1px solid #e2e8e3",
      textAlign: "left",
      fontSize: "14px",
    },
  };

  const maxOrders = Math.max(...Object.values(dailyOrders), 1);
  const maxCountyOrders = Math.max(...Object.values(countyData), 1);

  return (
    <div style={styles.page}>
      <h1>Reports</h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <div style={styles.card}>
          <p>Total users</p>
          <h2>{filteredUsers.length}</h2>
        </div>

        <div style={styles.card}>
          <p>Total orders</p>
          <h2>{filteredOrders.length}</h2>
        </div>

        <div style={styles.card}>
          <p>Total sales</p>
          <h2>KSh {totalSales.toLocaleString("en-KE")}</h2>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "16px",
          alignItems: "start",
        }}
      >
        <div style={styles.card}>
          <h3>Reports</h3>

          <label>Start date</label>
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...styles.input, marginBottom: "12px" }}
          />

          <label>End date</label>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ ...styles.input, marginBottom: "16px" }}
          />

          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Report", "Description", "Action"].map((heading) => (
                  <th key={heading} style={styles.cell}>
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {reportTypes.map((report) => (
                <tr key={report.name}>
                  <td style={styles.cell}>{report.name}</td>
                  <td style={styles.cell}>{report.description}</td>
                  <td style={styles.cell}>
                    <button
                      style={styles.button}
                      onClick={() => handleExport(report.name)}
                    >
                      Export
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.card}>
          <h3>Charts</h3>

          <h4>Orders over time</h4>

          {Object.keys(dailyOrders).length === 0 ? (
            <p>No orders in this date range.</p>
          ) : (
            Object.entries(dailyOrders).map(([date, count]) => (
              <div key={date} style={{ marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "13px",
                    marginBottom: "5px",
                  }}
                >
                  <span>{date}</span>
                  <strong>{count} orders</strong>
                </div>

                <div
                  style={{
                    backgroundColor: "#e5ebe6",
                    height: "13px",
                    borderRadius: "10px",
                  }}
                >
                  <div
                    style={{
                      width: `${(count / maxOrders) * 100}%`,
                      backgroundColor: "#16a34a",
                      height: "100%",
                      borderRadius: "10px",
                    }}
                  />
                </div>
              </div>
            ))
          )}

          <hr style={{ margin: "24px 0" }} />

          <h4>Top counties</h4>

          {Object.keys(countyData).length === 0 ? (
            <p>No county data available.</p>
          ) : (
            Object.entries(countyData)
              .sort((a, b) => b[1] - a[1])
              .map(([county, count]) => (
                <div key={county} style={{ marginBottom: "14px" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "13px",
                      marginBottom: "5px",
                    }}
                  >
                    <span>{county}</span>
                    <strong>{count} orders</strong>
                  </div>

                  <div
                    style={{
                      height: "13px",
                      backgroundColor: "#e5ebe6",
                      borderRadius: "10px",
                    }}
                  >
                    <div
                      style={{
                        width: `${(count / maxCountyOrders) * 100}%`,
                        height: "100%",
                        backgroundColor: "#16a34a",
                        borderRadius: "10px",
                      }}
                    />
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;
