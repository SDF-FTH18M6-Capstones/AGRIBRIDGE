import { useState } from "react";
import { Link } from "react-router-dom";

// Change this to match your Add product route
const ADD_PRODUCT_PATH = "/farmer/add-product";

const STORAGE_KEY = "agribridge-farmer-products";

const STATUSES = ["Draft", "Active", "Sold out", "Unavailable", "Archived"];
const AVAILABILITY = ["Ready", "On farm", "Upcoming"];

const sampleProducts = [
  { id: 1, name: "Tomatoes", price: 120, unit: "kg", qty: 250, availability: "Ready", status: "Active" },
  { id: 2, name: "Kale (sukuma wiki)", price: 40, unit: "bunch", qty: 600, availability: "Ready", status: "Active" },
  { id: 3, name: "Potatoes", price: 55, unit: "kg", qty: 1200, availability: "On farm", status: "Active" },
  { id: 4, name: "Green maize", price: 25, unit: "cob", qty: 0, availability: "Ready", status: "Sold out" },
  { id: 5, name: "Cabbages", price: 60, unit: "head", qty: 300, availability: "Upcoming", status: "Draft" },
  { id: 6, name: "Spinach", price: 35, unit: "bunch", qty: 80, availability: "Ready", status: "Unavailable" },
  { id: 7, name: "Onions", price: 90, unit: "kg", qty: 150, availability: "Ready", status: "Archived" },
];

const statusClass = {
  Active: "bg-green-100 text-green-700",
  Draft: "bg-gray-100 text-gray-600",
  "Sold out": "bg-amber-100 text-amber-700",
  Unavailable: "bg-red-100 text-red-700",
  Archived: "bg-gray-200 text-gray-600",
};

const formatKsh = (amount) => `KSh ${Number(amount).toLocaleString("en-KE")}`;

const loadProducts = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : sampleProducts;
  } catch {
    return sampleProducts;
  }
};

function FarmerMyProducts() {
  const [products, setProducts] = useState(loadProducts);
  const [filter, setFilter] = useState("All");
  const [qtyDraft, setQtyDraft] = useState({}); // { [id]: "typed value" }
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [message, setMessage] = useState("");

  const save = (next) => {
    setProducts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const patch = (id, changes) => {
    save(products.map((p) => (p.id === id ? { ...p, ...changes } : p)));
  };

  // Quick quantity update. Sold out and Active follow the quantity.
  const updateQty = (product) => {
    const raw = qtyDraft[product.id];
    const qty = Math.max(0, Math.floor(Number(raw)));

    if (raw === "" || Number.isNaN(qty)) return;

    let status = product.status;
    if (qty === 0 && status === "Active") status = "Sold out";
    if (qty > 0 && status === "Sold out") status = "Active";

    patch(product.id, { qty, status });
    setQtyDraft((d) => {
      const { [product.id]: removed, ...rest } = d;
      return rest;
    });
    setMessage(`${product.name}: quantity updated to ${qty} ${product.unit}.`);
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setEditDraft({
      name: product.name,
      price: product.price,
      availability: product.availability,
      status: product.status,
    });
    setMessage("");
  };

  const saveEdit = (product) => {
    const price = Number(editDraft.price);

    if (!editDraft.name.trim() || Number.isNaN(price) || price < 0) {
      setMessage("Enter a product name and a valid price.");
      return;
    }

    patch(product.id, {
      name: editDraft.name.trim(),
      price,
      availability: editDraft.availability,
      status: editDraft.status,
    });
    setEditingId(null);
    setMessage(`${editDraft.name.trim()} has been updated.`);
  };

  const archive = (product) => {
    patch(product.id, { status: "Archived" });
    setMessage(`${product.name} was archived. Buyers can no longer see it.`);
  };

  const restore = (product) => {
    patch(product.id, { status: "Draft" });
    setMessage(`${product.name} was restored as a draft.`);
  };

  const resetSample = () => {
    save(sampleProducts);
    setEditingId(null);
    setQtyDraft({});
    setMessage("");
  };

  const counts = STATUSES.reduce(
    (acc, s) => ({ ...acc, [s]: products.filter((p) => p.status === s).length }),
    {}
  );

  const visible =
    filter === "All" ? products : products.filter((p) => p.status === filter);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const linkButton =
    "text-sm font-medium text-gray-700 underline hover:text-[#168343]";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your listings, prices and stock.
        </p>
      </div>

      {message && (
        <div
          role="status"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {message}
        </div>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Listings</h2>

        <Link
          to={ADD_PRODUCT_PATH}
          className="inline-block rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
        >
          Add product
        </Link>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter products by status"
          className="mb-5 mt-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100"
        >
          <option value="All">Filter: All ({products.length})</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s} ({counts[s]})
            </option>
          ))}
        </select>

        {visible.length === 0 ? (
          <p className="text-sm text-gray-500">
            {products.length === 0
              ? "You have no products yet. Add your first product."
              : `No ${filter.toLowerCase()} products.`}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500">
                  <th className="px-2 py-3 font-medium">Product</th>
                  <th className="px-2 py-3 font-medium">Price</th>
                  <th className="px-2 py-3 font-medium">Qty left</th>
                  <th className="px-2 py-3 font-medium">Availability</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Actions</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((p) => {
                  const editing = editingId === p.id;
                  const typed = qtyDraft[p.id];
                  const changed = typed !== undefined && Number(typed) !== p.qty;

                  return (
                    <tr key={p.id} className="border-b border-gray-100 align-top">
                      {/* Product */}
                      <td className="px-2 py-4">
                        {editing ? (
                          <input
                            aria-label="Product name"
                            value={editDraft.name}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, name: e.target.value })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">{p.name}</span>
                        )}
                      </td>

                      {/* Price */}
                      <td className="px-2 py-4 text-gray-700">
                        {editing ? (
                          <input
                            aria-label="Price"
                            type="number"
                            min="0"
                            value={editDraft.price}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, price: e.target.value })
                            }
                            className={`${inputClass} w-28`}
                          />
                        ) : (
                          <>
                            {formatKsh(p.price)}
                            <span className="text-xs text-gray-500"> / {p.unit}</span>
                          </>
                        )}
                      </td>

                      {/* Qty left with quick update */}
                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            aria-label={`Quantity left for ${p.name}`}
                            type="number"
                            min="0"
                            value={typed ?? p.qty}
                            onChange={(e) =>
                              setQtyDraft({ ...qtyDraft, [p.id]: e.target.value })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") updateQty(p);
                            }}
                            disabled={p.status === "Archived"}
                            className={`${inputClass} w-24 disabled:bg-gray-50 disabled:text-gray-500`}
                          />
                          <button
                            type="button"
                            onClick={() => updateQty(p)}
                            disabled={!changed}
                            className="text-sm font-medium text-gray-700 underline hover:text-[#168343] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                          >
                            update
                          </button>
                        </div>
                      </td>

                      {/* Availability */}
                      <td className="px-2 py-4 text-gray-700">
                        {editing ? (
                          <select
                            aria-label="Availability"
                            value={editDraft.availability}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, availability: e.target.value })
                            }
                            className={inputClass}
                          >
                            {AVAILABILITY.map((a) => (
                              <option key={a}>{a}</option>
                            ))}
                          </select>
                        ) : (
                          p.availability
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-4">
                        {editing ? (
                          <select
                            aria-label="Status"
                            value={editDraft.status}
                            onChange={(e) =>
                              setEditDraft({ ...editDraft, status: e.target.value })
                            }
                            className={inputClass}
                          >
                            {STATUSES.map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass[p.status]}`}
                          >
                            {p.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-2 py-4">
                        {editing ? (
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => saveEdit(p)}
                              className="text-sm font-semibold text-[#168343] underline"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className={linkButton}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className={linkButton}
                            >
                              Edit
                            </button>
                            {p.status === "Archived" ? (
                              <button
                                type="button"
                                onClick={() => restore(p)}
                                className={linkButton}
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => archive(p)}
                                className={linkButton}
                              >
                                Archive
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 text-xs text-gray-500">
          Update quantity quickly so buyers never over-order.
        </p>

        <button
          type="button"
          onClick={resetSample}
          className="mt-3 text-xs text-gray-500 underline hover:text-[#168343]"
        >
          Reset sample products
        </button>
      </section>
    </div>
  );
}

export default FarmerMyProducts;