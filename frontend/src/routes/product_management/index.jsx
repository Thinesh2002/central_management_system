import React from "react";
import { Navigate, Route } from "react-router-dom";

import Layout from "../../components/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

import CategoryPage from "../../pages/product_management/category/index";
import CategoryCreatePage from "../../pages/product_management/category/create_category_page/index";
import CategoryViewPage from "../../pages/product_management/category/View_category/index";
import CategoryEditPage from "../../pages/product_management/category/edit_category_page/index";
import ColourPage from "../../pages/product_management/colour/index";
import SkuMappingPage from "../../pages/product_management/sku_mapping/index";

import LocalProductViewPage from "../../pages/product_management/products/product_detail_page/index";


import LocalProductsDashboard from "../../pages/product_management/products/product_dashboard/index";
import ImagesDashboardPage from "../../pages/product_management/images_dashboard/index";
import LocalProductAddPage from "../../pages/product_management/products/add_product/index";
import LocalProductBasicPage from "../../pages/product_management/products/LocalProductBasicPage";
import LocalProductPriceInventoryPage from "../../pages/product_management/products/LocalProductInventoryPage";
import LocalProductAttributesPage from "../../pages/product_management/products/LocalProductAttributesPage";
import LocalProductVariantsPage from "../../pages/product_management/products/product_variants/index";
import LocalProductImagesPage from "../../pages/product_management/products/LocalProductImagesPage";
import VariantBasicPage from "../../pages/product_management/products/product_variants/variant_pages/VariantBasicPage";
import VariantPriceInventoryPage from "../../pages/product_management/products/product_variants/variant_pages/VariantPriceInventoryPage";
import VariantImagesPage from "../../pages/product_management/products/product_variants/variant_pages/VariantImagesPage";
import VariantAttributesPage from "../../pages/product_management/products/product_variants/variant_pages/VariantAttributesPage";
import VariantViewPage from "../../pages/product_management/products/product_variants/variant_pages/VariantViewPage";

function ProtectedProductPage({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  );
}

export default function ProductManagementRoutes() {
  return (
    <>
      <Route
        path="/product/categories"
        element={
          <ProtectedProductPage>
            <CategoryPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/categories/create"
        element={
          <ProtectedProductPage>
            <CategoryCreatePage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/categories/view"
        element={
          <ProtectedProductPage>
            <CategoryPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/categories/view/:id"
        element={
          <ProtectedProductPage>
            <CategoryViewPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/categories/edit/:id"
        element={
          <ProtectedProductPage>
            <CategoryEditPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/colours"
        element={
          <ProtectedProductPage>
            <ColourPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/sku-mapping"
        element={
          <ProtectedProductPage>
            <SkuMappingPage />
          </ProtectedProductPage>
        }
      />

      <Route path="/colours" element={<Navigate to="/product/colours" replace />} />

      <Route
        path="/product/local-products"
        element={
          <ProtectedProductPage>
            <LocalProductsDashboard />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/images"
        element={
          <ProtectedProductPage>
            <ImagesDashboardPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/create"
        element={
          <ProtectedProductPage>
            <LocalProductAddPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/view"
        element={
          <ProtectedProductPage>
            <LocalProductsDashboard />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/view/:productId"
        element={
          <ProtectedProductPage>
            <LocalProductBasicPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId"
        element={
          <Navigate to="basic" replace />
        }
      />

      <Route
        path="/product/local-products/edit/:productId/basic"
        element={
          <ProtectedProductPage>
            <LocalProductBasicPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/price-inventory"
        element={
          <ProtectedProductPage>
            <LocalProductPriceInventoryPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/attributes"
        element={
          <ProtectedProductPage>
            <LocalProductAttributesPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants"
        element={
          <ProtectedProductPage>
            <LocalProductVariantsPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/images"
        element={
          <ProtectedProductPage>
            <LocalProductImagesPage />
          </ProtectedProductPage>
        }
      />

      {/* Dedicated variant pages */}
      <Route
        path="/product/local-products/edit/:productId/variants/create"
        element={
          <ProtectedProductPage>
            <VariantBasicPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/edit"
        element={<Navigate to="basic" replace />}
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/edit/basic"
        element={
          <ProtectedProductPage>
            <VariantBasicPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/edit/price-inventory"
        element={
          <ProtectedProductPage>
            <VariantPriceInventoryPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/edit/images"
        element={
          <ProtectedProductPage>
            <VariantImagesPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/edit/attributes"
        element={
          <ProtectedProductPage>
            <VariantAttributesPage />
          </ProtectedProductPage>
        }
      />

      <Route
        path="/product/local-products/edit/:productId/variants/:variantId/view"
        element={
          <ProtectedProductPage>
            <VariantViewPage />
          </ProtectedProductPage>
        }
      />

      {/* Backward-compatible local product URLs. Remove later if not needed. */}
      <Route path="/product/local-products/:productId" element={<Navigate to="basic" replace />} />
      <Route
        path="/product/local-products/:productId/basic"
        element={
          <ProtectedProductPage>
            <LocalProductBasicPage />
          </ProtectedProductPage>
        }
      />
      <Route
        path="/product/local-products/:productId/price-inventory"
        element={
          <ProtectedProductPage>
            <LocalProductPriceInventoryPage />
          </ProtectedProductPage>
        }
      />
      <Route
        path="/product/local-products/:productId/attributes"
        element={
          <ProtectedProductPage>
            <LocalProductAttributesPage />
          </ProtectedProductPage>
        }
      />
      <Route
        path="/product/local-products/:productId/variants"
        element={
          <ProtectedProductPage>
            <LocalProductVariantsPage />
          </ProtectedProductPage>
        }
      />
      <Route
        path="/product/local-products/:productId/images"
        element={
          <ProtectedProductPage>
            <LocalProductImagesPage />
          </ProtectedProductPage>
        }
      />

            <Route
        path="/product/view/:id"
        element={
          <ProtectedProductPage>
            <LocalProductViewPage  />
          </ProtectedProductPage>
        }
      />


    </>
  );
}
