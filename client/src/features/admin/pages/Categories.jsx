
import { useState } from "react";
import AdminSidebar from "../components/AdminSidebar.jsx";
import AdminHeader from "../components/AdminHeader.jsx";

const initialCategories = [
  { id: 1, name: "Vegetables", products: 0, visible: true },
  { id: 2, name: "Fruits", products: 0, visible: true },
  { id: 3, name: "Cereals and grains", products: 0, visible: true },
  { id: 4, name: "Tubers", products: 0, visible: true },
];

function Categories() {
  const [categories, setCategories] = useState(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState("");

  const openAddForm = () => {
    setEditingId(null);
    setCategoryName("");
    setMessage("");
    setShowForm(true);
  };

  const openEditForm = (category) => {
    setEditingId(category.id);
    setCategoryName(category.name);
    setMessage("");
    setShowForm(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = categoryName.trim();

    if (!trimmedName) {
      setMessage("Please enter a category name.");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name.toLowerCase() === trimmedName.toLowerCase() &&
        category.id !== editingId
    );

    if (duplicate) {
      setMessage("This category already exists.");
      return;
    }

    if (editingId !== null) {
      setCategories((previous) =>
        previous.map((category) =>
          category.id === editingId
            ? { ...category, name: trimmedName }
            : category
        )
      );
      setMessage("Category updated successfully.");
    } else {
      setCategories((previous) => [
        ...previous,
        {
          id: Date.now(),
          name: trimmedName,
          products: 0,
          visible: true,
        },
      ]);
      setMessage("Category added successfully.");
    }

    setShowForm(false);
    setCategoryName("");
    setEditingId(null);
  };

  const toggleVisibility = (id) => {
    setCategories((previous) =>
      previous.map((category) =>
        category.id === id
          ? { ...category, visible: !category.visible }
          : category
      )
    );

    setMessage("Category visibility updated.");
  };

  return (
    <div className="flex min-h-screen bg-[#f4f7f2]">
      <AdminSidebar />

      <div className="min-w-0 flex-1">
        <AdminHeader />

        <main className="p-5 sm:p-6">
          <h1 className="mb-4 text-2xl font-bold text-[#1f2933]">
            Categories
          </h1>

          <section className="rounded-md border border-gray-300 bg-white p-4">
            <h2 className="mb-3 font-semibold text-[#1f2933]">
              Categories
            </h2>

            <button
              type="button"
              onClick={openAddForm}
              className="mb-4 rounded-md bg-[#12432f] px-4 py-2 text-sm text-white hover:bg-green-900"
            >
              Add category
            </button>

            {showForm && (
              <form
                onSubmit={handleSubmit}
                className="mb-5 rounded-md border border-gray-300 bg-gray-50 p-4"
              >
                <h3 className="mb-3 font-medium text-gray-800">
                  {editingId !== null ? "Edit category" : "Add category"}
                </h3>

                <label
                  htmlFor="category-name"
                  className="mb-1 block text-sm text-gray-700"
                >
                  Category name
                </label>

                <input
                  id="category-name"
                  type="text"
                  value={categoryName}
                  onChange={(event) => setCategoryName(event.target.value)}
                  placeholder="Enter category name"
                  className="mb-3 w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-green-700"
                  autoFocus
                />

                {message && (
                  <p className="mb-3 text-sm text-red-600">{message}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-md bg-[#12432f] px-4 py-2 text-sm text-white hover:bg-green-900"
                  >
                    {editingId !== null ? "Save changes" : "Save category"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setCategoryName("");
                      setEditingId(null);
                      setMessage("");
                    }}
                    className="rounded-md border border-gray-400 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {message && !showForm && (
              <p className="mb-3 text-sm text-green-700" role="status">
                {message}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-300 text-gray-700">
                    <th className="px-2 py-3 font-medium">Category</th>
                    <th className="px-2 py-3 font-medium">Products</th>
                    <th className="px-2 py-3 font-medium">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {categories.map((category) => (
                    <tr
                      key={category.id}
                      className="border-b border-gray-200 text-gray-700"
                    >
                      <td className="px-2 py-3">
                        <span className={!category.visible ? "text-gray-400" : ""}>
                          {category.name}
                        </span>
                        {!category.visible && (
                          <span className="ml-2 text-xs text-gray-400">
                            (Hidden)
                          </span>
                        )}
                      </td>

                      <td className="px-2 py-3">
                        {category.products}
                      </td>

                      <td className="px-2 py-3">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => openEditForm(category)}
                            className="font-medium text-green-800 underline hover:text-green-600"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleVisibility(category.id)}
                            className="font-medium text-green-800 underline hover:text-green-600"
                          >
                            {category.visible ? "Hide" : "Show"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Later: legumes, herbs, spices.
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}

export default Categories;
