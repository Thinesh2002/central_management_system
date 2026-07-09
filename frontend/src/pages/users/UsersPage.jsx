import React, { useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, RefreshCcw, Trash2 } from "lucide-react";
import api, { getApiError } from "../../config/api";
import { getStoredUser } from "../../config/auth";
import { usePagePermission } from "../../components/common/permissions/PermissionsProvider";
import { Link } from "react-router-dom";

const emptyForm = {
  user_uid: "",
  name: "",
  email: "",
  password: "",
  role: "user",
  status: "active",
};

function isLocked(user) {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

export default function UsersPage() {
  const currentUser = getStoredUser();
  const { canEdit, canDelete } = usePagePermission("users");

  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const roleOptions = useMemo(() => {
    return currentUser?.role === "master_admin"
      ? ["master_admin", "admin", "user"]
      : ["user"];
  }, [currentUser?.role]);

  async function loadUsers() {
    setError("");

    try {
      const { data } = await api.get("/users");
      setUsers(data.users || []);
    } catch (err) {
      setError(getApiError(err));
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(event) {
    setForm((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
  }

  function startEdit(user) {
    setEditingId(user.id);

    setForm({
      user_uid: user.user_uid,
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      status: user.status,
    });

    setMessage("");
    setError("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    try {
      const payload = { ...form };

      if (editingId && !payload.password) {
        delete payload.password;
      }

      const { data } = editingId
        ? await api.put(`/users/${editingId}`, payload)
        : await api.post("/users", payload);

      setMessage(data.message || "User saved successfully.");
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(user) {
    const confirmed = window.confirm(`Delete ${user.email}?`);
    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const { data } = await api.delete(`/users/${user.id}`);
      setMessage(data.message || "User deleted successfully.");
      await loadUsers();
    } catch (err) {
      setError(getApiError(err));
    }
  }

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">User Management</h2>
            <p className="text-sm text-slate-400">
              Master Admin manages all roles. Admin can manage normal users only.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/access-control"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"
            >
              <KeyRound size={14} />
              Access
            </Link>

            <button
              type="button"
              onClick={loadUsers}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"
            >
              <RefreshCcw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="mx-5 mt-4 rounded-lg border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm font-semibold text-emerald-300">
          {message}
        </div>
      )}

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <div className="grid w-full gap-5 p-5 xl:grid-cols-[420px_1fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-slate-800 bg-slate-900 p-5"
        >
          <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <Plus size={18} className="text-blue-400" />
            {editingId ? "Edit User" : "Create User"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                User ID
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-600"
                name="user_uid"
                value={form.user_uid}
                onChange={handleChange}
                placeholder="Example: Thinesh"
                required
              />
              <p className="mt-1 text-xs text-slate-500">
                Login can use this User ID or email.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Name
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-600"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Email
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-600"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Password
              </label>
              <input
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-600"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required={!editingId}
                minLength={8}
                placeholder={
                  editingId
                    ? "Leave empty to keep old password"
                    : "Minimum 8 characters"
                }
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Role
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Status
                </label>
                <select
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="h-9 flex-1 rounded-md bg-blue-700 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Saving..." : editingId ? "Update" : "Create"}
            </button>

            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="h-9 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="border-b border-slate-800 px-5 py-4">
            <h3 className="text-lg font-bold text-white">Users List</h3>
            <p className="text-sm text-slate-400">
              Manage user details, status and login security.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    User ID
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Failed
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Last Login
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-300">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/70">
                    <td className="px-4 py-3 font-semibold text-white">
                      {user.user_uid}
                    </td>

                    <td className="px-4 py-3 font-semibold text-white">
                      {user.name}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {user.email}
                    </td>

                    <td className="px-4 py-3 capitalize text-slate-300">
                      {user.role.replace("_", " ")}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          user.status === "active"
                            ? "bg-emerald-950 text-emerald-300"
                            : "bg-red-950 text-red-300"
                        }`}
                      >
                        {user.status}
                      </span>

                      {isLocked(user) && (
                        <span className="ml-2 rounded-full bg-amber-950 px-3 py-1 text-xs font-semibold text-amber-300">
                          locked
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {user.failed_login_attempts || 0}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleString()
                        : "-"}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => startEdit(user)}
                          className="mr-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                        >
                          Edit
                        </button>
                      )}

                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => removeUser(user)}
                          disabled={
                            user.is_master_locked === 1 ||
                            user.role === "master_admin" ||
                            user.id === currentUser?.id
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-red-900 bg-red-950 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 size={15} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}

                {!users.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}