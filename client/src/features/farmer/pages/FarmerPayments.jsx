import { useMemo, useState } from "react";

const payments = [
  { id: 1, date: "2026-11-14", order: "AB-1042", amount: 360, receipt: "SKL7H2Q9XA", status: "Received" },
  { id: 2, date: "2026-11-12", order: "AB-1038", amount: 230, receipt: "SKK4M8T1ZB", status: "Received" },
  { id: 3, date: "2026-11-09", order: "AB-1031", amount: 550, receipt: "SKJ2P6R5CD", status: "Received" },
  { id: 4, date: "2026-11-16", order: "AB-1045", amount: 420, receipt: "Awaiting", status: "Pending" },
];

const statusStyles = {
  Received: "bg-green-100 text-green-800",
  Pending: "bg-amber-100 text-amber-800",
};

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function downloadStatement(rows) {
  const header = ["Date", "Order", "Amount (KSh)", "M-Pesa receipt", "Status"];
  const lines = rows.map((row) =>
    [row.date, `#${row.order}`, row.amount, row.receipt, row.status].join(",")
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], {
    type: "text/csv",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "payments-statement.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function PaymentsReceivedPage() {
  const [filter, setFilter] = useState("");

  const rows = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return payments;
    return payments.filter((payment) =>
      [formatDate(payment.date), payment.date, payment.order, payment.status]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [filter]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">Payments received</h1>

      <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Payments</h2>

        <label htmlFor="payments-filter" className="sr-only">
          Filter by date or status
        </label>
        <input
          id="payments-filter"
          type="search"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          placeholder="Filter: date, status"
          className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-600">
                <th scope="col" className="py-3 pr-4 font-medium">Date</th>
                <th scope="col" className="py-3 pr-4 font-medium">Order</th>
                <th scope="col" className="py-3 pr-4 font-medium">Amount</th>
                <th scope="col" className="py-3 pr-4 font-medium">M-Pesa receipt</th>
                <th scope="col" className="py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No payments match your filter.
                  </td>
                </tr>
              ) : (
                rows.map((payment) => (
                  <tr key={payment.id} className="border-b border-gray-100 text-gray-800">
                    <td className="py-3 pr-4">{formatDate(payment.date)}</td>
                    <td className="py-3 pr-4">#{payment.order}</td>
                    <td className="py-3 pr-4">
                      KSh {payment.amount.toLocaleString("en-KE")}
                    </td>
                    <td className="py-3 pr-4 font-mono text-xs">{payment.receipt}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          statusStyles[payment.status] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => downloadStatement(rows)}
          disabled={rows.length === 0}
          className="mt-4 text-sm font-medium text-green-700 hover:text-green-900 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          Download statement
        </button>
      </section>
    </div>
  );
}

export default PaymentsReceivedPage;