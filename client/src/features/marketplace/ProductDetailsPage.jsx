
import { Link, useParams } from "react-router-dom";
import { sampleProducts } from "./sampleProducts";

export default function ProductDetailsPage() {
  const { id } = useParams();

  const product = sampleProducts.find(
    (item) => item.id === Number(id)
  );

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl p-8 text-center">
        <h1 className="text-2xl font-bold text-stone-900">
          Product not found
        </h1>

        <Link
          to="/marketplace"
          className="mt-5 inline-block rounded-md bg-green-800 px-5 py-2 text-white"
        >
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to="/marketplace"
        className="mb-6 inline-block text-sm font-medium text-green-800 hover:underline"
      >
        &larr; Back to Marketplace
      </Link>

      <div className="grid gap-8 rounded-xl bg-white p-5 shadow-sm md:grid-cols-2 md:p-8">
        <div className="overflow-hidden rounded-lg bg-stone-100">
          <img
            src={product.image}
            alt={product.name}
            className="h-80 w-full object-cover"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-green-800">
            {product.category}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-stone-900">
            {product.name}
          </h1>

          <p className="mt-4 text-2xl font-bold text-green-900">
            KES {product.price} / {product.unit}
          </p>

          <div className="mt-6 space-y-3 text-stone-700">
            <p><strong>Farmer:</strong> {product.farmer}</p>
            <p><strong>Location:</strong> {product.location}</p>
            <p><strong>Category:</strong> {product.category}</p>
          </div>

          <p className="mt-6 text-sm text-stone-500">
            Contact and ordering features will be added in a future update.
          </p>
        </div>
      </div>
    </div>
  );
}
