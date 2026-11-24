import { ContentSkeleton } from '../../../components/ui/Loading';
import { Spinner } from '../../../components/ui/Loading';
import Uploads, { FileCard } from '../../v1/Uploads';
import useResource from '../../v1/useResource';

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  fetchMyProducts,
  updateProduct,
  deleteProduct,
  updateOptimisticProduct,
  restoreProduct,
  addOptimisticProduct,
} from "../products/productSlice";

const ADD_PRODUCT_PATH = "/farmer/products/new";

const STATUSES = ["Draft", "Active", "Sold out", "Unavailable", "Archived"];
const AVAILABILITY = ["Ready", "On farm", "Upcoming"];

const statusClass = {
  Active: "bg-green-100 text-green-700",
  Draft: "bg-gray-100 text-gray-600",
  "Sold out": "bg-amber-100 text-amber-700",
  Unavailable: "bg-red-100 text-red-700",
  Archived: "bg-gray-200 text-gray-600",
};

const formatKsh = (amount) =>
  `KSh ${Number(amount).toLocaleString("en-KE")}`;

function FarmerMyProducts() {
  const dispatch = useDispatch();

  const products = useSelector(
    (state) => state.farmerProducts.items
  );

  const loading = useSelector(
    (state) => state.farmerProducts.loading
  );

  const pendingIds = useSelector(
    (state) => state.farmerProducts.pendingIds
  );

  const [filter, setFilter] = useState("All");
  const [qtyDraft, setQtyDraft] = useState({});
  const [imagesFor, setImagesFor] = useState(null);
  const media = useResource("/media", true);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [message, setMessage] = useState("");

  useEffect(() => {
    dispatch(fetchMyProducts());
  }, [dispatch]);

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100";

  const linkButton =
    "text-sm font-medium text-gray-700 underline hover:text-green-700";

  // Optimistic quantity update with rollback.
  const updateQty = async (product) => {
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

    if (pendingIds.includes(product.id)) return;

    const qty = Number(raw);
    let status = product.status;

    if (qty === 0 && status === "Active") status = "Sold out";
    if (qty > 0 && status === "Sold out") status = "Active";

    const previousProduct = { ...product };
    const changes = { qty, status };

    dispatch(updateOptimisticProduct({
      id: product.id,
      changes,
    }));

    try {
      await dispatch(
        updateProduct({
          id: product.id,
          changes,
        })
      ).unwrap();

      setMessage(`${product.name} quantity updated successfully.`);

      setQtyDraft((draft) => {
        const next = { ...draft };
        delete next[product.id];
        return next;
      });
    } catch (error) {
      dispatch(restoreProduct(previousProduct));
      setMessage(error || "Update failed. Previous quantity restored.");
    }
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

  // Optimistic product edit with rollback.
  const saveEdit = async (product) => {
    const price = Number(editDraft.price);

    if (
      !editDraft.name.trim() ||
      !Number.isFinite(price) ||
      price < 0
    ) {
      setMessage("Enter a product name and a valid price.");
      return;
    }

    if (pendingIds.includes(product.id)) return;

    const previousProduct = { ...product };

    const changes = {
      name: editDraft.name.trim(),
      price,
      availability: editDraft.availability,
      status: editDraft.status,
    };

    dispatch(updateOptimisticProduct({
      id: product.id,
      changes,
    }));

    try {
      await dispatch(
        updateProduct({
          id: product.id,
          changes,
        })
      ).unwrap();

      setEditingId(null);
      setMessage(`${changes.name} updated successfully.`);
    } catch (error) {
      dispatch(restoreProduct(previousProduct));
      setMessage(error || "Update failed. Previous details restored.");
    }
  };

  // Optimistic deletion with rollback.
  const removeProduct = async (product) => {
    if (pendingIds.includes(product.id)) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${product.name}?`
    );

    if (!confirmed) return;

    const previousProduct = { ...product };

    dispatch({
      type: "farmerProducts/removeOptimisticProduct",
      payload: product.id,
    });

    try {
      await dispatch(deleteProduct(product.id)).unwrap();
      setMessage(`${product.name} deleted successfully.`);
    } catch (error) {
      dispatch(addOptimisticProduct(previousProduct));
      setMessage(error || "Deletion failed. Product restored.");
    }
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
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {message}
        </div>
      )}

      {imagesFor && <section className="space-y-4 rounded-2xl border bg-white p-5"><div className="flex justify-between gap-3"><h2 className="font-bold">Photos for {imagesFor.name}</h2><button className="underline" onClick={() => setImagesFor(null)}>Close photos</button></div><Uploads purpose="product_image" productId={imagesFor.id} onUploaded={media.reload} /><div className="grid gap-3 sm:grid-cols-2">{media.data?.filter(asset => asset.product_id === imagesFor.id).map(asset => <FileCard key={asset.asset_id} asset={asset} />)}</div></section>}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            Listings
          </h2>

          <Link
            to={ADD_PRODUCT_PATH}
            className="inline-block rounded-lg bg-green-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
          >
            + Add product
          </Link>
        </div>

        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter products by status"
          className="mb-5 w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#168343] focus:ring-2 focus:ring-green-100"
        >
          <option value="All">Filter: All ({products.length})</option>

          {STATUSES.map((status) => (
            <option key={status} value={status}>
              {status} ({counts[status]})
            </option>
          ))}
        </select>

        {loading ? (
          <ContentSkeleton label="Loading your products" />
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
                  const busy = pendingIds.includes(product.id);

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
                            disabled={
                              product.status === "Archived" || busy
                            }
                            className={`${inputClass} w-24 disabled:bg-gray-50 disabled:text-gray-500`}
                          />

                          <button
                            type="button"
                            onClick={() => updateQty(product)}
                            disabled={!changed || busy}
                            className="text-sm font-medium text-gray-700 underline hover:text-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? <Spinner label="Saving" /> : "Update"}
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
                              <option key={status}>{status}</option>
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
                              disabled={busy}
                              className="text-sm font-semibold text-green-700 underline disabled:opacity-40"
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
                            <button type="button" className={linkButton} onClick={() => setImagesFor(product)}>Photos</button>
                            <button
                              type="button"
                              onClick={() => startEdit(product)}
                              disabled={busy}
                              className={linkButton}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => removeProduct(product)}
                              disabled={busy}
                              className="text-sm font-medium text-red-600 underline disabled:opacity-40"
                            >
                              Delete
                            </button>
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
      </section>
    </div>
  );
}

export default FarmerMyProducts;
