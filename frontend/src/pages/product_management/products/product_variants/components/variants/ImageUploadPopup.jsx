import { useState } from "react";
import { ImagePlus, RefreshCw, Save, X } from "lucide-react";
import { MAX_EXTRA_IMAGES } from "../../constants/variantImageConstants";
import MainImageBox from "./MainImageBox";
import SubImageBox from "./SubImageBox";

export default function ImageUploadPopup({
  mode,
  title,
  mainImage,
  extraImages = [],
  saving,
  onClose,
  onSave,
}) {
  const [mainFile, setMainFile] = useState(null);
  const [extraFiles, setExtraFiles] = useState({});
  const [removeIds, setRemoveIds] = useState({});

  const safeExtras = Array.from(
    { length: MAX_EXTRA_IMAGES },
    (_, index) => extraImages[index] || null
  );

  function toggleRemove(image) {
    if (!image?.id) return;

    setRemoveIds((prev) => ({
      ...prev,
      [image.id]: !prev[image.id],
    }));
  }

  function handleMainPick(file) {
    setMainFile(file);

    if (mainImage?.id) {
      setRemoveIds((prev) => ({
        ...prev,
        [mainImage.id]: false,
      }));
    }
  }

  function handleExtraPick(file, index) {
    setExtraFiles((prev) => ({
      ...prev,
      [index]: file,
    }));

    const currentImage = safeExtras[index];

    if (currentImage?.id) {
      setRemoveIds((prev) => ({
        ...prev,
        [currentImage.id]: false,
      }));
    }
  }

  async function handleSave() {
    const removals = [];

    if (mode === "main" && mainImage?.id && removeIds[mainImage.id]) {
      removals.push(mainImage);
    }

    if (mode === "sub") {
      safeExtras.forEach((image) => {
        if (image?.id && removeIds[image.id]) {
          removals.push(image);
        }
      });
    }

    await onSave({
      mode,
      mainFile,
      extraFiles,
      removals,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={() => {
        if (!saving) onClose();
      }}
    >
      <div
        className="w-full max-w-[980px] overflow-hidden rounded-xl border border-slate-700 bg-[#243b57] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-violet-700 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <ImagePlus size={20} />
            <p className="text-base font-black">
              {mode === "main" ? "Product Image" : "Sub Images"}
            </p>
          </div>

          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-5 py-5">
          {mode === "main" ? (
            <MainImageBox
              image={mainImage}
              file={mainFile}
              markedRemove={Boolean(mainImage?.id && removeIds[mainImage.id])}
              disabled={saving}
              onPick={handleMainPick}
              onToggleRemove={() => toggleRemove(mainImage)}
            />
          ) : (
            <div>
              <div className="mb-4 rounded-lg border border-slate-500/30 bg-slate-700/30 px-4 py-3">
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-1 text-xs font-semibold text-slate-300">
                  Main image is not shown here. Only sub images are managed in this popup.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {safeExtras.map((image, index) => (
                  <SubImageBox
                    key={`sub-${index}`}
                    label={`Sub ${index + 1}`}
                    image={image}
                    file={extraFiles[index]}
                    markedRemove={Boolean(image?.id && removeIds[image.id])}
                    disabled={saving}
                    onPick={(file) => handleExtraPick(file, index)}
                    onToggleRemove={() => toggleRemove(image)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 bg-[#1c3048] px-5 py-4">
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-500 px-5 py-2 text-sm font-bold text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-black text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Saving..." : "Save Images"}
          </button>
        </div>
      </div>
    </div>
  );
}
