import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import useFilePreview from "../../hooks/useFilePreview";
import { getImageFileName, getImageUrl } from "../../utils/variantPageHelpers";

export default function MainImageBox({
  image,
  file,
  markedRemove,
  disabled,
  onPick,
  onToggleRemove,
}) {
  const inputRef = useRef(null);
  const filePreview = useFilePreview(file);
  const preview = filePreview || getImageUrl(image);
  const hasImage = Boolean(preview);

  return (
    <div className="mx-auto w-full max-w-[330px]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          markedRemove
            ? "border-rose-400 opacity-50"
            : "border-violet-400 hover:border-violet-300"
        }`}
      >
        {hasImage ? (
          <img src={preview} alt="Main" className="h-full w-full object-contain" />
        ) : (
          <div className="text-center text-slate-500">
            <ImagePlus size={34} className="mx-auto mb-2" />
            <p className="text-sm font-bold">Click to add image</p>
          </div>
        )}
      </button>

      <div className="mt-5 rounded-lg border border-slate-500/40 bg-slate-700/50 px-4 py-3 text-center">
        <p className="truncate text-xs font-bold text-slate-200">
          {file?.name || getImageFileName(image)}
        </p>
      </div>

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleRemove}
          className={`mt-3 w-full rounded-lg border px-3 py-2 text-sm font-bold ${
            markedRemove
              ? "border-slate-500 text-slate-200 hover:bg-slate-700"
              : "border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          {markedRemove ? "Undo Remove" : "Remove Image"}
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          const selectedFile = event.target.files?.[0] || null;
          event.target.value = "";
          if (selectedFile) onPick(selectedFile);
        }}
      />
    </div>
  );
}
