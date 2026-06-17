import { Route } from "react-router-dom";
import Layout from "../../pages/compnents/Layout";
import ProtectedRoute from "../../config/ProtectedRoute";

// Product Pages
import ProductList from "../../pages/product/View_All_Product/index";
import ProductDetailView from "../../pages/product/product_detail_view";
import VariationDetailView from "../../pages/product/varations_detailView/index";
import ViewProductVariations from "../../pages/product/ViewProductVariations";
import AddProduct from "../../pages/product/AddProducr";
import AddVariation from "../../pages/product/Add_variation/index";
import EditProduct from "../../pages/product/edit_product";
import EditVariation from "../../pages/product/edit_product";
import SKUMappingView from "../../pages/product/sku_mapping/view_sku_mapping";
import DarazSalesTrent from "../../pages/product/daraz/trend_analysis";
import WooProductsPage from "../../pages/woo_ceommerce/woo_product";
import WooDetailProductsPage from "../../pages/woo_ceommerce/woo_product_detail_page";
import CreateWooproduct from "../../pages/woo_ceommerce/woo_product/create_woo_product";
import EditWooproduct from "../../pages/woo_ceommerce/woo_product/woo_edit_page/index";
import TransfertoDaraz from "../../pages/woo_ceommerce/woo_product/WooTransferToDarazPreviewPage/WooTransferPreviewPage";
import DarazToDaraz from "../../pages/product/daraz/daraz_to_daraz_transfer/DarazToDarazTransferPreviewPage";

const Product_Route = (
  <>
    {/* Product List */}
    <Route
      path="/products"
      element={
        <ProtectedRoute>
          <Layout>
            <ProductList />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Add Product */}
    <Route
      path="/products/add"
      element={
        <ProtectedRoute>
          <Layout>
            <AddProduct />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* View Parent Product (shows product + all variations) */}
    <Route
      path="/products/view/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <ProductDetailView />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* View Single Variation Detail */}
    <Route
      path="/variations/view/:sku"
      element={
        <ProtectedRoute>
          <Layout>
            <VariationDetailView />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* View All Variations for a Product (table view) */}
    <Route
      path="/products/:parentSku/variations"
      element={
        <ProtectedRoute>
          <Layout>
            <ViewProductVariations />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Edit Product */}
    <Route
      path="/products/edit/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <EditProduct />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Add Variation to Product */}
    <Route
      path="/products/add-variation/:parentSku"
      element={
        <ProtectedRoute>
          <Layout>
            <AddVariation />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Edit Variation */}
    <Route
      path="/products/edit-variation/:sku"
      element={
        <ProtectedRoute>
          <Layout>
            <EditVariation />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* SKU Mapping */}
    <Route
      path="/sku-mapping"
      element={
        <ProtectedRoute>
          <Layout>
            <SKUMappingView />
          </Layout>
        </ProtectedRoute>
      }
    />

    {/* Trend Analysis */}
    <Route
      path="/trend-analysis"
      element={
        <ProtectedRoute>
          <Layout>
            <DarazSalesTrent />
          </Layout>
        </ProtectedRoute>
      }
    />


        <Route
      path="/woo-products"
      element={
        <ProtectedRoute>
          <Layout>
            <WooProductsPage />
          </Layout>
        </ProtectedRoute>
      }
    />

            <Route
      path="/woo-products/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <WooDetailProductsPage />
          </Layout>
        </ProtectedRoute>
      }
    />

            <Route
      path="/woo-products/create"
      element={
        <ProtectedRoute>
          <Layout>
            <CreateWooproduct/>
          </Layout>
        </ProtectedRoute>
      }
    />

                <Route
      path="/woo-edit-product/:id"
      element={
        <ProtectedRoute>
          <Layout>
            <EditWooproduct/>
          </Layout>
        </ProtectedRoute>
      }
    />

            <Route
      path="/woo-transfer-preview"
      element={
        <ProtectedRoute>
          <Layout>
            <TransfertoDaraz />
          </Layout>
        </ProtectedRoute>
      }
    />

                <Route
      path="/daraz/daraz-to-daraz/preview"
      element={
        <ProtectedRoute>
          <Layout>
            <DarazToDaraz />
          </Layout>
        </ProtectedRoute>
      }
    />


  </>
);

export default Product_Route;