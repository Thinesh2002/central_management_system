import { useRef } from "react";
import { ImagePlus, Images, X } from "lucide-react";

export default function ImageUploadBox({
  preview,
  placeholderIcon: PlaceholderIcon = ImagePlus,
  placeholderSize = 20,
  onUploadFile,
  onSelectExisting,
  onRemove,
  markedRemove = false,
  disabled = false,
  boxClassName = "",
  accept = "image/jpeg,image/png,image/gif,image/webp",
}) {
  const inputRef = useRef(null);

  return (
    <div className="flex flex-col gap-1.5">
      <div
        className={`overflow-hidden border bg-white ${
          markedRemove ? "border-rose-400 opacity-50" : "border-slate-700"
        } ${boxClassName}`}
      >
        {preview ? (
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#0a101d] text-slate-500">
            <PlaceholderIcon size={placeholderSize} />
          </div>
        )}
      </div>

      {!disabled ? (
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            title="Upload a new image"
            className="flex flex-1 cursor-pointer items-center justify-center gap-1 border border-slate-700 bg-slate-800/70 px-1.5 py-1 text-[10px] font-bold text-slate-200 hover:border-yellow-500 hover:text-yellow-300"
          >
            <ImagePlus size={11} />
            Upload
          </button>

          {onSelectExisting ? (
            <button
              type="button"
              onClick={onSelectExisting}
              title="Pick an already-uploaded image"
              className="flex flex-1 cursor-pointer items-center justify-center gap-1 border border-violet-600/50 bg-violet-600/15 px-1.5 py-1 text-[10px] font-bold text-violet-200 hover:bg-violet-600/25"
            >
              <Images size={11} />
              Select
            </button>
          ) : null}

          {preview && onRemove ? (
            <button
              type="button"
              onClick={onRemove}
              title={markedRemove ? "Undo remove" : "Remove image"}
              className="flex cursor-pointer items-center justify-center border border-rose-500/40 bg-rose-500/10 px-1.5 py-1 text-rose-300 hover:bg-rose-500/20"
            >
              <X size={11} />
            </button>
          ) : null}
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          if (file) onUploadFile(file);
        }}
      />
    </div>
  );
}
