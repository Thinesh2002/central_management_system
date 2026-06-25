import { ImagePlus, Plus } from "lucide-react";
import { getImageUrl } from "../../utils/variantPageHelpers";

export default function SubImagesCell({ images = [], onOpen }) {
  const shown = images.filter(Boolean);

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {shown.slice(0, 4).map((image, index) => (
          <button
            key={image?.id || index}
            type="button"
            onClick={onOpen}
            className="group h-10 w-10 cursor-pointer overflow-hidden border border-slate-700 bg-[#0a101d] transition hover:border-orange-400 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)]"
          >
            <img
              src={getImageUrl(image)}
              alt={`Sub ${index + 1}`}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
            />
          </button>
        ))}

        {!shown.length ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex h-10 w-10 cursor-pointer items-center justify-center border border-slate-700 bg-[#0a101d] text-slate-600 transition hover:border-orange-400 hover:text-orange-300 hover:shadow-[0_0_14px_rgba(249,115,22,0.3)]"
          >
            <ImagePlus size={15} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-orange-500/50 bg-orange-500/10 text-orange-300 transition hover:bg-orange-500/20 hover:text-orange-200 hover:shadow-[0_0_14px_rgba(249,115,22,0.35)]"
        title="Add / edit sub images"
      >
        <Plus size={16} />
      </button>

      <div>
        <p className="text-xs font-bold text-slate-300">Sub Images</p>
        <p className="mt-1 text-xs font-bold text-slate-500">
          {shown.length} selected
        </p>
      </div>
    </div>
  );
}
