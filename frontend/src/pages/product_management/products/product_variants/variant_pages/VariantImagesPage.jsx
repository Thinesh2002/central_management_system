import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { getStoredUser } from "../../../../../config/auth";
import { useToast } from "../../../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../../../components/common/confirm_modal/ConfirmProvider";
import Loader from "../../../../../components/common/Loader";
import ImageUploadBox from "../../../../../components/common/image_picker/ImageUploadBox";
import ImagePickerModal from "../../../../../components/common/image_picker/ImagePickerModal";
import { getErrorMessage, normalizeList } from "../../utils/productSku";
import {
  getImageUrl,
  getRecordId,
  imageBelongsToVariant,
  splitImages,
  validateImage,
} from "../utils/variantPageHelpers";
import VariantPageLayout from "./VariantPageLayout";

function getCurrentUserId() {
  const user = getStoredUser?.();
  return user?.id || user?.user_id || user?.user_uid || 1;
}

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export default function VariantImagesPage() {
  const { productId, variantId } = useParams();
  const showToast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(null);
  const [images, setImages] = useState([]);
  const [picker, setPicker] = useState(null);

  const imageSet = useMemo(() => splitImages(images), [images]);

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, variantRes, imageRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({ data: [] })),
        localProductsApi.getImages().catch(() => ({ data: [] })),
      ]);

      setProduct(unwrapOne(productRes));

      const variants = normalizeList(variantRes);
      setVariant(
        variants.find((item) => String(getRecordId(item)) === String(variantId)) || null
      );

      const variantImages = normalizeList(imageRes).filter(
        (image) =>
          String(image.product_id) === String(productId) &&
          imageBelongsToVariant(image, variantId)
      );
      setImages(variantImages);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load variant images."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, variantId]);

  async function uploadFile(file, { isMain, sortOrder, existingImage }) {
    const key = isMain ? "main" : `sub-${sortOrder}`;

    try {
      setBusyKey(key);
      await validateImage(file);

      const formData = new FormData();
      formData.append("image", file);
      formData.append("product_id", productId);
      formData.append("variant_id", String(variantId));
      formData.append("product_variant_id", String(variantId));
      formData.append("is_main", isMain ? "1" : "0");
      formData.append("sort_order", String(sortOrder));
      formData.append("image_type", isMain ? "main" : "sub");
      formData.append("created_by", String(getCurrentUserId()));
      formData.append("updated_by", String(getCurrentUserId()));

      if (existingImage?.id) {
        await localProductsApi.updateImage(existingImage.id, formData);
      } else {
        await localProductsApi.uploadImage(formData);
      }

      showToast("Image uploaded successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, error.message || "Unable to upload image."));
    } finally {
      setBusyKey("");
    }
  }

  async function attachExisting(libraryImage, { isMain, sortOrder, existingImage }) {
    const key = isMain ? "main" : `sub-${sortOrder}`;

    try {
      setBusyKey(key);

      const payload = {
        product_id: productId,
        variant_id: String(variantId),
        product_variant_id: String(variantId),
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

      if (existingImage?.id) {
        await localProductsApi.reassignImage(existingImage.id, payload);
      } else {
        await localProductsApi.attachExistingImage(payload);
      }

      showToast("Image attached successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to attach selected image."));
    } finally {
      setBusyKey("");
    }
  }

  async function removeImage(image) {
    if (!image?.id) return;
    if (!(await confirm("Remove this image?"))) return;

    try {
      setBusyKey(`remove-${image.id}`);
      await localProductsApi.deleteImage(image.id, { force: true });
      showToast("Image removed.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to remove image."));
    } finally {
      setBusyKey("");
    }
  }

  function openPicker(context) {
    setPicker(context);
  }

  function handlePickerSelect(libraryImage) {
    const context = picker;
    setPicker(null);
    if (!context) return;
    attachExisting(libraryImage, context);
  }

  return (
    <VariantPageLayout
      productId={productId}
      variantId={variantId}
      active="images"
      product={product}
      variant={variant}
    >
      {loading ? (
        <Loader label="Loading variant images..." minHeight="280px" />
      ) : (
        <div className="space-y-4">
          <div className="border border-slate-800 bg-[#0b1220] p-4">
            <h2 className="mb-3 text-sm font-black text-white">Main Image</h2>

            <div className="w-40">
              <ImageUploadBox
                preview={getImageUrl(imageSet.main)}
                placeholderSize={22}
                disabled={busyKey === "main"}
                onUploadFile={(file) =>
                  uploadFile(file, { isMain: true, sortOrder: 0, existingImage: imageSet.main })
                }
                onSelectExisting={() =>
                  openPicker({ isMain: true, sortOrder: 0, existingImage: imageSet.main })
                }
                onRemove={imageSet.main ? () => removeImage(imageSet.main) : undefined}
                boxClassName="aspect-square w-full"
              />
            </div>
          </div>

          <div className="border border-slate-800 bg-[#0b1220] p-4">
            <h2 className="mb-3 text-sm font-black text-white">Sub Images</h2>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-8">
              {imageSet.extras.map((image, index) => {
                const key = `sub-${index + 1}`;

                return (
                  <div key={key}>
                    <p className="mb-1.5 text-center text-[10px] font-bold text-slate-500">
                      Sub {index + 1}
                    </p>
                    <ImageUploadBox
                      preview={getImageUrl(image)}
                      placeholderSize={18}
                      disabled={busyKey === key}
                      onUploadFile={(file) =>
                        uploadFile(file, { isMain: false, sortOrder: index + 1, existingImage: image })
                      }
                      onSelectExisting={() =>
                        openPicker({ isMain: false, sortOrder: index + 1, existingImage: image })
                      }
                      onRemove={image ? () => removeImage(image) : undefined}
                      boxClassName="aspect-square w-full"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <ImagePickerModal
        open={Boolean(picker)}
        onClose={() => setPicker(null)}
        onSelect={handlePickerSelect}
      />
    </VariantPageLayout>
  );
}
