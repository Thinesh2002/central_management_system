import React, { useEffect, useState } from "react";
import { KeyRound, Plus, RefreshCcw, Trash2, Edit } from "lucide-react";
import api, { getApiError } from "../../config/api";
import { getStoredUser } from "../../config/auth";
import { usePagePermission } from "../../components/common/permissions/PermissionsProvider";
import { usePageOverlay } from "../../components/common/page_overlay/PageOverlayProvider";
import { useConfirm } from "../../components/common/confirm_modal/ConfirmProvider";
import { Link } from "react-router-dom";

function isLocked(user) {
  if (!user.locked_until) return false;
  return new Date(user.locked_until) > new Date();
}

export default function UsersPage() {
  const currentUser = getStoredUser();
  const { canEdit, canDelete } = usePagePermission("users");
  const { openOverlay } = usePageOverlay();
  const confirm = useConfirm();

  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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

  async function removeUser(user) {
    const confirmed = await confirm(`Delete ${user.email}?`);
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
            {canEdit && (
              <button
                type="button"
                onClick={() => openOverlay("/users/create")}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-[12px] font-semibold text-white hover:bg-blue-600"
              >
                <Plus size={14} />
                Add User
              </button>
            )}

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

      <div className="w-full p-5">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => openOverlay(`/users/edit/${user.id}`)}
                            title="Edit user"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                          >
                            <Edit size={13} />
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
                            title="Delete user"
                            className="flex h-7 w-7 items-center justify-center rounded-md border border-red-900 bg-red-950 text-red-300 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
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
