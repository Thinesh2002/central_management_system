import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, UserPlus, Loader2 } from "lucide-react";
import api, { getApiError } from "../../../config/api";
import { getStoredUser } from "../../../config/auth";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 transition focus:border-blue-500";

const emptyForm = {
  user_uid: "",
  name: "",
  email: "",
  password: "",
  role: "user",
  status: "active",
};

export default function CreateUserPage() {
  const navigate = useNavigate();
  const currentUser = getStoredUser();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const roleOptions = useMemo(() => {
    return currentUser?.role === "master_admin"
      ? ["master_admin", "admin", "user"]
      : ["user"];
  }, [currentUser?.role]);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);
    setError("");

    try {
      await api.post("/users", form);
      navigate("/users");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-5 text-slate-100 md:px-6">
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          <UserPlus size={20} className="text-blue-400" />
          Create User
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          New users get default permissions for their role automatically.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm font-semibold text-red-300">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5"
      >
        <Field label="User ID">
          <input
            className={inputClass}
            value={form.user_uid}
            onChange={(e) => updateField("user_uid", e.target.value)}
            placeholder="Example: Thinesh"
            required
          />
          <p className="mt-1 text-xs text-slate-500">Login can use this User ID or email.</p>
        </Field>

        <Field label="Name">
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            required
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
          />
        </Field>

        <Field label="Password">
          <input
            type="password"
            className={inputClass}
            value={form.password}
            onChange={(e) => updateField("password", e.target.value)}
            placeholder="Minimum 8 characters"
            minLength={8}
            required
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Role">
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => updateField("role", e.target.value)}
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role.replace("_", " ")}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </Field>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-blue-700 text-[12px] font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? "Creating..." : "Create User"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-300">{label}</label>
      {children}
    </div>
  );
}
