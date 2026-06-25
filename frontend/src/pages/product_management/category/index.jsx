import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  AlertCircle,
  CheckSquare,
  Square,
  X,
  Save,
  ChevronRight,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
} from "lucide-react";

import { categoryApi } from "../../../config/sub_api/product_management_api/category/categories_api";
import { subCategoryApi } from "../../../config/sub_api/product_management_api/category/sub_category_api";
import productModelApi from "../../../config/sub_api/product_management_api/category/product_model_api/product_model_api";

const emptyCategory = {
  category_code: "",
  name: "",
  slug: "",
  description: "",
};

const emptySub = {
  category_code: "",
  sub_category_code: "",
  name: "",
  slug: "",
  description: "",
};

const emptyModel = {
  category_id: "",
  sub_category_id: "",
  model_code: "",
  name: "",
  slug: "",
  description: "",
};

function getApiMessage(error, fallback = "Something went wrong") {
  return error?.response?.data?.message || error?.message || fallback;
}

function extractRows(res) {
  const payload = res?.data;

  if (Array.isArray(payload?.data?.rows)) return payload.data.rows;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;

  return [];
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function code(row) {
  return String(row?.category_code || "").trim();
}

function ActionIcon({ title, color, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-5 w-5 cursor-pointer items-center justify-center bg-transparent p-0 disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {children}
    </button>
  );
}

function ActionLabel({ title, color, onClick, disabled, children }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`cursor-pointer rounded px-1.5 py-0.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
    >
      {children}
    </button>
  );
}

function TextInput({ label, value, onChange, disabled, placeholder }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-slate-400">{label}</label>
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[13px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
      />
    </div>
  );
}

function TextArea({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className="mb-1 block text-[13px] text-slate-400">{label}</label>
      <textarea
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Optional description"
        rows={3}
        className="w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-[13px] text-slate-300 outline-none placeholder:text-slate-600 disabled:opacity-70"
      />
    </div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
      <div>
        <h3 className="text-[15px] font-normal text-slate-100">{title}</h3>
        <p className="text-[12px] text-slate-500">
          Manage details using this popup.
        </p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-900"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ModalFooter({ readOnly, saving, mode, onClose }) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        type="button"
        onClick={onClose}
        disabled={saving}
        className="h-8 min-w-[90px] rounded-md border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-300 disabled:opacity-60"
      >
        {readOnly ? "Close" : "Cancel"}
      </button>

      {!readOnly && (
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-8 min-w-[120px] items-center justify-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-3 text-[13px] text-slate-950 disabled:opacity-60"
        >
          <Save size={14} />
          {saving ? "Saving..." : mode === "edit" ? "Update" : "Save"}
        </button>
      )}
    </div>
  );
}

export default function CategoryPage() {
  const [categories, setCategories] = useState([]);
  const [subs, setSubs] = useState([]);
  const [models, setModels] = useState([]);

  const [selectedIds, setSelectedIds] = useState([]);
  const [expanded, setExpanded] = useState("");
  const [expandedSubs, setExpandedSubs] = useState({});

  const [search, setSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [catModal, setCatModal] = useState({
    open: false,
    mode: "add",
    id: null,
  });

  const [subModal, setSubModal] = useState({
    open: false,
    mode: "add",
    id: null,
  });

  const [modelModal, setModelModal] = useState({
    open: false,
    mode: "add",
    id: null,
  });

  const [deleteModal, setDeleteModal] = useState({
    open: false,
    type: "",
    row: null,
  });

  const [catForm, setCatForm] = useState(emptyCategory);
  const [subForm, setSubForm] = useState(emptySub);
  const [modelForm, setModelForm] = useState(emptyModel);

  const catReadOnly = catModal.mode === "view";
  const subReadOnly = subModal.mode === "view";
  const modelReadOnly = modelModal.mode === "view";

  async function loadCategories() {
    try {
      setLoading(true);
      setError("");

      const res = await categoryApi.getAll({
        page: 1,
        limit: 100,
      });

      setCategories(extractRows(res));
      setSelectedIds([]);
    } catch (err) {
      setError(getApiMessage(err, "Failed to load categories"));
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadSubs() {
    try {
      setSubLoading(true);

      const res = await subCategoryApi.getAll({
        page: 1,
        limit: 500,
      });

      setSubs(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load sub categories"));
      setSubs([]);
    } finally {
      setSubLoading(false);
    }
  }

  async function loadModels() {
    try {
      setModelLoading(true);

      const res = await productModelApi.getAll({
        page: 1,
        limit: 1000,
      });

      setModels(extractRows(res));
    } catch (err) {
      setError(getApiMessage(err, "Failed to load product models"));
      setModels([]);
    } finally {
      setModelLoading(false);
    }
  }

  useEffect(() => {
    loadCategories();
    loadSubs();
    loadModels();
  }, []);

  const filteredCategories = useMemo(() => {
    const key = search.trim().toLowerCase();

    if (!key) return categories;

    return categories.filter((row) =>
      [row.category_code, row.name, row.slug, row.description]
        .join(" ")
        .toLowerCase()
        .includes(key)
    );
  }, [categories, search]);

  const filteredIds = filteredCategories.map((row) => row.id);

  const allSelected =
    filteredIds.length > 0 &&
    filteredIds.every((id) => selectedIds.includes(id));

  const modelCategory = categories.find(
    (row) => String(row.id) === String(modelForm.category_id)
  );

  const modelSubOptions = subs.filter(
    (row) => String(row.category_code) === String(modelCategory?.category_code)
  );

  function subRows(categoryCode) {
    const key = subSearch.trim().toLowerCase();

    return subs.filter((row) => {
      if (String(row.category_code || "") !== String(categoryCode || "")) {
        return false;
      }

      if (!key) return true;

      return [row.sub_category_code, row.name, row.slug, row.description]
        .join(" ")
        .toLowerCase()
        .includes(key);
    });
  }

  function modelRows(subCategoryId, subCategoryCode) {
    return models.filter((row) => {
      const byId = String(row.sub_category_id || "") === String(subCategoryId);
      const byCode =
        String(row.sub_category_code || "") === String(subCategoryCode || "");

      return byId || byCode;
    });
  }

  function setMsg(ok = "", bad = "") {
    setSuccess(ok);
    setError(bad);
  }

  function changeCat(field, value) {
    setCatForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { slug: slugify(value) } : {}),
    }));
  }

  function changeSub(field, value) {
    setSubForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" ? { slug: slugify(value) } : {}),
    }));
  }

  function changeModel(field, value) {
    setModelForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "category_id" ? { sub_category_id: "" } : {}),
      ...(field === "name" ? { slug: slugify(value) } : {}),
    }));
  }

  function toggleSelect(id) {
    setMsg();

    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    setMsg();

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }

    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  }

  function toggleExpand(categoryCode) {
    setMsg();

    if (!categoryCode) {
      setError("This category does not have category code.");
      return;
    }

    setExpanded((prev) => (prev === categoryCode ? "" : categoryCode));
  }

  function toggleSubExpand(subCategoryId) {
    setMsg();

    setExpandedSubs((prev) => ({
      ...prev,
      [subCategoryId]: !prev[subCategoryId],
    }));
  }

  function openCategory(mode, row = null) {
    setMsg();

    setCatModal({
      open: true,
      mode,
      id: row?.id || null,
    });

    setCatForm(
      row
        ? {
            category_code: row.category_code || "",
            name: row.name || "",
            slug: row.slug || "",
            description: row.description || "",
          }
        : emptyCategory
    );
  }

  function openSub(mode, parent = null, child = null) {
    setMsg();

    setSubModal({
      open: true,
      mode,
      id: child?.id || null,
    });

    setSubForm(
      child
        ? {
            category_code: child.category_code || "",
            sub_category_code: child.sub_category_code || "",
            name: child.name || "",
            slug: child.slug || "",
            description: child.description || "",
          }
        : {
            ...emptySub,
            category_code: parent ? code(parent) : "",
          }
    );
  }

  function openModel(mode, parent = null, child = null, model = null) {
    setMsg();

    setModelModal({
      open: true,
      mode,
      id: model?.id || null,
    });

    setModelForm(
      model
        ? {
            category_id: model.category_id || parent?.id || "",
            sub_category_id: model.sub_category_id || child?.id || "",
            model_code: model.model_code || "",
            name: model.name || "",
            slug: model.slug || "",
            description: model.description || "",
          }
        : {
            ...emptyModel,
            category_id: parent?.id || "",
            sub_category_id: child?.id || "",
          }
    );
  }

  function closeCategory() {
    if (saving) return;

    setCatModal({
      open: false,
      mode: "add",
      id: null,
    });

    setCatForm(emptyCategory);
  }

  function closeSub() {
    if (saving) return;

    setSubModal({
      open: false,
      mode: "add",
      id: null,
    });

    setSubForm(emptySub);
  }

  function closeModel() {
    if (saving) return;

    setModelModal({
      open: false,
      mode: "add",
      id: null,
    });

    setModelForm(emptyModel);
  }

  async function saveCategory(e) {
    e.preventDefault();

    if (catReadOnly) return;

    const payload = {
      category_code: catForm.category_code.trim(),
      name: catForm.name.trim(),
      slug: catForm.slug.trim() || slugify(catForm.name),
      description: catForm.description.trim() || null,
    };

    if (!payload.category_code) {
      setError("Please enter category code.");
      return;
    }

    if (!payload.name) {
      setError("Please enter category name.");
      return;
    }

    try {
      setSaving(true);
      setMsg();

      if (catModal.mode === "edit") {
        await categoryApi.update(catModal.id, payload);
        setSuccess("Category updated successfully.");
      } else {
        await categoryApi.create(payload);
        setSuccess("Category created successfully.");
      }

      closeCategory();
      await loadCategories();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save category"));
    } finally {
      setSaving(false);
    }
  }

  async function saveSub(e) {
    e.preventDefault();

    if (subReadOnly) return;

    const payload = {
      category_code: subForm.category_code.trim(),
      sub_category_code: subForm.sub_category_code.trim(),
      name: subForm.name.trim(),
      slug: subForm.slug.trim() || slugify(subForm.name),
      description: subForm.description.trim() || null,
    };

    if (!payload.category_code) {
      setError("Please select main category.");
      return;
    }

    if (!payload.sub_category_code) {
      setError("Please enter sub category code.");
      return;
    }

    if (!payload.name) {
      setError("Please enter sub category name.");
      return;
    }

    try {
      setSaving(true);
      setMsg();

      if (subModal.mode === "edit") {
        await subCategoryApi.update(subModal.id, payload);
        setSuccess("Sub category updated successfully.");
      } else {
        await subCategoryApi.create(payload);
        setSuccess("Sub category created successfully.");
      }

      setExpanded(payload.category_code);
      closeSub();
      await loadSubs();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save sub category"));
    } finally {
      setSaving(false);
    }
  }

  async function saveModel(e) {
    e.preventDefault();

    if (modelReadOnly) return;

    const payload = {
      category_id: Number(modelForm.category_id),
      sub_category_id: Number(modelForm.sub_category_id),
      model_code: modelForm.model_code.trim(),
      name: modelForm.name.trim(),
      slug: modelForm.slug.trim() || slugify(modelForm.name),
      description: modelForm.description.trim() || null,
    };

    if (!payload.category_id) {
      setError("Please select main category.");
      return;
    }

    if (!payload.sub_category_id) {
      setError("Please select sub category.");
      return;
    }

    if (!payload.model_code) {
      setError("Please enter model code.");
      return;
    }

    if (!payload.name) {
      setError("Please enter model name.");
      return;
    }

    try {
      setSaving(true);
      setMsg();

      if (modelModal.mode === "edit") {
        await productModelApi.update(modelModal.id, payload);
        setSuccess("Product model updated successfully.");
      } else {
        await productModelApi.create(payload);
        setSuccess("Product model created successfully.");
      }

      const parent = categories.find(
        (row) => String(row.id) === String(payload.category_id)
      );

      if (parent?.category_code) {
        setExpanded(parent.category_code);
      }

      setExpandedSubs((prev) => ({
        ...prev,
        [payload.sub_category_id]: true,
      }));

      closeModel();
      await loadModels();
    } catch (err) {
      setError(getApiMessage(err, "Failed to save product model"));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDeleteNow() {
    const { type, row } = deleteModal;

    if (!row) return;

    try {
      setDeleting(true);
      setMsg();

      if (type === "category") {
        await categoryApi.delete(row.id);

        setCategories((prev) => prev.filter((item) => item.id !== row.id));
        setSelectedIds((prev) => prev.filter((id) => id !== row.id));

        if (expanded === code(row)) {
          setExpanded("");
        }

        setSuccess("Category deleted successfully.");
      } else if (type === "sub") {
        await subCategoryApi.delete(row.id);

        setSubs((prev) => prev.filter((item) => item.id !== row.id));
        setExpandedSubs((prev) => {
          const next = { ...prev };
          delete next[row.id];
          return next;
        });

        setSuccess("Sub category deleted successfully.");
      } else if (type === "model") {
        await productModelApi.delete(row.id);

        setModels((prev) => prev.filter((item) => item.id !== row.id));
        setSuccess("Product model deleted successfully.");
      }

      setDeleteModal({
        open: false,
        type: "",
        row: null,
      });
    } catch (err) {
      setError(getApiMessage(err, "Failed to delete"));
    } finally {
      setDeleting(false);
    }
  }

  async function bulkDelete() {
    if (!selectedIds.length) {
      setError("Please select at least one category.");
      return;
    }

    if (!window.confirm(`Delete ${selectedIds.length} selected categories?`)) {
      return;
    }

    try {
      setDeleting(true);
      setMsg();

      await Promise.all(selectedIds.map((id) => categoryApi.delete(id)));

      setCategories((prev) =>
        prev.filter((row) => !selectedIds.includes(row.id))
      );

      setSelectedIds([]);
      setExpanded("");
      setSuccess(`${selectedIds.length} categories deleted successfully.`);
    } catch (err) {
      setError(getApiMessage(err, "Failed to delete selected categories"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-medium text-slate-100">
            Category Dashboard
          </h1>
          <p className="text-[13px] text-slate-500">
            Manage main categories, sub categories and models.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={bulkDelete}
              disabled={deleting}
              className="h-8 rounded-md border border-red-900 bg-red-950 px-3 text-[13px] text-red-300 disabled:opacity-60"
            >
              Delete ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => openSub("add")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-200"
          >
            <Plus size={14} />
            Add Sub Category
          </button>

          <button
            type="button"
            onClick={() => openCategory("add")}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-yellow-700 bg-yellow-500 px-3 text-[13px] text-slate-950"
          >
            <Plus size={14} />
            Add Category
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 p-2">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search main category..."
              className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 pl-8 pr-3 text-[13px] text-slate-300 outline-none placeholder:text-slate-600"
            />
          </div>

          <div className="relative">
            <Search
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            />

            <input
              type="text"
              value={subSearch}
              onChange={(e) => setSubSearch(e.target.value)}
              placeholder="Search sub categories..."
              className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 pl-8 pr-3 text-[13px] text-slate-300 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {success && (
        <div className="rounded-md border border-emerald-900 bg-emerald-950 px-3 py-2 text-[13px] text-emerald-300">
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 rounded-md border border-red-900 bg-red-950 px-3 py-2 text-[13px] text-red-300">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-center text-[13px] text-slate-500">
          Loading categories...
        </div>
      ) : (
        <div className="overflow-visible rounded-lg border border-slate-800 bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800">
              <thead className="bg-slate-900">
                <tr>
                  <th className="w-10 px-3 py-2 text-left">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="text-slate-500"
                    >
                      {allSelected ? (
                        <CheckSquare size={16} />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                  </th>

                  <th className="w-8 px-2 py-2"></th>

                  {["NO", "Code", "Name", "Slug", "Description", "Action"].map(
                    (header) => (
                      <th
                        key={header}
                        className={`px-3 py-2 text-xs font-normal uppercase tracking-wide text-slate-500 ${
                          header === "Action" ? "text-right" : "text-left"
                        }`}
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {!filteredCategories.length && (
                  <tr>
                    <td
                      colSpan="8"
                      className="px-3 py-5 text-center text-[13px] text-slate-500"
                    >
                      No categories found.
                    </td>
                  </tr>
                )}

                {filteredCategories.map((row, index) => {
                  const categoryCode = code(row);
                  const isExpanded = expanded === categoryCode;
                  const isSelected = selectedIds.includes(row.id);
                  const children = subRows(categoryCode);

                  return (
                    <React.Fragment key={row.id}>
                      <tr
                        className={
                          isSelected ? "bg-blue-950/10" : "bg-slate-950"
                        }
                      >
                        <td className="w-10 px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleSelect(row.id)}
                            className="text-slate-500"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="w-8 px-2 py-2">
                          <button
                            type="button"
                            onClick={() => toggleExpand(categoryCode)}
                            className="inline-flex h-7 w-7 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-200"
                          >
                            {isExpanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        </td>

                        <td className="px-3 py-2 text-[13px] text-slate-400">
                          {index + 1}
                        </td>

                        <td className="px-3 py-2 text-[13px] text-slate-300">
                          {categoryCode || "-"}
                        </td>

                        <td className="px-3 py-2 text-[13px] text-slate-200">
                          {row.name || "-"}
                        </td>

                        <td className="px-3 py-2 text-[13px] text-slate-400">
                          {row.slug || "-"}
                        </td>

                        <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                          <span className="line-clamp-1">
                            {row.description || "-"}
                          </span>
                        </td>

                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <ActionIcon
                              title="View"
                              color="text-sky-400"
                              onClick={() => openCategory("view", row)}
                            >
                              <Eye size={13} />
                            </ActionIcon>

                            <ActionIcon
                              title="Edit"
                              color="text-amber-400"
                              onClick={() => openCategory("edit", row)}
                            >
                              <Edit size={13} />
                            </ActionIcon>

                            <ActionIcon
                              title="Add Sub Category"
                              color="text-emerald-400"
                              onClick={() => openSub("add", row)}
                            >
                              <Plus size={13} />
                            </ActionIcon>

                            <ActionIcon
                              title="Delete"
                              color="text-red-400"
                              onClick={() =>
                                setDeleteModal({
                                  open: true,
                                  type: "category",
                                  row,
                                })
                              }
                            >
                              <Trash2 size={13} />
                            </ActionIcon>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-950">
                          <td colSpan="8" className="px-3 py-3">
                            <div className="rounded-lg border border-slate-800 bg-slate-900/40">
                              {subLoading ? (
                                <div className="px-3 py-4 text-center text-[13px] text-slate-500">
                                  Loading sub categories...
                                </div>
                              ) : !children.length ? (
                                <div className="px-3 py-4 text-center text-[13px] text-slate-500">
                                  No sub categories found for this category.
                                </div>
                              ) : (
                                <table className="min-w-full divide-y divide-slate-800">
                                  <thead>
                                    <tr>
                                      <th className="w-8 px-2 py-2"></th>

                                      {[
                                        "NO",
                                        "Sub Code",
                                        "Name",
                                        "Slug",
                                        "Description",
                                        "Action",
                                      ].map((header) => (
                                        <th
                                          key={header}
                                          className={`px-3 py-2 text-[11px] font-normal uppercase tracking-wide text-slate-500 ${
                                            header === "Action"
                                              ? "text-right"
                                              : "text-left"
                                          }`}
                                        >
                                          {header}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>

                                  <tbody className="divide-y divide-slate-800">
                                    {children.map((child, childIndex) => {
                                      const subExpanded =
                                        !!expandedSubs[child.id];

                                      const childModels = modelRows(
                                        child.id,
                                        child.sub_category_code
                                      );

                                      return (
                                        <React.Fragment key={child.id}>
                                          <tr>
                                            <td className="w-8 px-2 py-2">
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  toggleSubExpand(child.id)
                                                }
                                                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center text-slate-400 hover:text-slate-200"
                                              >
                                                {subExpanded ? (
                                                  <ChevronDown size={15} />
                                                ) : (
                                                  <ChevronRight size={15} />
                                                )}
                                              </button>
                                            </td>

                                            <td className="px-3 py-2 text-[13px] text-slate-500">
                                              {childIndex + 1}
                                            </td>

                                            <td className="px-3 py-2 text-[13px] text-slate-300">
                                              {child.sub_category_code || "-"}
                                            </td>

                                            <td className="px-3 py-2 text-[13px] text-slate-200">
                                              {child.name || "-"}
                                            </td>

                                            <td className="px-3 py-2 text-[13px] text-slate-400">
                                              {child.slug || "-"}
                                            </td>

                                            <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                                              <span className="line-clamp-1">
                                                {child.description || "-"}
                                              </span>
                                            </td>

                                            <td className="px-3 py-2 text-right">
                                              <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                <ActionLabel
                                                  title="Add Model"
                                                  color="bg-emerald-950 text-emerald-300 border border-emerald-900"
                                                  onClick={() =>
                                                    openModel(
                                                      "add",
                                                      row,
                                                      child
                                                    )
                                                  }
                                                >
                                                  Add Model
                                                </ActionLabel>

                                                <ActionLabel
                                                  title="View Sub Category"
                                                  color="bg-sky-950 text-sky-300 border border-sky-900"
                                                  onClick={() =>
                                                    openSub("view", row, child)
                                                  }
                                                >
                                                  View
                                                </ActionLabel>

                                                <ActionLabel
                                                  title="Edit Sub Category"
                                                  color="bg-orange-950 text-orange-300 border border-orange-900"
                                                  onClick={() =>
                                                    openSub("edit", row, child)
                                                  }
                                                >
                                                  Edit
                                                </ActionLabel>

                                                <ActionLabel
                                                  title="Delete Sub Category"
                                                  color="bg-red-950 text-red-300 border border-red-900"
                                                  onClick={() =>
                                                    setDeleteModal({
                                                      open: true,
                                                      type: "sub",
                                                      row: child,
                                                    })
                                                  }
                                                >
                                                  Delete
                                                </ActionLabel>
                                              </div>
                                            </td>
                                          </tr>

                                          {subExpanded && (
                                            <tr className="bg-slate-950">
                                              <td
                                                colSpan="7"
                                                className="px-3 py-3"
                                              >
                                                <div className="ml-7 rounded-md border border-slate-800 bg-slate-950">
                                                  {modelLoading ? (
                                                    <div className="px-3 py-4 text-center text-[13px] text-slate-500">
                                                      Loading models...
                                                    </div>
                                                  ) : !childModels.length ? (
                                                    <div className="flex items-center justify-between gap-2 px-3 py-3 text-[13px] text-slate-500">
                                                      <span>
                                                        No models found under
                                                        this sub category.
                                                      </span>

                                                      <ActionLabel
                                                        title="Add Model"
                                                        color="bg-emerald-950 text-emerald-300 border border-emerald-900"
                                                        onClick={() =>
                                                          openModel(
                                                            "add",
                                                            row,
                                                            child
                                                          )
                                                        }
                                                      >
                                                        Add Model
                                                      </ActionLabel>
                                                    </div>
                                                  ) : (
                                                    <table className="min-w-full divide-y divide-slate-800">
                                                      <thead>
                                                        <tr>
                                                          {[
                                                            "NO",
                                                            "Model Code",
                                                            "Name",
                                                            "Slug",
                                                            "Description",
                                                            "Action",
                                                          ].map((header) => (
                                                            <th
                                                              key={header}
                                                              className={`px-3 py-2 text-[11px] font-normal uppercase tracking-wide text-slate-500 ${
                                                                header ===
                                                                "Action"
                                                                  ? "text-right"
                                                                  : "text-left"
                                                              }`}
                                                            >
                                                              {header}
                                                            </th>
                                                          ))}
                                                        </tr>
                                                      </thead>

                                                      <tbody className="divide-y divide-slate-800">
                                                        {childModels.map(
                                                          (
                                                            model,
                                                            modelIndex
                                                          ) => (
                                                            <tr key={model.id}>
                                                              <td className="px-3 py-2 text-[13px] text-slate-500">
                                                                {modelIndex + 1}
                                                              </td>

                                                              <td className="px-3 py-2 text-[13px] text-slate-300">
                                                                {model.model_code ||
                                                                  "-"}
                                                              </td>

                                                              <td className="px-3 py-2 text-[13px] text-slate-200">
                                                                {model.name ||
                                                                  "-"}
                                                              </td>

                                                              <td className="px-3 py-2 text-[13px] text-slate-400">
                                                                {model.slug ||
                                                                  "-"}
                                                              </td>

                                                              <td className="max-w-md px-3 py-2 text-[13px] text-slate-400">
                                                                <span className="line-clamp-1">
                                                                  {model.description ||
                                                                    "-"}
                                                                </span>
                                                              </td>

                                                              <td className="px-3 py-2 text-right">
                                                                <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                                                                  <ActionLabel
                                                                    title="View Model"
                                                                    color="bg-sky-950 text-sky-300 border border-sky-900"
                                                                    onClick={() =>
                                                                      openModel(
                                                                        "view",
                                                                        row,
                                                                        child,
                                                                        model
                                                                      )
                                                                    }
                                                                  >
                                                                    View
                                                                  </ActionLabel>

                                                                  <ActionLabel
                                                                    title="Edit Model"
                                                                    color="bg-orange-950 text-orange-300 border border-orange-900"
                                                                    onClick={() =>
                                                                      openModel(
                                                                        "edit",
                                                                        row,
                                                                        child,
                                                                        model
                                                                      )
                                                                    }
                                                                  >
                                                                    Edit
                                                                  </ActionLabel>

                                                                  <ActionLabel
                                                                    title="Delete Model"
                                                                    color="bg-red-950 text-red-300 border border-red-900"
                                                                    onClick={() =>
                                                                      setDeleteModal(
                                                                        {
                                                                          open: true,
                                                                          type: "model",
                                                                          row: model,
                                                                        }
                                                                      )
                                                                    }
                                                                  >
                                                                    Delete
                                                                  </ActionLabel>
                                                                </div>
                                                              </td>
                                                            </tr>
                                                          )
                                                        )}
                                                      </tbody>
                                                    </table>
                                                  )}
                                                </div>
                                              </td>
                                            </tr>
                                          )}
                                        </React.Fragment>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && (
        <div className="flex justify-between text-[13px] text-slate-500">
          <p>
            Showing {filteredCategories.length} of {categories.length} categories
          </p>

          {selectedIds.length > 0 && (
            <p className="text-slate-400">{selectedIds.length} selected</p>
          )}
        </div>
      )}

      {catModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={
                catModal.mode === "view"
                  ? "View Category"
                  : catModal.mode === "edit"
                  ? "Edit Category"
                  : "Add Category"
              }
              onClose={closeCategory}
            />

            <form onSubmit={saveCategory} className="space-y-3 p-4">
              <TextInput
                label="Category Code"
                value={catForm.category_code}
                disabled={catReadOnly}
                onChange={(value) => changeCat("category_code", value)}
                placeholder="CAT001"
              />

              <TextInput
                label="Category Name"
                value={catForm.name}
                disabled={catReadOnly}
                onChange={(value) => changeCat("name", value)}
                placeholder="Electronics"
              />

              <TextInput
                label="Slug"
                value={catForm.slug}
                disabled={catReadOnly}
                onChange={(value) => changeCat("slug", value)}
                placeholder="electronics"
              />

              <TextArea
                label="Description"
                value={catForm.description}
                disabled={catReadOnly}
                onChange={(value) => changeCat("description", value)}
              />

              <ModalFooter
                readOnly={catReadOnly}
                saving={saving}
                mode={catModal.mode}
                onClose={closeCategory}
              />
            </form>
          </div>
        </div>
      )}

      {subModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={
                subModal.mode === "view"
                  ? "View Sub Category"
                  : subModal.mode === "edit"
                  ? "Edit Sub Category"
                  : "Add Sub Category"
              }
              onClose={closeSub}
            />

            <form onSubmit={saveSub} className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">
                  Main Category
                </label>

                <select
                  value={subForm.category_code}
                  disabled={subReadOnly}
                  onChange={(e) => changeSub("category_code", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[13px] text-slate-300 outline-none disabled:opacity-70"
                >
                  <option value="">Select main category</option>

                  {categories.map((row) => (
                    <option key={row.id} value={code(row)}>
                      {code(row)} - {row.name}
                    </option>
                  ))}
                </select>
              </div>

              <TextInput
                label="Sub Category Code"
                value={subForm.sub_category_code}
                disabled={subReadOnly}
                onChange={(value) => changeSub("sub_category_code", value)}
                placeholder="SUB001"
              />

              <TextInput
                label="Sub Category Name"
                value={subForm.name}
                disabled={subReadOnly}
                onChange={(value) => changeSub("name", value)}
                placeholder="Mobile Phones"
              />

              <TextInput
                label="Slug"
                value={subForm.slug}
                disabled={subReadOnly}
                onChange={(value) => changeSub("slug", value)}
                placeholder="mobile-phones"
              />

              <TextArea
                label="Description"
                value={subForm.description}
                disabled={subReadOnly}
                onChange={(value) => changeSub("description", value)}
              />

              <ModalFooter
                readOnly={subReadOnly}
                saving={saving}
                mode={subModal.mode}
                onClose={closeSub}
              />
            </form>
          </div>
        </div>
      )}

      {modelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title={
                modelModal.mode === "view"
                  ? "View Product Model"
                  : modelModal.mode === "edit"
                  ? "Edit Product Model"
                  : "Add Product Model"
              }
              onClose={closeModel}
            />

            <form onSubmit={saveModel} className="space-y-3 p-4">
              <div>
                <label className="mb-1 block text-[13px] text-slate-400">
                  Main Category
                </label>

                <select
                  value={modelForm.category_id}
                  disabled={modelReadOnly}
                  onChange={(e) => changeModel("category_id", e.target.value)}
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[13px] text-slate-300 outline-none disabled:opacity-70"
                >
                  <option value="">Select main category</option>

                  {categories.map((row) => (
                    <option key={row.id} value={row.id}>
                      {code(row)} - {row.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[13px] text-slate-400">
                  Sub Category
                </label>

                <select
                  value={modelForm.sub_category_id}
                  disabled={modelReadOnly || !modelForm.category_id}
                  onChange={(e) =>
                    changeModel("sub_category_id", e.target.value)
                  }
                  className="h-9 w-full rounded-md border border-slate-800 bg-slate-900 px-3 text-[13px] text-slate-300 outline-none disabled:opacity-70"
                >
                  <option value="">Select sub category</option>

                  {modelSubOptions.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.sub_category_code} - {row.name}
                    </option>
                  ))}
                </select>
              </div>

              <TextInput
                label="Model Code"
                value={modelForm.model_code}
                disabled={modelReadOnly}
                onChange={(value) => changeModel("model_code", value)}
                placeholder="MDL001"
              />

              <TextInput
                label="Model Name"
                value={modelForm.name}
                disabled={modelReadOnly}
                onChange={(value) => changeModel("name", value)}
                placeholder="Round Ceiling Light"
              />

              <TextInput
                label="Slug"
                value={modelForm.slug}
                disabled={modelReadOnly}
                onChange={(value) => changeModel("slug", value)}
                placeholder="round-ceiling-light"
              />

              <TextArea
                label="Description"
                value={modelForm.description}
                disabled={modelReadOnly}
                onChange={(value) => changeModel("description", value)}
              />

              <ModalFooter
                readOnly={modelReadOnly}
                saving={saving}
                mode={modelModal.mode}
                onClose={closeModel}
              />
            </form>
          </div>
        </div>
      )}

      {deleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 shadow-2xl">
            <ModalHeader
              title="Confirm Delete"
              onClose={() =>
                setDeleteModal({
                  open: false,
                  type: "",
                  row: null,
                })
              }
            />

            <div className="space-y-3 p-4">
              <p className="text-[13px] text-slate-300">
                Are you sure you want to delete{" "}
                <span className="text-red-300">
                  {deleteModal.row?.name || "this item"}
                </span>
                ?
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDeleteModal({
                      open: false,
                      type: "",
                      row: null,
                    })
                  }
                  disabled={deleting}
                  className="h-8 min-w-[90px] rounded-md border border-slate-700 bg-slate-900 px-3 text-[13px] text-slate-300 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={confirmDeleteNow}
                  disabled={deleting}
                  className="h-8 min-w-[100px] rounded-md border border-red-900 bg-red-950 px-3 text-[13px] text-red-300 disabled:opacity-60"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}