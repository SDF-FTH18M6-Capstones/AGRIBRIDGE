
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "./ProductCard";
import ProductFilters from "./ProductFilters";
import { categories, sampleProducts } from "./sampleProducts";

const PAGE_SIZE = 2;

export default function MarketplacePage() {
  const [params] = useSearchParams();
  const initialSearch = params.get("search") ?? "";

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [category, setCategory] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return sampleProducts.filter((product) => {
      const matchesCategory =
        category === "All" || product.category === category;

      const matchesSearch =
        !term ||
        product.name.toLowerCase().includes(term) ||
        product.location.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [searchTerm, category]);

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function handleSearchSubmit(e) {
    e.preventDefault();
    setSearchTerm(searchInput);
    setPage(1);
  }

  function handleCategoryChange(selectedCategory) {
    setCategory(selectedCategory);
    setPage(1);
  }

  function handlePrevious() {
    setPage((previousPage) => Math.max(1, previousPage - 1));
  }

  function handleNext() {
    setPage((previousPage) =>
      Math.min(totalPages, previousPage + 1)
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-bold text-stone-900 sm:text-3xl">
        Marketplace
      </h1>

      <ProductFilters
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        categories={categories}
        category={category}
        onCategoryChange={handleCategoryChange}
      />

      <p className="mb-6 mt-6 text-stone-600">
        Showing {filtered.length} available{" "}
        {filtered.length === 1 ? "product" : "products"}
      </p>

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">
          No products match your search. Try a different word or category.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      <nav
        className="mt-8 flex items-center justify-between"
        aria-label="Pagination"
      >
        <button
          type="button"
          onClick={handlePrevious}
          disabled={currentPage === 1}
          className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          &larr; Previous
        </button>

        <span className="text-sm font-medium text-stone-600">
          Page {currentPage} of {totalPages}
        </span>

        <button
          type="button"
          onClick={handleNext}
          disabled={currentPage === totalPages}
          className="rounded-md px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next &rarr;
        </button>
      </nav>
    </div>
  );
}
