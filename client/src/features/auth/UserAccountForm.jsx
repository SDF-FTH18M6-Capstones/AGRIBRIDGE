
import { useState } from "react";
import FormInput from "../../components/forms/FormInput";

const initialFormData = {
  full_name: "",
  email: "",
  phone_number: "",
};

export default function UserAccountForm({
  initialValues = {},
  onSubmit,
  onCancel,
}) {
  const [formData, setFormData] = useState({
    ...initialFormData,
    ...initialValues,
  });

  const [errors, setErrors] = useState({});

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  }

  function validateForm() {
    const newErrors = {};

    if (!formData.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (
      formData.phone_number &&
      !/^\+?[0-9\s()-]{7,20}$/.test(formData.phone_number)
    ) {
      newErrors.phone_number = "Enter a valid phone number";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) return;

    onSubmit({
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone_number: formData.phone_number.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormInput
        label="Full Name"
        name="full_name"
        value={formData.full_name}
        onChange={handleChange}
        error={errors.full_name}
      />

      <FormInput
        label="Email Address"
        name="email"
        type="email"
        value={formData.email}
        onChange={handleChange}
        error={errors.email}
      />

      <FormInput
        label="Phone Number"
        name="phone_number"
        type="tel"
        value={formData.phone_number}
        onChange={handleChange}
        error={errors.phone_number}
      />

      {initialValues.role && (
        <p className="text-sm text-gray-600">
          Account role: <strong>{initialValues.role}</strong>
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded bg-green-700 px-4 py-2 text-white"
        >
          Save Changes
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="rounded border px-4 py-2"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
