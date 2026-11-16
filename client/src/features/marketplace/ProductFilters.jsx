export default function ProductFilters({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  categories,
  category,
  onCategoryChange,
}) {
  return (
    <div className="space-y-4">
      <form onSubmit={onSearchSubmit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="product-search" className="sr-only">
          Search produce or location
        </label>
        <input
          id="product-search"
          type="search"
          value={searchInput}
          onChange={(e) => onSearchInputChange(e.target.value)}
          placeholder="Search produce or location..."
          className="w-full flex-1 rounded-md border border-stone-300 bg-white px-4 py-2.5 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30"
        />
        <button
          type="submit"
          className="rounded-md bg-green-800 px-6 py-2.5 font-semibold text-white hover:bg-green-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2"
        >
          Search
        </button>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-stone-700">Category:</span>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onCategoryChange(c)}
            aria-pressed={category === c}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 ${
              category === c
                ? 'border-green-800 bg-green-800 text-white'
                : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-100'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}