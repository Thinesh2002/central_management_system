import { ImagePlus } from "lucide-react";
import { getImageUrl } from "../../utils/variantPageHelpers";

export default function RowImagePreview({ image, onOpen }) {
  const preview = getImageUrl(image);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-14 w-14 cursor-pointer items-center justify-center overflow-hidden border border-slate-700 bg-[#0a101d] transition hover:border-orange-400 hover:shadow-[0_0_18px_rgba(249,115,22,0.35)]"
    >
      {preview ? (
        <img
          src={preview}
          alt="Variant"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
          onError={(event) => {
            event.currentTarget.src =
              "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
          }}
        />
      ) : (
        <ImagePlus size={18} className="text-slate-500" />
      )}
    </button>
  );
}
