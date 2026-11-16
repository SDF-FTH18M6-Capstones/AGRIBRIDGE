
import { Link } from "react-router-dom";

export default function ProductCard({ product }) {
  const { id, name, price, unit, location, farmer, image } = product;

  return (
    <article className="flex flex-col overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow-md">

      {/* Product image */}
      <div className="aspect-[16/10] w-full overflow-hidden bg-stone-100">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>

      {/* Product details */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-lg font-semibold text-stone-900">
          {name}
        </h3>

        <p className="mt-1 font-medium text-green-900">
          KES {price} / {unit}
        </p>

        <p className="mt-1 text-sm text-stone-600">
          {location} <span aria-hidden="true">&middot;</span> {farmer}
        </p>

        <div className="mt-auto pt-4">
          <Link
            to={`/marketplace/${id}`}
            className="block rounded-md border border-green-800 px-4 py-2 text-center text-sm font-semibold text-green-900 hover:bg-green-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700"
          >
            View Product &rarr;
          </Link>
        </div>
      </div>
    </article>
  );
}
