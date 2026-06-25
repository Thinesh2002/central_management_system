import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import useFilePreview from "../../hooks/useFilePreview";
import { getImageFileName, getImageUrl } from "../../utils/variantPageHelpers";

export default function SubImageBox({
  label,
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
    <div>
      <p className="mb-2 text-xs font-black text-slate-300">{label}</p>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className={`flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border bg-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          markedRemove
            ? "border-rose-400 opacity-50"
            : "border-slate-500/60 hover:border-violet-300"
        }`}
      >
        {hasImage ? (
          <img src={preview} alt={label} className="h-full w-full object-contain" />
        ) : (
          <div className="text-center text-slate-500">
            <ImagePlus size={24} className="mx-auto mb-2" />
            <p className="text-xs font-bold">Add</p>
          </div>
        )}
      </button>

      <div className="mt-2 rounded-md border border-slate-500/30 bg-slate-700/40 px-2 py-1.5 text-center">
        <p className="truncate text-[11px] font-bold text-slate-300">
          {file?.name || getImageFileName(image)}
        </p>
      </div>

      {hasImage ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onToggleRemove}
          className={`mt-2 w-full rounded-md border px-2 py-1.5 text-xs font-bold ${
            markedRemove
              ? "border-slate-500 text-slate-200 hover:bg-slate-700"
              : "border-rose-400/50 text-rose-200 hover:bg-rose-500/10"
          }`}
        >
          {markedRemove ? "Undo" : "Remove"}
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
