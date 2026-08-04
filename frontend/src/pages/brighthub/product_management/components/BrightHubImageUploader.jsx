import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { brighthubProductApi } from "../../../../config/sub_api/brighthub_api/brighthub_product_api";

// `images` is an array of { image_url } objects, matching the shape
// BrightHub's own GET /products/:bhid response uses for its images field -
// PUT/POST send the same shape back for symmetry.
export default function BrightHubImageUploader({ accountId, images, onChange }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    setError("");

    try {
      const res = await brighthubProductApi.uploadMedia(accountId, file);
      const media = res?.data?.data;

      if (!media?.url) throw new Error("BrightHub did not return an image URL.");

      onChange([...(images || []), { image_url: media.url }]);
    } catch (err) {
      setError(
        err?.response?.data?.error || err?.response?.data?.message || err?.friendlyMessage || "Failed to upload image."
      );
    } finally {
      setUploading(false);
    }
  }

  function removeImage(index) {
    onChange((images || []).filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-3">
        {(images || []).map((image, index) => (
          <div
            key={image.image_url || index}
            className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white"
          >
            <img src={image.image_url} alt="Product" className="h-full w-full object-contain" />
            <button
              type="button"
              onClick={() => removeImage(index)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100"
              title="Remove image"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 text-slate-400 transition hover:border-yellow-400/60 hover:text-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
          <span className="text-[10px] font-semibold">{uploading ? "Uploading" : "Add Image"}</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {error && <p className="text-xs font-semibold text-red-400">{error}</p>}
      <p className="text-xs text-slate-500">JPEG, PNG, WEBP, GIF, or SVG — max 8MB.</p>
    </div>
  );
}
