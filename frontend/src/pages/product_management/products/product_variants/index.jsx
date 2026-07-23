import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./../components/ProductPageLayout";
import { getErrorMessage, normalizeList } from "./../utils/productSku";
import { useToast } from "../../../../components/common/toast/ToastProvider";
import { useConfirm } from "../../../../components/common/confirm_modal/ConfirmProvider";
import VariantTable from "./components/variants/VariantTable";
import {
  getRecordId,
  getVariantSku,
  rowBelongsToProduct,
  unwrapOne,
} from "./utils/variantPageHelpers";

function getVariantIdFromPrice(row) {
  return (
    row?.variant_id ??
    row?.product_variant_id ??
    row?.local_variant_id ??
    row?.variantId ??
    ""
  );
}

function getPriceSku(row) {
  return (
    row?.variant_sku ??
    row?.sku ??
    row?.product_sku ??
    row?.seller_sku ??
    row?.local_sku ??
    ""
  );
}

function getSellingPrice(row) {
  return (
    row?.local_selling_price ??
    row?.selling_price ??
    row?.sale_price ??
    row?.price ??
    0
  );
}

function findPriceForVariant(priceRows, variant) {
  const variantId = getRecordId(variant);
  const variantSku = getVariantSku(variant);

  return (
    priceRows.find(
      (price) => variantId && String(getVariantIdFromPrice(price)) === String(variantId)
    ) ||
    priceRows.find(
      (price) =>
        String(getPriceSku(price)).trim() &&
        String(getPriceSku(price)).trim().toLowerCase() === String(variantSku).trim().toLowerCase()
    ) ||
    null
  );
}

function findInventoryForVariant(inventoryRows, variant) {
  const variantSku = String(getVariantSku(variant)).trim().toLowerCase();

  return (
    inventoryRows.find(
      (row) => String(row.sku || "").trim().toLowerCase() === variantSku
    ) || null
  );
}

async function safeFetchInventoryBySku(sku) {
  if (!sku) return null;

  try {
    const response = await localProductsApi.getInventoryBySku(sku);
    return unwrapOne(response);
  } catch (error) {
    if (error?.response?.status === 404) return null;
    throw error;
  }
}

export default function LocalProductVariantsPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const showToast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function loadData() {
    setLoading(true);

    try {
      const [productRes, variantRes, priceRes] = await Promise.all([
        localProductsApi.getProductById(productId),
        localProductsApi.getVariants({ product_id: productId }).catch(() => ({ data: [] })),
        localProductsApi.getPrices({ product_id: productId }).catch(() => ({ data: [] })),
      ]);

      const productData = unwrapOne(productRes);

      const rawVariants = normalizeList(variantRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const priceRows = normalizeList(priceRes).filter((item) =>
        rowBelongsToProduct(item, productId)
      );

      const inventoryRows = (
        await Promise.all(
          rawVariants.map((variant) => safeFetchInventoryBySku(getVariantSku(variant)))
        )
      ).filter(Boolean);

      const variantRows = rawVariants.map((variant) => {
        const priceRow = findPriceForVariant(priceRows, variant);
        const inventoryRow = findInventoryForVariant(inventoryRows, variant);

        return {
          ...variant,
          selling_price: getSellingPrice(priceRow),
          stock_qty: inventoryRow?.stock_qty ?? 0,
        };
      });

      setProduct(productData);
      setVariants(variantRows);
    } catch (error) {
      alert(getErrorMessage(error, "Unable to load variants."));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(variant) {
    const variantId = getRecordId(variant);
    const confirmed = await confirm(`Delete variant ${getVariantSku(variant)}?`);

    if (!confirmed) return;

    try {
      await localProductsApi.deleteVariant(variantId);
      showToast("Variant deleted successfully.");
      await loadData();
    } catch (error) {
      alert(getErrorMessage(error, "Unable to delete variant."));
    }
  }

  function handleView(variant) {
    navigate(`/product/local-products/edit/${productId}/variants/${getRecordId(variant)}/view`);
  }

  function handleEdit(variant) {
    navigate(
      `/product/local-products/edit/${productId}/variants/${getRecordId(variant)}/edit/basic`
    );
  }

  return (
    <ProductPageLayout productId={productId} active="variants" product={product}>
      <div className="border border-slate-800 bg-[#0b1220] text-slate-100">
        <div className="flex items-center justify-end border-b border-slate-800 bg-[#07101f] px-4 py-2">
          <button
            type="button"
            onClick={() => navigate(`/product/local-products/edit/${productId}/variants/create`)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 bg-orange-500 px-3 text-xs font-black text-white shadow-sm shadow-orange-500/20 transition hover:bg-orange-400"
          >
            <Plus size={14} />
            Add Variant
          </button>
        </div>

        <VariantTable
          loading={loading}
          variants={variants}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </ProductPageLayout>
  );
}
