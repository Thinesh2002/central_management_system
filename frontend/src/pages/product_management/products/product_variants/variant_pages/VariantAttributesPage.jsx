import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { normalizeList } from "../../utils/productSku";
import { getRecordId } from "../utils/variantPageHelpers";
import ProductAttributesPanel from "../../ProductAttributesPanel";
import VariantPageLayout from "./VariantPageLayout";

function unwrapOne(response) {
  const data = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(data)) return data[0] || null;
  return data || null;
}

export default function VariantAttributesPage() {
  const { productId, variantId } = useParams();
  const [product, setProduct] = useState(null);
  const [variant, setVariant] = useState(null);

  useEffect(() => {
    localProductsApi
      .getProductById(productId)
      .then((res) => setProduct(unwrapOne(res)))
      .catch(() => setProduct(null));

    localProductsApi
      .getVariants({ product_id: productId })
      .then((res) => {
        const variants = normalizeList(res);
        setVariant(
          variants.find((item) => String(getRecordId(item)) === String(variantId)) || null
        );
      })
      .catch(() => setVariant(null));
  }, [productId, variantId]);

  return (
    <VariantPageLayout
      productId={productId}
      variantId={variantId}
      active="attributes"
      product={product}
      variant={variant}
    >
      <ProductAttributesPanel productId={productId} variantId={variantId} />
    </VariantPageLayout>
  );
}
