import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";

const ADD_PRODUCT_PATH = "/farmer/products/new";
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

const formatKsh = (amount) =>
  `KSh ${Number(amount).toLocaleString("en-KE")}`;

const loadProducts = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error("Failed to load products:", error);
    return [];
  }
};

const mapBackendProduct = (product) => {
  const quality = (product.quality || "").toLowerCase();

  const availability = quality.includes("soon")
    ? "Upcoming"
    : quality.includes("recent")
      ? "On farm"
      : "Ready";

  const statusMap = {
    available: "Active",
    sold_out: "Sold out",
    inactive: "Unavailable",
  };

  return {
    id: product.product_id,
    name: product.product_name,
    description: product.description || "",
    price: Number(product.price),
    qty: Number(product.quantity_available),
    unit: product.unit,
    availability,
    quality: product.quality || "",
    harvestDate: product.availability_date || "",
    status: statusMap[product.status] || "Unavailable",
    imageUrl: product.image_url || "",
  };
};

function FarmerMyProducts() {
  const [products, setProducts] = useState(loadProducts);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [qtyDraft, setQtyDraft] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchMyProducts = async () => {
      try {
        const response = await api.get("/products/mine");
        const serverProducts = response.data?.data || [];

        if (!Array.isArray(serverProducts)) {
          throw new Error("The server returned an invalid products list.");
        }

        const mappedProducts = serverProducts.map(mapBackendProduct);

        if (mounted) {
          setProducts(mappedProducts);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mappedProducts));
        }
      } catch (error) {
        console.error("Unable to load farmer products:", error);

        if (mounted) {
          setMessage(
            error.message || "Unable to load your products from the server."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchMyProducts();

    return () => {
      mounted = false;
    };
  }, []);

  const inputClass =
    "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const linkButton =
    "text-sm font-medium text-gray-700 underline hover:text-[#168343]";

  const save = (next) => {
    setProducts(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event("agribridge-update"));
  };

  const patch = (id, changes) => {
    save(
      products.map((product) =>
        product.id === id ? { ...product, ...changes } : product
      )
    );
  };

  const updateQty = (product) => {
    const raw = qtyDraft[product.id];

    if (
      raw === "" ||
      raw === undefined ||
      !Number.isFinite(Number(raw)) ||
      Number(raw) < 0
    ) {
      setMessage("Enter a valid quantity.");
      return;
    }

    const qty = Math.floor(Number(raw));
    let status = product.status;

    if (qty === 0 && status === "Active") {
      status = "Sold out";
    }

    if (qty > 0 && status === "Sold out") {
      status = "Active";
    }

    patch(product.id, { qty, status });

    setQtyDraft((draft) => {
      const { [product.id]: removed, ...rest } = draft;
      return rest;
    });

    setMessage(
      `${product.name}: quantity updated to ${qty} ${product.unit}.`
    );
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

    if (
      !editDraft.name.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
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
    setMessage("Sample products have been restored.");
  };

  const counts = STATUSES.reduce(
    (acc, status) => ({
      ...acc,
      [status]: products.filter(
        (product) => product.status === status
      ).length,
    }),
    {}
  );

  const visible =
    filter === "All"
      ? products
      : products.filter((product) => product.status === filter);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          My products
        </h1>
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            Listings
          </h2>

          <Link
            to={ADD_PRODUCT_PATH}
            className="inline-block rounded-lg bg-[#174832] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#103724]"
          >
            + Add product
          </Link>
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter products by status"
          className="mb-5 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100"
        >
          <option value="All">
            Filter: All ({products.length})
          </option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status} ({counts[status]})
            </option>
          ))}
        </select>

        {loading ? (
          <p className="text-sm text-gray-500">
            Loading your products...
          </p>
        ) : visible.length === 0 ? (
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
                {visible.map((product) => {
                  const editing = editingId === product.id;
                  const typed = qtyDraft[product.id];

                  const changed =
                    typed !== undefined &&
                    Number(typed) !== Number(product.qty);

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-gray-100 align-top"
                    >
                      <td className="px-2 py-4">
                        {editing ? (
                          <input
                            aria-label="Product name"
                            value={editDraft.name}
                            onChange={(event) =>
                              setEditDraft({
                                ...editDraft,
                                name: event.target.value,
                              })
                            }
                            className={inputClass}
                          />
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {product.name}
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-4 text-gray-700">
                        {editing ? (
                          <input
                            aria-label="Price"
                            type="number"
                            min="0"
                            value={editDraft.price}
                            onChange={(event) =>
                              setEditDraft({
                                ...editDraft,
                                price: event.target.value,
                              })
                            }
                            className={`${inputClass} w-28`}
                          />
                        ) : (
                          <>
                            {formatKsh(product.price)}
                            <span className="text-xs text-gray-500">
                              {" "}/ {product.unit}
                            </span>
                          </>
                        )}
                      </td>

                      <td className="px-2 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            aria-label={`Quantity left for ${product.name}`}
                            type="number"
                            min="0"
                            value={typed ?? product.qty}
                            onChange={(event) =>
                              setQtyDraft({
                                ...qtyDraft,
                                [product.id]: event.target.value,
                              })
                            }
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                updateQty(product);
                              }
                            }}
                            disabled={product.status === "Archived"}
                            className={`${inputClass} w-24 disabled:bg-gray-50 disabled:text-gray-500`}
                          />

                          <button
                            type="button"
                            onClick={() => updateQty(product)}
                            disabled={!changed}
                            className="text-sm font-medium text-gray-700 underline hover:text-[#168343] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                          >
                            Update
                          </button>
                        </div>
                      </td>

                      <td className="px-2 py-4 text-gray-700">
                        {editing ? (
                          <select
                            aria-label="Availability"
                            value={editDraft.availability}
                            onChange={(event) =>
                              setEditDraft({
                                ...editDraft,
                                availability: event.target.value,
                              })
                            }
                            className={inputClass}
                          >
                            {AVAILABILITY.map((availability) => (
                              <option key={availability}>
                                {availability}
                              </option>
                            ))}
                          </select>
                        ) : (
                          product.availability
                        )}
                      </td>

                      <td className="px-2 py-4">
                        {editing ? (
                          <select
                            aria-label="Status"
                            value={editDraft.status}
                            onChange={(event) =>
                              setEditDraft({
                                ...editDraft,
                                status: event.target.value,
                              })
                            }
                            className={inputClass}
                          >
                            {STATUSES.map((status) => (
                              <option key={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              statusClass[product.status] ||
                              "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {product.status}
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-2 py-4">
                        {editing ? (
                          <div className="flex gap-3">
                            <button
                              type="button"
                              onClick={() => saveEdit(product)}
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
                              onClick={() => startEdit(product)}
                              className={linkButton}
                            >
                              Edit
                            </button>

                            {product.status === "Archived" ? (
                              <button
                                type="button"
                                onClick={() => restore(product)}
                                className={linkButton}
                              >
                                Restore
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => archive(product)}
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