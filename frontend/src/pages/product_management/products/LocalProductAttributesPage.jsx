import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import localProductsApi from "../../../config/sub_api/product_management_api/local_products_api";
import ProductPageLayout from "./components/ProductPageLayout";
import ProductAttributesPanel from "./ProductAttributesPanel";

export default function LocalProductAttributesPage() {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    localProductsApi
      .getProductById(productId)
      .then((res) => setProduct(res?.data?.data || res?.data || res))
      .catch(() => setProduct(null));
  }, [productId]);

  return (
    <ProductPageLayout productId={productId} active="attributes" product={product}>
      <ProductAttributesPanel productId={productId} />
    </ProductPageLayout>
  );
}
