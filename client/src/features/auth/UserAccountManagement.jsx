
import { useState } from "react";
import UserAccountForm from "./UserAccountForm";

const initialUser = {
  user_id: 1,
  full_name: "Demo User",
  email: "demo@example.com",
  phone_number: "0712345678",
  role: "farmer",
};

export default function UserAccountManagement() {
  const [user, setUser] = useState(initialUser);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState("");

  function handleSave(updatedDetails) {
    setUser((previous) => ({
      ...previous,
      ...updatedDetails,
    }));

    setIsEditing(false);
    setMessage("Account details updated successfully!");
  }

  function handleEdit() {
    setMessage("");
    setIsEditing(true);
  }

  function handleCancel() {
    setIsEditing(false);
    setMessage("");
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-6 text-2xl font-bold">
        My Account
      </h1>

      {message && (
        <div
          role="status"
          className="mb-4 rounded bg-green-100 p-3 text-green-800"
        >
          {message}
        </div>
      )}

      {isEditing ? (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            Edit Account
          </h2>

          <UserAccountForm
            initialValues={user}
            onSubmit={handleSave}
            onCancel={handleCancel}
          />
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                Full Name
              </p>
              <p className="font-medium">{user.full_name}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Email Address
              </p>
              <p className="font-medium">{user.email}</p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Phone Number
              </p>
              <p className="font-medium">
                {user.phone_number || "Not provided"}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500">
                Account Role
              </p>
              <p className="font-medium capitalize">
                {user.role}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleEdit}
            className="mt-6 rounded bg-green-700 px-4 py-2 text-white hover:bg-green-800"
          >
            Edit Account
          </button>
        </div>
      )}
    </div>
  );
}

    