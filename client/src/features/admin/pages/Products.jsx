
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const filterOptions = [
  "All",
  "Pending review",
  "Active",
  "Flagged",
  "Archived",
];

function Products() {
  const [products, setProducts] = useState([]);
  const [filter, setFilter] = useState("All");
  const [message, setMessage] = useState("");

  const filteredProducts =
    filter === "All"
      ? products
      : products.filter((product) => product.status === filter);

  const handleAction = (productId, action) => {
    if (action === "Remove") {
      setProducts((currentProducts) =>
        currentProducts.filter((product) => product.id !== productId)
      );

      setMessage("Product removed successfully.");
      return;
    }

    setProducts((currentProducts) =>
      currentProducts.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          status: action === "Approve" ? "Active" : "Flagged",
        };
      })
    );

    setMessage(
      action === "Approve"
        ? "Product approved successfully."
        : "Product rejected and flagged successfully."
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-5 text-2xl font-bold text-[#1f2933]">
            Products
          </h1>

          <section className="rounded-md border border-gray-300 bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1f2933]">
              Listings moderation
            </h2>

            <label
              htmlFor="product-filter"
              className="sr-only"
            >
              Filter products by status
            </label>

            <select
              id="product-filter"
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setMessage("");
              }}
              className="mb-4 w-full rounded-md border border-gray-400 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-green-700 focus:ring-1 focus:ring-green-700"
            >
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All products" : option}
                </option>
              ))}
            </select>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-800">
                    {[
                      "Product",
                      "Farmer",
                      "Category",
                      "Price",
                      "Status",
                      "Action",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-3 py-3 font-medium"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-gray-200 text-gray-700"
                      >
                        <td className="px-3 py-3">{product.name}</td>
                        <td className="px-3 py-3">{product.farmer}</td>
                        <td className="px-3 py-3">{product.category}</td>
                        <td className="px-3 py-3">{product.price}</td>
                        <td className="px-3 py-3">{product.status}</td>

                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {product.status === "Pending review" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAction(product.id, "Approve")
                                  }
                                  className="font-medium text-green-800 hover:underline"
                                >
                                  Approve
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleAction(product.id, "Reject")
                                  }
                                  className="font-medium text-red-700 hover:underline"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                handleAction(product.id, "Remove")
                              }
                              className="font-medium text-red-700 hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="6"
                        className="px-3 py-8 text-center text-gray-500"
                      >
                        No products available for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {message && (
              <p className="mt-4 text-sm text-green-700" role="status">
                {message}
              </p>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Products;
