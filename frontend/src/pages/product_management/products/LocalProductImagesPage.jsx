import { useEffect, useMemo, useState } from "react";
import {
  ImagePlus,
  RefreshCw,
  X,
} from "lucide-react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../config/auth";
import Loader from "../../../components/common/Loader";
import ProductPageLayout from "./components/ProductPageLayout";
import { getErrorMessage, normalizeList } from "./utils/productSku";
import ImageUploadBox from "../../../components/common/image_picker/ImageUploadBox";
import ImagePickerModal from "../../../components/common/image_picker/ImagePickerModal";


function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

const MAX_EXTRA_IMAGES = 8;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
];

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL 
).replace(/\/$/, "");

const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api$/, "");

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

function SmallImageBox({
  image,
  label,
  onPick,
  onSelectExisting,
  onRemove,
  disabled = false,
}) {
  const preview = getImageUrl(image);

  return (
    <div className="w-32" title={label}>
      <ImageUploadBox
        preview={preview}
        placeholderSize={22}
        disabled={disabled}
        onUploadFile={onPick}
        onSelectExisting={onSelectExisting}
        onRemove={onRemove}
        boxClassName="aspect-square w-32"
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
        <div className="flex -space-x-2.5">
          {shown.slice(0, 5).map((image, index) => (
            <button
              key={image?.id || index}
              type="button"
              disabled={uploading}
              onClick={() => onUploadExtra(null, index, true)}
              className="aspect-square h-14 w-14 overflow-hidden border border-slate-700 bg-[#0a101d]"
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
            <div className="flex aspect-square h-14 w-14 items-center justify-center border border-slate-700 bg-[#0a101d] text-slate-600">
              <ImagePlus size={19} />
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
  onSelectExtra,
  onRemoveExtra,
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl border border-slate-700 bg-[#0b1220] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 bg-linear-to-r from-purple-950 via-[#1a1033] to-purple-950 px-4 py-3">
          <div>
            <p className="text-sm font-black text-white">{title}</p>
            <p className="text-xs font-semibold text-purple-200/80">Sub images</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => {
            const preview = getImageUrl(image);

            return (
              <div key={`popup-extra-${index}`} className="border border-slate-800 bg-[#07101f] p-2">
                <p className="mb-1.5 text-center text-[10px] font-bold text-slate-500">
                  Sub {index + 1}
                </p>

                <ImageUploadBox
                  preview={preview}
                  placeholderSize={24}
                  disabled={uploading}
                  onUploadFile={(file) => onUploadExtra(file, index)}
                  onSelectExisting={() => onSelectExtra(index)}
                  onRemove={() => onRemoveExtra(image, index)}
                  boxClassName="aspect-square w-full"
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
  const [picker, setPicker] = useState(null);

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
      formData.append("created_by", String(getCurrentUserId()));
      formData.append("updated_by", String(getCurrentUserId()));

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
      await localProductsApi.deleteImage(image.id, { force: true });
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to remove image."));
    } finally {
      setUploadingKey("");
    }
  }

  function openPicker(context) {
    setPicker(context);
  }

  async function handlePickerSelect(libraryImage) {
    const context = picker;
    setPicker(null);
    if (!context) return;

    const { isMain, sortOrder, existingImage = null, variantId = "" } = context;
    const uploadKey = `${variantId || "parent"}-${isMain ? "main" : sortOrder}`;
    setUploadingKey(uploadKey);

    try {
      const payload = {
        product_id: productId,
        is_main: isMain ? 1 : 0,
        sort_order: sortOrder,
        image_type: isMain ? "main" : "sub",
        image_path: libraryImage.image_path,
        image_url: libraryImage.image_url || libraryImage.image_path,
        file_name: libraryImage.file_name,
        file_type: libraryImage.file_type,
        created_by: getCurrentUserId(),
        updated_by: getCurrentUserId(),
      };

      if (variantId) {
        payload.variant_id = variantId;
        payload.product_variant_id = variantId;
      }

      if (existingImage?.id) {
        await localProductsApi.reassignImage(existingImage.id, payload);
      } else {
        await localProductsApi.attachExistingImage(payload);
      }

      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to attach selected image."));
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
          <Loader label="Loading product images..." minHeight="320px" />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[1240px] w-full text-sm">
              <thead className="border-b border-slate-800 bg-[#0a101d] text-left text-xs font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="w-[60px] px-3 py-3">Edit</th>
                  <th className="w-[170px] px-3 py-3">Type</th>
                  <th className="w-[220px] px-3 py-3">SKU</th>
                  <th className="w-[260px] px-3 py-3">Name</th>
                  <th className="w-[220px] px-3 py-3">Main Image</th>
                  <th className="w-[280px] px-3 py-3">Sub Images</th>
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
                      onSelectExisting={() =>
                        openPicker({
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
                            onSelectExisting={() =>
                              openPicker({
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
          onSelectExtra={(index) =>
            openPicker({
              isMain: false,
              sortOrder: index + 1,
              existingImage: extraPopup.images[index],
              variantId: extraPopup.variantId,
            })
          }
          onRemoveExtra={(image) => removeImage(image)}
        />
      ) : null}

      <ImagePickerModal
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        onSelect={handlePickerSelect}
      />
    </ProductPageLayout>
  );
}
