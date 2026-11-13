
import { useState } from "react";
import ProductForm from "./ProductForm.jsx";

function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [message, setMessage] = useState("");

  const handleAddProduct = (productData) => {
    const newProduct = {
      ...productData,
      id: crypto.randomUUID(),
    };

    setProducts((previous) => [...previous, newProduct]);
    setShowForm(false);
    setMessage("Product added successfully!");
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(false);
    setMessage("");
  };

  const handleUpdateProduct = (updatedData) => {
    setProducts((previous) =>
      previous.map((product) =>
        product.id === editingProduct.id
          ? { ...product, ...updatedData }
          : product
      )
    );

    setEditingProduct(null);
    setMessage("Product updated successfully!");
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setMessage("");
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-green-800">
          My Farm Products
        </h1>

        {!showForm && !editingProduct && (
          <button
            type="button"
            onClick={() => {
              setShowForm(true);
              setMessage("");
            }}
            className="rounded-lg bg-green-700 px-5 py-2 text-white"
          >
            + Add Product
          </button>
        )}
      </div>

      {message && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-green-100 p-3 text-green-800"
        >
          {message}
        </p>
      )}

      {showForm && (
        <ProductForm
          onSubmit={handleAddProduct}
          onCancel={handleCancel}
        />
      )}

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          Available Products
        </h2>

        {products.length === 0 ? (
          <p className="text-gray-500">
            No products added yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {products.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border bg-white p-5 shadow-sm"
              >
                {editingProduct?.id === product.id ? (
                  <ProductForm
                    key={product.id}
                    initialValues={product}
                    onSubmit={handleUpdateProduct}
                    onCancel={handleCancel}
                  />
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-green-800">
                      {product.product_name}
                    </h3>

                    <p className="mt-2 text-gray-600">
                      {product.description || "No description provided."}
                    </p>

                    <p className="mt-3 font-medium">
                      Price: KES {product.price}
                    </p>

                    <p className="text-gray-700">
                      Quantity: {product.quantity}
                    </p>

                    <p className="mt-2 text-sm text-gray-500">
                      Category ID: {product.category_id}
                    </p>

                    <button
                      type="button"
                      disabled={showForm || Boolean(editingProduct)}
                      onClick={() => handleEditProduct(product)}
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                    >
                      Edit Product
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductManagement;
