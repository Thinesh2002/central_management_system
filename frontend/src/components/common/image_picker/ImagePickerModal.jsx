import { useEffect, useState } from "react";
import { ImageOff, Search, X } from "lucide-react";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import Loader from "../Loader";
import {
  dedupeImageLibraryRows,
  resolveImageUrl,
} from "../../../pages/product_management/products/product_dashboard/utils/localProductsImageHelpers";

function unwrapList(response) {
  const data = response?.data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

export default function ImagePickerModal({ open, onClose, onSelect }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  async function loadImages(term) {
    setLoading(true);

    try {
      const res = await localProductsApi.getImages({
        limit: 200,
        ...(term ? { search: term } : {}),
      });

      setImages(dedupeImageLibraryRows(unwrapList(res)));
    } catch {
      setImages([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setSearch("");
    loadImages("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const timer = setTimeout(() => loadImages(search), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-[#243b57] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-[#653bb3] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <Search size={20} />
            <p className="text-base font-black">Select Image</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={18} />
          </button>
        </div>

        <div className="border-b border-slate-700 bg-[#1c3048] px-5 py-3">
          <div className="flex items-center gap-2 border border-slate-600 bg-slate-900/60 px-3 py-2">
            <Search size={14} className="text-slate-400" />
            <input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by SKU... (leave empty to show all images)"
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <Loader label="Loading images..." className="h-full" minHeight="0" />
          ) : images.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-500">
              <ImageOff size={26} />
              <span className="text-sm font-semibold">No images found.</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => onSelect(image)}
                  className="group flex cursor-pointer flex-col overflow-hidden border border-slate-700 bg-slate-900/40 text-left transition hover:border-violet-400"
                >
                  <span className="flex aspect-square items-center justify-center overflow-hidden bg-white">
                    <img
                      src={resolveImageUrl(image.image_url || image.image_path)}
                      alt={image.alt_text || image.file_name || "Image"}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  </span>

                  <span
                    className="truncate px-2 py-1.5 text-[10px] font-semibold text-slate-300"
                    title={image.sku || image.file_name || ""}
                  >
                    {image.sku || image.file_name || "-"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
