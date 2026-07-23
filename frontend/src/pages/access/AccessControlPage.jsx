import React, { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCcw, Save, ShieldCheck, X } from "lucide-react";
import api, { getApiError } from "../../config/api";
import { getStoredUser } from "../../config/auth";

const ACTIONS = ["view", "edit", "delete"];

const ACTION_LABELS = {
  view: "View",
  edit: "Edit",
  delete: "Delete",
};

const initialPageForm = {
  page_key: "",
  page_name: "",
  route_path: "",
  icon: "LayoutDashboard",
};

function actionField(action) {
  return `can_${action}`;
}

function makeSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function flattenPermissions(pages = []) {
  return pages.map((page) => ({
    row_key: page.page_key,
    type: "page",
    page_key: page.page_key,
    page_name: page.page_name,
    route_path: page.route_path,
    permission: {
      ...page.permission,
      page_key: page.permission?.page_key || page.page_key,
      can_view: page.permission?.can_view ? 1 : 0,
      can_edit: page.permission?.can_edit ? 1 : 0,
      can_delete: page.permission?.can_delete ? 1 : 0,
      can_create: 0,
      can_export: 0,
    },
  }));
}

export default function AccessControlPage() {
  const currentUser = getStoredUser();

  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [targetUser, setTargetUser] = useState(null);

  const [rows, setRows] = useState([]);
  const [locked, setLocked] = useState(false);

  const [openPageModal, setOpenPageModal] = useState(false);
  const [pageForm, setPageForm] = useState(initialPageForm);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingPage, setCreatingPage] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const editableUsers = useMemo(() => {
    if (currentUser?.role === "master_admin") return users;
    return users.filter((user) => user.role === "user");
  }, [currentUser?.role, users]);

  async function loadUsers() {
    const { data } = await api.get("/users");
    const list = data.users || [];

    setUsers(list);

    const first = list.find(
      (user) => currentUser?.role === "master_admin" || user.role === "user"
    );

    if (!selectedUserId && first) {
      setSelectedUserId(String(first.id));
    }
  }

  async function loadPermissions(userId) {
    if (!userId) return;

    setLoading(true);
    setError("");

    try {
      const { data } = await api.get(`/access/users/${userId}`);

      setTargetUser(data.user);
      setRows(flattenPermissions(data.pages || []));
      setLocked(Boolean(data.locked));
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setMessage("");
    setError("");

    try {
      await loadUsers();

      if (selectedUserId) {
        await loadPermissions(selectedUserId);
      }
    } catch (err) {
      setError(getApiError(err));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadPermissions(selectedUserId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId]);

  function togglePermission(rowKey, action) {
    if (locked) return;

    const field = actionField(action);

    setRows((prev) =>
      prev.map((row) => {
        if (row.row_key !== rowKey) return row;

        return {
          ...row,
          permission: {
            ...row.permission,
            [field]: row.permission?.[field] ? 0 : 1,
            can_create: 0,
            can_export: 0,
          },
        };
      })
    );
  }

  function setPageQuick(row, mode) {
    if (locked) return;

    const values = {
      none: {
        can_view: 0,
        can_edit: 0,
        can_delete: 0,
        can_create: 0,
        can_export: 0,
      },
      view: {
        can_view: 1,
        can_edit: 0,
        can_delete: 0,
        can_create: 0,
        can_export: 0,
      },
      full: {
        can_view: 1,
        can_edit: 1,
        can_delete: 1,
        can_create: 0,
        can_export: 0,
      },
    }[mode];

    setRows((prev) =>
      prev.map((item) =>
        item.row_key === row.row_key
          ? {
              ...item,
              permission: {
                ...item.permission,
                ...values,
              },
            }
          : item
      )
    );
  }

  async function savePermissions() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const permissions = rows.map((row) => ({
        ...row.permission,
        page_key: row.page_key,
        can_view: row.permission?.can_view ? 1 : 0,
        can_edit: row.permission?.can_edit ? 1 : 0,
        can_delete: row.permission?.can_delete ? 1 : 0,
        can_create: 0,
        can_export: 0,
      }));

      const { data } = await api.put(`/access/users/${selectedUserId}`, {
        permissions,
      });

      setMessage(data.message || "Access updated successfully.");
      await loadPermissions(selectedUserId);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  function handlePageNameChange(event) {
    const value = event.target.value;
    const key = makeSlug(value);

    setPageForm((prev) => ({
      ...prev,
      page_name: value,
      page_key: prev.page_key || key,
      route_path: prev.route_path || `/${key.replaceAll("_", "-")}`,
    }));
  }

  function handlePageFormChange(event) {
    const { name, value } = event.target;

    setPageForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function createPage(event) {
    event.preventDefault();

    setCreatingPage(true);
    setMessage("");
    setError("");

    try {
      const { data } = await api.post("/access/pages", pageForm);

      setMessage(data.message || "Page created successfully.");
      setPageForm(initialPageForm);
      setOpenPageModal(false);

      if (selectedUserId) {
        await loadPermissions(selectedUserId);
      }
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setCreatingPage(false);
    }
  }

  return (
    <div className="min-h-full w-full bg-slate-950 text-slate-100">
      <div className="w-full border-b border-slate-800 bg-slate-900 px-5 py-4">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Access Control</h2>
            <p className="text-sm text-slate-400">
              Page access only. No sections. Control View, Edit and Delete.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"
            >
              <RefreshCcw size={16} />
              Refresh
            </button>

            <button
              type="button"
              onClick={() => setOpenPageModal(true)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-[12px] font-semibold text-white hover:bg-blue-600"
            >
              <Plus size={16} />
              Add Page
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

      <div className="grid w-full gap-5 p-5 xl:grid-cols-[360px_1fr]">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            <h3 className="text-lg font-bold text-white">Select User</h3>
          </div>

          <label className="mb-2 block text-sm font-semibold text-slate-300">
            User
          </label>

          <select
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-white outline-none focus:border-blue-600"
            value={selectedUserId}
            onChange={(event) => setSelectedUserId(event.target.value)}
          >
            {editableUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.user_uid} - {user.email} ({user.role.replace("_", " ")})
              </option>
            ))}
          </select>

          {targetUser && (
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
              <p>
                <span className="font-semibold text-white">User ID:</span>{" "}
                {targetUser.user_uid}
              </p>
              <p>
                <span className="font-semibold text-white">Email:</span>{" "}
                {targetUser.email}
              </p>
              <p>
                <span className="font-semibold text-white">Role:</span>{" "}
                {targetUser.role.replace("_", " ")}
              </p>

              {locked && (
                <p className="mt-3 rounded-lg border border-amber-800 bg-amber-950 px-3 py-2 font-semibold text-amber-300">
                  Master Admin access is locked and cannot be changed.
                </p>
              )}
            </div>
          )}

          <div className="mt-5 space-y-2 rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">
                Master Admin:
              </span>{" "}
              Full access always.
            </p>
            <p>
              <span className="font-semibold text-slate-200">Admin:</span>{" "}
              Can manage normal user access.
            </p>
            <p>
              <span className="font-semibold text-slate-200">User:</span>{" "}
              Only selected pages will be available.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-800 p-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-bold text-white">Page Permission Matrix</h3>
              <p className="text-xs text-slate-400">
                Only page-level View, Edit and Delete access.
              </p>
            </div>

            <button
              type="button"
              onClick={savePermissions}
              disabled={saving || loading || locked || !selectedUserId}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue-700 px-3 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Access"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-950">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Page
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Route
                  </th>

                  {ACTIONS.map((action) => (
                    <th
                      key={action}
                      className="px-4 py-3 text-center font-semibold text-slate-300"
                    >
                      {ACTION_LABELS[action]}
                    </th>
                  ))}

                  <th className="px-4 py-3 text-left font-semibold text-slate-300">
                    Quick
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 bg-slate-900">
                {rows.map((row) => (
                  <tr key={row.row_key} className="hover:bg-slate-800/70">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-white">
                      {row.page_name}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                      {row.route_path || "-"}
                    </td>

                    {ACTIONS.map((action) => {
                      const field = actionField(action);

                      return (
                        <td key={action} className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={Boolean(row.permission?.[field])}
                            onChange={() => togglePermission(row.row_key, action)}
                            disabled={locked}
                            className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-blue-600"
                          />
                        </td>
                      );
                    })}

                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPageQuick(row, "view")}
                          disabled={locked}
                          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
                        >
                          View
                        </button>

                        <button
                          type="button"
                          onClick={() => setPageQuick(row, "full")}
                          disabled={locked}
                          className="rounded-md border border-blue-700 bg-blue-900/50 px-3 py-1 text-xs font-semibold text-blue-200 hover:bg-blue-800 disabled:opacity-60"
                        >
                          Full
                        </button>

                        <button
                          type="button"
                          onClick={() => setPageQuick(row, "none")}
                          disabled={locked}
                          className="rounded-md border border-red-800 bg-red-950 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-900 disabled:opacity-60"
                        >
                          None
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {!rows.length && (
                  <tr>
                    <td
                      colSpan="6"
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      {loading ? "Loading permissions..." : "No pages found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {openPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between rounded-t-2xl border-b border-white/10 bg-[#653bb3] px-5 py-4">
              <div>
                <h3 className="text-lg font-bold text-white">Add New Page</h3>
                <p className="text-sm text-purple-200/80">
                  Create page only. No section fields.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpenPageModal(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={createPage} className="space-y-4 p-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Page Name
                </label>
                <input
                  name="page_name"
                  value={pageForm.page_name}
                  onChange={handlePageNameChange}
                  placeholder="Example: Reports"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Page Key
                </label>
                <input
                  name="page_key"
                  value={pageForm.page_key}
                  onChange={handlePageFormChange}
                  placeholder="reports"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Route Path
                </label>
                <input
                  name="route_path"
                  value={pageForm.route_path}
                  onChange={handlePageFormChange}
                  placeholder="/reports"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-300">
                  Icon Name
                </label>
                <input
                  name="icon"
                  value={pageForm.icon}
                  onChange={handlePageFormChange}
                  placeholder="LayoutDashboard"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-2.5 text-white outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setOpenPageModal(false)}
                  className="h-8 rounded-md border border-slate-700 bg-slate-800 px-3 text-[12px] font-semibold text-slate-200 hover:bg-slate-700"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingPage}
                  className="h-8 rounded-md bg-blue-700 px-3 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creatingPage ? "Creating..." : "Create Page"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}