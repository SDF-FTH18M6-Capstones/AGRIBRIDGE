
import { useState } from "react";

import FormInput from "../../components/forms/FormInput.jsx";
import FormTextarea from "../../components/forms/FormTextarea.jsx";
import FormSelect from "../../components/forms/FormSelect.jsx";

const initialFormData = {
  product_name: "",
  category_id: "",
  description: "",
  price: "",
  quantity: "",
};

const categoryOptions = [
  { value: "1", label: "Vegetables" },
  { value: "2", label: "Fruits" },
  { value: "3", label: "Grains" },
];

function ProductForm({ onSubmit, onCancel, initialValues = {} }) {
  const [formData, setFormData] = useState(() => ({
    ...initialFormData,
    ...initialValues,
  }));

  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.product_name.trim()) {
      newErrors.product_name = "Product name is required.";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Please select a category.";
    }

    if (
      formData.price === "" ||
      !Number.isFinite(Number(formData.price)) ||
      Number(formData.price) <= 0
    ) {
      newErrors.price = "Enter a valid price greater than zero.";
    }

    if (
      formData.quantity === "" ||
      !Number.isInteger(Number(formData.quantity)) ||
      Number(formData.quantity) <= 0
    ) {
      newErrors.quantity = "Enter a whole number greater than zero.";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (onSubmit) {
      onSubmit({
        ...formData,
        category_id: Number(formData.category_id),
        price: Number(formData.price),
        quantity: Number(formData.quantity),
      });
    }
  };

  const handleCancel = () => {
    setFormData({
      ...initialFormData,
      ...initialValues,
    });

    setErrors({});

    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mx-auto max-w-xl rounded-xl bg-white p-6 shadow"
    >
      <h2 className="mb-6 text-2xl font-bold text-green-800">
        Product Details
      </h2>

      <FormInput
        label="Product Name"
        name="product_name"
        value={formData.product_name}
        onChange={handleChange}
        placeholder="e.g. Fresh Tomatoes"
        error={errors.product_name}
      />

      <FormSelect
        label="Product Category"
        name="category_id"
        value={formData.category_id}
        onChange={handleChange}
        options={categoryOptions}
        placeholder="Choose a category"
        error={errors.category_id}
      />

      <FormTextarea
        label="Product Description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Describe your product..."
        error={errors.description}
      />

      <FormInput
        label="Price (KES)"
        name="price"
        type="number"
        value={formData.price}
        onChange={handleChange}
        placeholder="e.g. 150"
        error={errors.price}
      />

      <FormInput
        label="Available Quantity"
        name="quantity"
        type="number"
        value={formData.quantity}
        onChange={handleChange}
        placeholder="e.g. 50"
        error={errors.quantity}
      />

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg border border-gray-300 px-5 py-2"
        >
          Cancel
        </button>

        <button
          type="submit"
          className="rounded-lg bg-green-700 px-5 py-2 text-white hover:bg-green-800"
        >
          Save Product
        </button>
      </div>
    </form>
  );
}

export default ProductForm;
