
// Chan has done Marketplace. I will not be pushing it, I have only used this one so Mktplace doesnt refuse to build

import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

const products = [
  {
    id: 1,
    name: "Fresh Tomatoes",
    category: "Vegetables",
    price: 120,
    unit: "kg",
    quantity: 200,
    county: "Nakuru",
    farmer: "Jane Wanjiku",
    verified: true,
    availability: "Ready",
    harvested: "2026-11-12",
    minimumOrder: 1,
    description: "Fresh, locally grown tomatoes.",
    image:
      "https://images.unsplash.com/photo-1748843328433-1c8a51513f6e?w=600&q=80",
  },
  {
    id: 2,
    name: "Ripe Mangoes",
    category: "Fruits",
    price: 150,
    unit: "kg",
    quantity: 120,
    county: "Makueni",
    farmer: "Peter Mutua",
    verified: true,
    availability: "Ready",
    harvested: "2026-11-10",
    minimumOrder: 2,
    description: "Sweet, ripe mangoes from Makueni.",
    image:
      "https://images.unsplash.com/photo-1605027990121-cbae9e0642df?w=600&q=80",
  },
  {
    id: 3,
    name: "Dry Maize",
    category: "Cereals and grains",
    price: 65,
    unit: "kg",
    quantity: 500,
    county: "Uasin Gishu",
    farmer: "David Kiptoo",
    verified: true,
    availability: "Ready",
    harvested: "2026-10-25",
    minimumOrder: 10,
    description: "Clean, dried maize ready for sale.",
    image:
      "https://images.unsplash.com/photo-1770617475595-f80b09cbbecd?w=600&q=80",
  },
  {
    id: 4,
    name: "Irish Potatoes",
    category: "Tubers",
    price: 80,
    unit: "kg",
    quantity: 300,
    county: "Nyandarua",
    farmer: "Mary Njeri",
    verified: true,
    availability: "On farm",
    harvested: "",
    minimumOrder: 5,
    description: "Quality Irish potatoes grown in Nyandarua.",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Irish_Potato_Kenya.jpg",
  },
  {
    id: 5,
    name: "Fresh Sukuma Wiki",
    category: "Vegetables",
    price: 40,
    unit: "bunch",
    quantity: 150,
    county: "Kiambu",
    farmer: "Samuel Kamau",
    verified: false,
    availability: "Ready",
    harvested: "2026-11-13",
    minimumOrder: 1,
    description: "Fresh leafy greens harvested locally.",
    image:
      "https://greenspoon.co.ke/wp-content/uploads/2021/09/3J2A8889-720x480.jpg",
  },
  {
    id: 6,
    name: "Sweet Potatoes",
    category: "Tubers",
    price: 90,
    unit: "kg",
    quantity: 180,
    county: "Bungoma",
    farmer: "Grace Wekesa",
    verified: true,
    availability: "Upcoming",
    harvested: "",
    minimumOrder: 3,
    description: "Sweet potatoes from Bungoma farms.",
    image:
      "https://images.unsplash.com/photo-1673533537845-7f7498faf85f?w=600&q=80",
  },
];

const categories = [
  "All categories",
  "Vegetables",
  "Fruits",
  "Cereals and grains",
  "Tubers",
];

const formatKES = (amount) =>
  `KSh ${amount.toLocaleString("en-KE")}`;

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-700 focus:ring-2 focus:ring-green-100";

export default function MarketplacePage() {
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(
    searchParams.get("category") || "All categories"
  );
  const [county, setCounty] = useState(
    searchParams.get("county") || ""
  );
  const [availability, setAvailability] = useState("All");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [minimumQuantity, setMinimumQuantity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [page, setPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    const nextQuery = searchParams.get("q") || "";
    const nextCategory =
      searchParams.get("category") || "All categories";
    const nextCounty = searchParams.get("county") || "";

    setSearch(nextQuery);
    setQuery(nextQuery);
    setCategory(nextCategory);
    setCounty(nextCounty);
    setPage(1);
  }, [searchParams]);

  const pageSize = 6;

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const matchesSearch =
        `${product.name} ${product.county} ${product.farmer}`
          .toLowerCase()
          .includes(query.toLowerCase());

      const matchesCategory =
        category === "All categories" ||
        product.category === category;

      const matchesCounty =
        !county ||
        product.county.toLowerCase().includes(county.toLowerCase());

      const matchesAvailability =
        availability === "All" ||
        product.availability === availability;

      const matchesVerified =
        !verifiedOnly || product.verified;

      const matchesQuantity =
        !minimumQuantity ||
        product.quantity >= Number(minimumQuantity);

      const matchesMinPrice =
        !minPrice || product.price >= Number(minPrice);

      const matchesMaxPrice =
        !maxPrice || product.price <= Number(maxPrice);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesCounty &&
        matchesAvailability &&
        matchesVerified &&
        matchesQuantity &&
        matchesMinPrice &&
        matchesMaxPrice
      );
    });

    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "harvest") {
      result.sort(
        (a, b) =>
          new Date(b.harvested || 0) -
          new Date(a.harvested || 0)
      );
    }

    return result;
  }, [
    query,
    category,
    county,
    availability,
    verifiedOnly,
    minimumQuantity,
    minPrice,
    maxPrice,
    sortBy,
  ]);

  const pageCount = Math.ceil(filteredProducts.length / pageSize);

  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setQuery("");
    setCategory("All categories");
    setCounty("");
    setAvailability("All");
    setVerifiedOnly(false);
    setMinimumQuantity("");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("default");
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-[#f7faf6] px-4 py-10 text-gray-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-green-700">
            Farm fresh produce
          </p>

          <h1 className="text-3xl font-bold text-green-950 sm:text-4xl">
            Marketplace
          </h1>

          <p className="mt-3 text-gray-600">
            Discover agricultural produce directly from farmers
            across Kenya.
          </p>
        </div>

        {/* Search controls */}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
          className="mb-7 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_180px_140px_auto]"
        >
          <input
            aria-label="Search produce"
            className={inputClass}
            placeholder="Search produce, farmer or county..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <select
            aria-label="Product category"
            className={inputClass}
            value={category}
            onChange={(event) =>
              updateFilter(setCategory)(event.target.value)
            }
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <input
            aria-label="County"
            className={inputClass}
            placeholder="County"
            value={county}
            onChange={(event) =>
              updateFilter(setCounty)(event.target.value)
            }
          />

          <button
            type="submit"
            className="rounded-lg bg-green-800 px-6 py-2.5 font-semibold text-white transition hover:bg-green-900"
          >
            Search
          </button>
        </form>

        <div className="grid gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sidebar filters */}
          <aside className="h-fit rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-lg font-bold text-green-950">
                Filters
              </h2>

              <button
                type="button"
                onClick={resetFilters}
                className="text-sm font-medium text-green-700 hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label
                  htmlFor="availability"
                  className="mb-2 block text-sm font-semibold"
                >
                  Availability
                </label>

                <select
                  id="availability"
                  className={inputClass}
                  value={availability}
                  onChange={(event) =>
                    updateFilter(setAvailability)(event.target.value)
                  }
                >
                  <option value="All">All availability</option>
                  <option value="Ready">Ready</option>
                  <option value="On farm">On farm</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={verifiedOnly}
                  onChange={(event) =>
                    updateFilter(setVerifiedOnly)(event.target.checked)
                  }
                  className="h-4 w-4 accent-green-700"
                />
                Verified farmers only
              </label>

              <div>
                <label
                  htmlFor="minimumQuantity"
                  className="mb-2 block text-sm font-semibold"
                >
                  Minimum available quantity
                </label>

                <input
                  id="minimumQuantity"
                  type="number"
                  min="0"
                  className={inputClass}
                  placeholder="e.g. 100"
                  value={minimumQuantity}
                  onChange={(event) =>
                    updateFilter(setMinimumQuantity)(event.target.value)
                  }
                />

                <p className="mt-1 text-xs text-gray-500">
                  Filter by available stock (units vary by product).
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Price range (KSh per unit)
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    aria-label="Minimum price"
                    type="number"
                    min="0"
                    placeholder="Min"
                    className={inputClass}
                    value={minPrice}
                    onChange={(event) =>
                      updateFilter(setMinPrice)(event.target.value)
                    }
                  />

                  <input
                    aria-label="Maximum price"
                    type="number"
                    min="0"
                    placeholder="Max"
                    className={inputClass}
                    value={maxPrice}
                    onChange={(event) =>
                      updateFilter(setMaxPrice)(event.target.value)
                    }
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="sortBy"
                  className="mb-2 block text-sm font-semibold"
                >
                  Sort by
                </label>

                <select
                  id="sortBy"
                  className={inputClass}
                  value={sortBy}
                  onChange={(event) =>
                    updateFilter(setSortBy)(event.target.value)
                  }
                >
                  <option value="default">Featured</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="harvest">Newest harvest</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Product results */}
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-green-950">
                Available produce
              </h2>

              <span className="text-sm text-gray-500">
                {filteredProducts.length} products found
              </span>
            </div>

            {visibleProducts.length === 0 ? (
              <div className="rounded-xl border bg-white p-12 text-center">
                <h3 className="text-lg font-semibold">
                  No products found
                </h3>

                <p className="mt-2 text-gray-500">
                  Try adjusting your search or filters.
                </p>

                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-5 font-semibold text-green-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="h-44 bg-green-50">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src =
                            "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80";
                        }}
                      />
                    </div>

                    <div className="p-5">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="text-lg font-bold">
                          {product.name}
                        </h3>

                        <span className="rounded-full bg-green-50 px-2 py-1 text-xs text-green-800">
                          {product.availability}
                        </span>
                      </div>

                      <p className="text-lg font-bold text-green-800">
                        {formatKES(product.price)} / {product.unit}
                      </p>

                      <p className="mt-3 text-sm text-gray-600">
                        {product.quantity} {product.unit} available
                        {" · "}{product.county}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {product.harvested
                          ? `Harvested ${product.harvested}`
                          : "Harvest date not yet available"}
                      </p>

                      <p className="mt-2 text-sm text-gray-600">
                        Farmer: {product.farmer}
                      </p>

                      <div className="mt-4 flex items-center justify-between gap-2">
                        {product.verified ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                            ✓ Verified farmer
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Verification pending
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="text-sm font-semibold text-green-800 hover:underline"
                        >
                          View details
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {pageCount > 1 && (
              <nav
                aria-label="Marketplace pagination"
                className="mt-8 flex justify-center gap-2"
              >
                {Array.from({ length: pageCount }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index + 1)}
                    aria-current={
                      page === index + 1 ? "page" : undefined
                    }
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      page === index + 1
                        ? "bg-green-800 text-white"
                        : "border bg-white text-gray-700"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </nav>
            )}
          </section>
        </div>

        {/* Product details preview */}
        {selectedProduct && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedProduct(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-dialog-title"
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <h2
                  id="product-dialog-title"
                  className="text-2xl font-bold text-green-950"
                >
                  {selectedProduct.name}
                </h2>

                <button
                  type="button"
                  aria-label="Close product details"
                  onClick={() => setSelectedProduct(null)}
                  className="text-2xl text-gray-500"
                >
                  ×
                </button>
              </div>

              <img
                src={selectedProduct.image}
                alt={selectedProduct.name}
                className="mt-4 h-56 w-full rounded-xl object-cover"
                onError={(event) => {
                  event.currentTarget.onerror = null;
                  event.currentTarget.src =
                    "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80";
                }}
              />

              <p className="mt-4 text-xl font-bold text-green-800">
                {formatKES(selectedProduct.price)} /{" "}
                {selectedProduct.unit}
              </p>

              <p className="mt-3 text-gray-600">
                {selectedProduct.description}
              </p>

              <div className="mt-5 space-y-2 text-sm">
                <p>Category: {selectedProduct.category}</p>
                <p>County: {selectedProduct.county}</p>
                <p>Farmer: {selectedProduct.farmer}</p>
                <p>
                  Available: {selectedProduct.quantity}{" "}
                  {selectedProduct.unit}
                </p>
                <p>
                  Minimum order: {selectedProduct.minimumOrder}{" "}
                  {selectedProduct.unit}
                </p>
                <p>Availability: {selectedProduct.availability}</p>
                <p>
                  Verification:{" "}
                  {selectedProduct.verified
                    ? "Verified farmer"
                    : "Pending"}
                </p>
              </div>

              <p className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-900">
                This is a frontend preview. Product ordering and
                authentication will be connected in a later step.
              </p>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedProduct(null)}
                  className="rounded-lg border px-5 py-3 font-medium"
                >
                  Close
                </button>

                <Link
                  to="/login"
                  className="rounded-lg bg-green-800 px-5 py-3 font-semibold text-white"
                >
                  Login to order
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
