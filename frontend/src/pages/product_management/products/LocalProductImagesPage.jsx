import { useEffect, useMemo, useRef, useState } from "react";
import {
  ImagePlus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import api from "../../../config/api";
import ProductPageLayout from "./components/ProductPageLayout";
import { getErrorMessage, normalizeList } from "./utils/productSku";

const MAX_EXTRA_IMAGES = 8;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_IMAGE_BASE_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    api.defaults?.baseURL ||
    window.location.origin
).replace(/\/$/, "");

const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "");

function buildImageUrl(value) {
  if (!value) return "";

  const url = String(value).trim();
  if (!url) return "";

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:") ||
    url.startsWith("blob:")
  ) {
    return url;
  }

  if (url.startsWith("//")) return `https:${url}`;
  if (url.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${url}`;
  if (url.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${url}`;
  if (url.startsWith("/")) return `${BACKEND_BASE_URL}${url}`;

  return `${BACKEND_BASE_URL}/${url.replace(/^\/+/, "")}`;
}

function getImageUrl(image) {
  if (!image) return "";

  if (typeof image === "string") return buildImageUrl(image);

  return buildImageUrl(
    image.preview ||
      image.image_url ||
      image.imageUrl ||
      image.image_path ||
      image.imagePath ||
      image.file_url ||
      image.fileUrl ||
      image.file_path ||
      image.filePath ||
      image.url ||
      image.path ||
      image.src
  );
}

function normalizeProduct(response) {
  const parsed = response?.data ?? response;
  return parsed?.data || parsed?.product || parsed?.result || parsed || null;
}

function getProductVariants(product = {}) {
  const sources = [
    product.variants,
    product.variant,
    product.variations,
    product.product_variants,
    product.productVariants,
    product.skus,
    product.sku_list,
    product.skuList,
    product.children,
    product.items,
  ];

  for (const source of sources) {
    if (Array.isArray(source) && source.length) {
      return source.filter((item) => item && typeof item === "object");
    }

    if (typeof source === "string") {
      try {
        const parsed = JSON.parse(source);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // ignore invalid json
      }
    }
  }

  return [];
}

function getVariantId(variant = {}) {
  return (
    variant.id ||
    variant.variant_id ||
    variant.product_variant_id ||
    variant.sku_id ||
    variant.child_id ||
    ""
  );
}

function getVariantName(variant = {}) {
  return (
    variant.variant_name ||
    variant.name ||
    variant.title ||
    variant.colour_name ||
    variant.color_name ||
    variant.colour ||
    variant.color ||
    variant.size ||
    variant.option_name ||
    "Child SKU"
  );
}

function getVariantSku(variant = {}) {
  return (
    variant.sku ||
    variant.seller_sku ||
    variant.variant_sku ||
    variant.local_sku ||
    variant.child_sku ||
    "-"
  );
}

function imageBelongsToParent(image = {}) {
  const variantId = image.variant_id || image.product_variant_id || image.sku_id;
  return !variantId || Number(variantId) === 0;
}

function imageBelongsToVariant(image = {}, variantId) {
  const imageVariantId =
    image.variant_id || image.product_variant_id || image.sku_id || "";

  return String(imageVariantId) === String(variantId);
}

function sortImages(images = []) {
  return [...images].sort((a, b) => {
    const sortA = Number(a.sort_order ?? a.position ?? a.display_order ?? 0);
    const sortB = Number(b.sort_order ?? b.position ?? b.display_order ?? 0);

    if (sortA !== sortB) return sortA - sortB;

    return Number(a.id || 0) - Number(b.id || 0);
  });
}

function splitImages(images = []) {
  const sorted = sortImages(images);

  const main =
    sorted.find((item) => {
      const type = String(item.image_type || item.type || "").toLowerCase();

      return (
        Number(item.is_main || item.is_primary || item.is_featured || 0) === 1 ||
        type === "main" ||
        type === "primary"
      );
    }) ||
    sorted[0] ||
    null;

  const mainId = main?.id ? String(main.id) : "";

  const extras = sorted.filter((item) => {
    if (!main) return true;
    if (item.id && mainId && String(item.id) === mainId) return false;

    const type = String(item.image_type || item.type || "").toLowerCase();
    if (type === "main" || type === "primary") return false;

    return true;
  });

  return {
    main,
    extras: Array.from(
      { length: MAX_EXTRA_IMAGES },
      (_, index) => extras[index] || null
    ),
    count: sorted.length,
  };
}

async function validateImage(file) {
  if (!file) throw new Error("Please select an image.");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Only JPG, JPEG, PNG, GIF and WEBP images are allowed.");
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);

      const pixels = image.width * image.height;

      if (pixels > 10000000) {
        reject(
          new Error(
            `Image is above 10MP. Current: ${image.width} x ${image.height}`
          )
        );
        return;
      }

      resolve({
        width: image.width,
        height: image.height,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to read selected image."));
    };

    image.src = url;
  });
}

function SmallImageBox({ image, label, onPick, onRemove, disabled = false }) {
  const inputRef = useRef(null);
  const preview = getImageUrl(image);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden border border-slate-700 bg-[#0a101d] transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
        title={label}
      >
        {preview ? (
          <img
            src={preview}
            alt={label}
            className="h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.src =
                "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
            }}
          />
        ) : (
          <ImagePlus size={18} className="text-slate-500" />
        )}
      </button>

      <div className="min-w-[70px]">
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="block cursor-pointer text-left text-xs font-bold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {preview ? "Edit" : "Add"}
        </button>

        {preview ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onRemove}
            className="mt-1 block cursor-pointer text-left text-xs font-bold text-slate-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remove
          </button>
        ) : null}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onPick(file);
        }}
      />
    </div>
  );
}

function ExtraImagesCell({
  images,
  uploading,
  onUploadExtra,
  onRemoveExtra,
}) {
  const shown = images.filter(Boolean);
  const firstEmptyIndex = images.findIndex((item) => !item);
  const nextIndex = firstEmptyIndex >= 0 ? firstEmptyIndex : MAX_EXTRA_IMAGES - 1;

  return (
    <div className="min-w-[220px]">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {shown.slice(0, 5).map((image, index) => (
            <button
              key={image?.id || index}
              type="button"
              disabled={uploading}
              onClick={() => onUploadExtra(null, index, true)}
              className="h-10 w-10 overflow-hidden border border-slate-700 bg-[#0a101d]"
              title={`Sub image ${index + 1}`}
            >
              <img
                src={getImageUrl(image)}
                alt={`Sub ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}

          {!shown.length ? (
            <div className="flex h-10 w-10 items-center justify-center border border-slate-700 bg-[#0a101d] text-slate-600">
              <ImagePlus size={15} />
            </div>
          ) : null}
        </div>

        <div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => onUploadExtra(null, nextIndex, true)}
            className="block cursor-pointer text-xs font-bold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            +{Math.max(shown.length - 1, 0)} images
          </button>

          <button
            type="button"
            disabled={uploading}
            onClick={() => onUploadExtra(null, nextIndex, true)}
            className="mt-1 block cursor-pointer text-xs font-bold text-slate-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function ExtraImagesPopup({
  title,
  images,
  uploading,
  onClose,
  onUploadExtra,
  onRemoveExtra,
}) {
  const inputRefs = useRef([]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="text-xs font-semibold text-slate-500">Sub images</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer border border-slate-700 px-3 py-1.5 text-sm font-bold text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4 lg:grid-cols-8">
          {images.map((image, index) => {
            const preview = getImageUrl(image);

            return (
              <div key={`popup-extra-${index}`} className="border border-slate-800 bg-[#07101f] p-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => inputRefs.current[index]?.click()}
                  className="flex aspect-square w-full cursor-pointer items-center justify-center overflow-hidden border border-slate-700 bg-[#0a101d] hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {preview ? (
                    <img
                      src={preview}
                      alt={`Sub ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-500">
                      <ImagePlus className="mx-auto mb-1" size={18} />
                      <p className="text-[11px] font-bold">Sub {index + 1}</p>
                    </div>
                  )}
                </button>

                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => inputRefs.current[index]?.click()}
                    className="flex-1 cursor-pointer border border-slate-700 py-1 text-xs font-bold text-slate-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {preview ? "Edit" : "Add"}
                  </button>

                  {preview ? (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => onRemoveExtra(image, index)}
                      className="cursor-pointer border border-slate-700 px-2 py-1 text-xs font-bold text-slate-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                    </button>
                  ) : null}
                </div>

                <input
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0] || null;
                    event.target.value = "";
                    onUploadExtra(file, index);
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LocalProductImagesPage() {
  const { productId } = useParams();

  const [loading, setLoading] = useState(false);
  const [uploadingKey, setUploadingKey] = useState("");
  const [product, setProduct] = useState(null);
  const [allImages, setAllImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [extraPopup, setExtraPopup] = useState(null);

  const parentImages = useMemo(() => {
    return allImages.filter(
      (item) =>
        String(item.product_id) === String(productId) && imageBelongsToParent(item)
    );
  }, [allImages, productId]);

  const parentImageSet = useMemo(() => splitImages(parentImages), [parentImages]);

  const productTitle = product?.title || product?.name || "Product";
  const productSku = product?.sku || product?.product_sku || "-";

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, imageRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getImages().catch(() => ({ data: [] })),
      ]);

      const productData = normalizeProduct(productRes);

      const productImages = normalizeList(imageRes).filter(
        (item) => String(item.product_id) === String(productId)
      );

      let productVariants = getProductVariants(productData);

      if (
        !productVariants.length &&
        typeof localProductsApi.getProductVariants === "function"
      ) {
        try {
          const variantRes = await localProductsApi.getProductVariants(productId);
          productVariants = normalizeList(variantRes);
        } catch {
          productVariants = [];
        }
      }

      if (!productVariants.length && typeof localProductsApi.getVariants === "function") {
        try {
          const variantRes = await localProductsApi.getVariants({ product_id: productId });
          productVariants = normalizeList(variantRes).filter(
            (item) => String(item.product_id) === String(productId)
          );
        } catch {
          productVariants = [];
        }
      }

      setProduct(productData);
      setAllImages(productImages);
      setVariants(productVariants);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load product images."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [productId]);

  async function uploadFile({
    file,
    isMain,
    sortOrder,
    existingImage = null,
    variantId = "",
  }) {
    try {
      if (!file) return;

      const uploadKey = `${variantId || "parent"}-${isMain ? "main" : sortOrder}`;
      setUploadingKey(uploadKey);

      await validateImage(file);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("product_id", productId);
      formData.append("is_main", isMain ? "1" : "0");
      formData.append("sort_order", String(sortOrder));
      formData.append("image_type", isMain ? "main" : "sub");
      formData.append("created_by", "1");
      formData.append("updated_by", "1");

      if (variantId) {
        formData.append("variant_id", String(variantId));
        formData.append("product_variant_id", String(variantId));
      }

      if (existingImage?.id) {
        await localProductsApi.updateImage(existingImage.id, formData);
      } else {
        await localProductsApi.uploadImage(formData);
      }

      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, error.message || "Unable to upload image."));
    } finally {
      setUploadingKey("");
    }
  }

  async function removeImage(image) {
    if (!image?.id) return;

    if (!window.confirm("Remove this image?")) return;

    try {
      setUploadingKey(`delete-${image.id}`);
      await localProductsApi.deleteImage(image.id);
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to remove image."));
    } finally {
      setUploadingKey("");
    }
  }

  function getVariantImageSet(variant) {
    const variantId = getVariantId(variant);

    const variantImages = allImages.filter(
      (image) =>
        String(image.product_id) === String(productId) &&
        imageBelongsToVariant(image, variantId)
    );

    return splitImages(variantImages);
  }

  function openExtraPopup({ title, images, variantId }) {
    setExtraPopup({
      title,
      images,
      variantId,
    });
  }

  return (
    <ProductPageLayout productId={productId} active="images" product={product}>
      <div className="border border-slate-800 bg-[#0b1220] text-slate-100">
        <div className="flex flex-col gap-3 border-b border-slate-800 bg-[#07101f] px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-white">{productTitle}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">SKU: {productSku}</p>
          </div>

          {uploadingKey ? (
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-300">
              <RefreshCw size={14} className="animate-spin" />
              Uploading...
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-slate-500">
            <RefreshCw size={24} className="animate-spin text-slate-300" />
            <span className="text-sm font-semibold">Loading product images...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1180px] w-full text-sm">
              <thead className="border-b border-slate-800 bg-[#0a101d] text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-[60px] px-3 py-3">Edit</th>
                  <th className="w-[170px] px-3 py-3">Type</th>
                  <th className="w-[220px] px-3 py-3">SKU</th>
                  <th className="w-[260px] px-3 py-3">Name</th>
                  <th className="w-[180px] px-3 py-3">Main Image</th>
                  <th className="w-[260px] px-3 py-3">Sub Images</th>
                  <th className="w-[120px] px-3 py-3">Count</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-900/40">
                  <td className="px-3 py-3 text-slate-500">—</td>
                  <td className="px-3 py-3">
                    <span className="border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">
                      Parent
                    </span>
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-100">{productSku}</td>
                  <td className="px-3 py-3">
                    <p className="max-w-[250px] truncate font-semibold text-slate-300">
                      {productTitle}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <SmallImageBox
                      label="Parent Main"
                      image={parentImageSet.main}
                      disabled={Boolean(uploadingKey)}
                      onPick={(file) =>
                        uploadFile({
                          file,
                          isMain: true,
                          sortOrder: 0,
                          existingImage: parentImageSet.main,
                          variantId: "",
                        })
                      }
                      onRemove={() => removeImage(parentImageSet.main)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <ExtraImagesCell
                      images={parentImageSet.extras}
                      uploading={Boolean(uploadingKey)}
                      onUploadExtra={(_, index) =>
                        openExtraPopup({
                          title: "Parent Product",
                          images: parentImageSet.extras,
                          variantId: "",
                        })
                      }
                      onRemoveExtra={(image) => removeImage(image)}
                    />
                  </td>
                  <td className="px-3 py-3 font-bold text-slate-300">
                    {parentImageSet.count} images
                  </td>
                </tr>

                {variants.length ? (
                  variants.map((variant, index) => {
                    const variantId = getVariantId(variant);
                    const imageSet = getVariantImageSet(variant);
                    const rowKey = variantId || `variant-${index}`;

                    return (
                      <tr key={rowKey} className="hover:bg-slate-900/40">
                        <td className="px-3 py-3 text-slate-500">—</td>
                        <td className="px-3 py-3">
                          <span className="border border-slate-700 bg-slate-800/60 px-2 py-1 text-xs font-bold text-slate-300">
                            Child
                          </span>
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-100">
                          {getVariantSku(variant)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="max-w-[250px] truncate font-semibold text-slate-300">
                            {getVariantName(variant)}
                          </p>
                        </td>
                        <td className="px-3 py-3">
                          <SmallImageBox
                            label={`${getVariantSku(variant)} Main`}
                            image={imageSet.main}
                            disabled={Boolean(uploadingKey)}
                            onPick={(file) =>
                              uploadFile({
                                file,
                                isMain: true,
                                sortOrder: 0,
                                existingImage: imageSet.main,
                                variantId,
                              })
                            }
                            onRemove={() => removeImage(imageSet.main)}
                          />
                        </td>
                        <td className="px-3 py-3">
                          <ExtraImagesCell
                            images={imageSet.extras}
                            uploading={Boolean(uploadingKey)}
                            onUploadExtra={(_, extraIndex) =>
                              openExtraPopup({
                                title: getVariantSku(variant),
                                images: imageSet.extras,
                                variantId,
                              })
                            }
                            onRemoveExtra={(image) => removeImage(image)}
                          />
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-300">
                          {imageSet.count} images
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="px-3 py-8 text-center text-slate-500">
                      No child SKU found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {extraPopup ? (
        <ExtraImagesPopup
          title={extraPopup.title}
          images={extraPopup.images}
          uploading={Boolean(uploadingKey)}
          onClose={() => setExtraPopup(null)}
          onUploadExtra={(file, index) =>
            uploadFile({
              file,
              isMain: false,
              sortOrder: index + 1,
              existingImage: extraPopup.images[index],
              variantId: extraPopup.variantId,
            })
          }
          onRemoveExtra={(image) => removeImage(image)}
        />
      ) : null}
    </ProductPageLayout>
  );
}
