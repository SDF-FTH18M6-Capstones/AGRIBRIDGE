
function FormTextarea({
  label,
  name,
  value,
  onChange,
  placeholder,
  error,
}) {
  return (
    <div className="mb-4">
      <label
        htmlFor={name}
        className="mb-1 block font-medium text-gray-700"
      >
        {label}
      </label>

      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={4}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`w-full rounded-lg border p-3 outline-none focus:ring-2 ${
          error
            ? "border-red-500 focus:ring-red-400"
            : "border-gray-300 focus:ring-green-500"
        }`}
      />

      {error && (
        <p
          id={`${name}-error`}
          className="mt-1 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default FormTextarea;
