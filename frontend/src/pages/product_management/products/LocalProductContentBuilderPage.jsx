import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./components/ProductPageLayout";
import { RichTextField } from "../../../components/common/rich_text_editor/RichTextEditor";
import { getErrorMessage, normalizeList } from "./utils/productSku";
import { resolveImageUrl } from "./product_dashboard/utils/localProductsImageHelpers";
import { useToast } from "../../../components/common/toast/ToastProvider";
import Loader from "../../../components/common/Loader";

const LAYOUT_OPTIONS = [
  { value: "image_left", label: "Image Left / Text Right" },
  { value: "image_right", label: "Text Left / Image Right" },
  { value: "image_full", label: "Full-width Image" },
  { value: "text_only", label: "Text Only" },
];

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

function newBlockShape() {
  return {
    _key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    layout: "image_left",
    heading: "",
    body_html: "",
    image_url: "",
    status: "active",
    dirty: true,
  };
}

export default function LocalProductContentBuilderPage() {
  const { productId } = useParams();
  const showToast = useToast();

  const [product, setProduct] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, blocksRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getContentBlocks(productId),
      ]);

      setProduct(unwrapOne(productRes));

      const rows = normalizeList(blocksRes).map((row) => ({
        _key: `existing-${row.id}`,
        id: row.id,
        layout: row.layout || "image_left",
        heading: row.heading || "",
        body_html: row.body_html || "",
        image_url: row.image_url || "",
        status: row.status || "active",
        dirty: false,
      }));

      setBlocks(rows);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load content blocks."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  function updateBlock(key, patch) {
    setBlocks((prev) =>
      prev.map((block) => (block._key === key ? { ...block, ...patch, dirty: true } : block))
    );
  }

  function addBlock() {
    setBlocks((prev) => [...prev, newBlockShape()]);
  }

  function removeBlock(block) {
    if (!window.confirm("Remove this content block?")) return;

    if (!block.id) {
      setBlocks((prev) => prev.filter((item) => item._key !== block._key));
      return;
    }

    localProductsApi
      .deleteContentBlock(block.id)
      .then(() => {
        setBlocks((prev) => prev.filter((item) => item._key !== block._key));
        showToast("Content block removed.");
      })
      .catch((error) => alert(getErrorMessage(error, "Unable to remove content block.")));
  }

  function moveBlock(index, direction) {
    setBlocks((prev) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;

      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function handleUploadBlockImage(key, file) {
    setUploadingKey(key);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("product_id", productId);

      const response = await localProductsApi.uploadImage(formData);
      const created = response?.data?.data || response?.data;
      const rawUrl = created?.image_url || created?.url || created?.image_path || "";

      updateBlock(key, { image_url: resolveImageUrl(rawUrl) });
    } catch (error) {
      alert(getErrorMessage(error, "Unable to upload image."));
    } finally {
      setUploadingKey(null);
    }
  }

  async function saveAll() {
    setSaving(true);

    try {
      // Track resolved IDs locally (in on-screen order) rather than reading
      // back from `blocks` after the loop - the setBlocks() calls below are
      // async, so the closed-over `blocks` array here would still show
      // newly-created rows as id: null when building the reorder payload.
      const finalIds = [];

      for (const block of blocks) {
        if (!block.dirty) {
          if (block.id) finalIds.push(block.id);
          continue;
        }

        const payload = {
          product_id: productId,
          layout: block.layout,
          heading: block.heading,
          body_html: block.body_html,
          image_url: block.image_url,
          status: block.status,
        };

        if (block.id) {
          await localProductsApi.updateContentBlock(block.id, payload);
          finalIds.push(block.id);
        } else {
          const created = await localProductsApi.createContentBlock(payload);
          const createdData = created?.data?.data || created?.data;
          const newId = createdData?.id;

          if (newId) finalIds.push(newId);

          setBlocks((prev) =>
            prev.map((item) =>
              item._key === block._key ? { ...item, id: newId, dirty: false } : item
            )
          );
        }
      }

      if (finalIds.length) {
        await localProductsApi.reorderContentBlocks(productId, finalIds);
      }

      showToast("A+ content saved successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to save content blocks."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProductPageLayout productId={productId} active="content-builder" product={product}>
      <div className="border border-slate-800 bg-[#0b1220] text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#07101f] px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">A+ Content</p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Build the product description out of stacked image + text blocks, Amazon A+ style.
            </p>
          </div>

          <button
            type="button"
            onClick={saveAll}
            disabled={saving || loading}
            className="inline-flex h-9 cursor-pointer items-center gap-1.5 bg-orange-500 px-4 text-[12px] font-black text-white transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving..." : "Save Content"}
          </button>
        </div>

        {loading ? (
          <Loader label="Loading content blocks..." minHeight="280px" />
        ) : (
          <div className="space-y-4 p-4">
            {blocks.length === 0 && (
              <div className="border border-dashed border-slate-700 bg-[#070b16] p-8 text-center text-[12px] text-slate-500">
                No content blocks yet. Click "Add Block" to start building the A+ description.
              </div>
            )}

            {blocks.map((block, index) => (
              <div key={block._key} className="border border-slate-800 bg-[#070b16]">
                <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a101d] px-3 py-2">
                  <select
                    value={block.layout}
                    onChange={(event) => updateBlock(block._key, { layout: event.target.value })}
                    className="h-8 border border-slate-700 bg-[#0a101d] px-2.5 text-[11px] font-semibold text-slate-100 outline-none focus:border-orange-400"
                  >
                    {LAYOUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveBlock(index, -1)}
                      disabled={index === 0}
                      title="Move up"
                      className="flex h-7 w-7 items-center justify-center border border-slate-700 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveBlock(index, 1)}
                      disabled={index === blocks.length - 1}
                      title="Move down"
                      className="flex h-7 w-7 items-center justify-center border border-slate-700 text-slate-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeBlock(block)}
                      title="Remove block"
                      className="flex h-7 w-7 items-center justify-center border border-rose-500/40 bg-rose-500/10 text-rose-300"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div
                  className={`grid gap-3 p-3 ${
                    block.layout === "text_only" ? "grid-cols-1" : "sm:grid-cols-2"
                  }`}
                >
                  {block.layout !== "text_only" && (
                    <div
                      className={block.layout === "image_full" ? "sm:col-span-2" : ""}
                    >
                      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Image
                      </span>

                      <div className="flex flex-col gap-2">
                        {block.image_url ? (
                          <img
                            src={resolveImageUrl(block.image_url)}
                            alt=""
                            className="h-40 w-full rounded-md border border-slate-800 object-cover"
                          />
                        ) : (
                          <div className="flex h-40 w-full items-center justify-center rounded-md border border-dashed border-slate-700 text-slate-600">
                            No image
                          </div>
                        )}

                        <label className="inline-flex h-8 w-fit cursor-pointer items-center gap-1.5 border border-slate-700 bg-slate-800/60 px-3 text-[11px] font-semibold text-slate-200 hover:bg-slate-800">
                          {uploadingKey === block._key ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <ImagePlus size={12} />
                          )}
                          {uploadingKey === block._key ? "Uploading..." : "Upload Image"}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) handleUploadBlockImage(block._key, file);
                              event.target.value = "";
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {block.layout !== "image_full" && (
                    <div>
                      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        Heading
                      </label>
                      <input
                        value={block.heading}
                        onChange={(event) => updateBlock(block._key, { heading: event.target.value })}
                        placeholder="Block heading (optional)"
                        className="mb-2 h-9 w-full border border-slate-700 bg-[#0a101d] px-2.5 text-[12px] font-semibold text-slate-100 outline-none placeholder:text-slate-600 focus:border-orange-400"
                      />

                      <RichTextField
                        label="Text"
                        value={block.body_html}
                        onChange={(value) => updateBlock(block._key, { body_html: value })}
                        minHeight={140}
                        placeholder="Block text..."
                        onUploadImage={(file) => handleUploadBlockImage(block._key, file)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addBlock}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 border border-slate-700 bg-slate-800/60 px-4 text-[12px] font-semibold text-slate-200 hover:bg-slate-800"
            >
              <Plus size={14} />
              Add Block
            </button>
          </div>
        )}
      </div>
    </ProductPageLayout>
  );
}
