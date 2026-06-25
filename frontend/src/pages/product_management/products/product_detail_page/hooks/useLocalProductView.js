import { useCallback, useEffect, useState } from "react";
import localProductsApi from "../../../../../config/sub_api/product_management_api/local_products_api";
import { getErrorMessage } from "../../utils/productSku";
import { fetchLocalProductById, unwrapApiData } from "../utils/localProductViewHelpers";

export default function useLocalProductView(productId) {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setErrorMessage("Product ID is missing.");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const response = await fetchLocalProductById(localProductsApi, productId);
      const productData = unwrapApiData(response);

      if (!productData) {
        setErrorMessage("Product not found.");
        setProduct(null);
        return;
      }

      setProduct(productData);
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Unable to load product details."));
      setProduct(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  return {
    product,
    loading,
    errorMessage,
    reload: loadProduct,
  };
}
