require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const authRoutes = require("./routes/user_route");
const productRoutes = require("./routes/product/product_route");
const categoryRoutes = require("./routes/product/category_route");
const colourRoutes = require("./routes/product/sku_route");
const inventoryRoutes = require("./routes/product/inventory_route");
const variationRoutes = require("./routes/product/variation_route");
const productImageRoutes = require("./routes/product/product_image_route");
const blogRoutes = require("./routes/Blog/blog_route");
const financeRoutes = require("./routes/Finance/finance_route");
const customerRoutes = require("./routes/Customer/customer_route");
const darazRoutes = require("./routes/daraz/daraz_route");
const darazProductRoutes = require("./routes/daraz/daraz_product_route");
const skuMappingRoutes = require("./routes/product/sku_mapping/sku_mapping_route");
const accountRoutes = require("./routes/daraz/daraz_account/daraz_account_route");
const productTrendRoutes = require("./routes/sales_trend_analysis/sales_trend_analysis_route");
const subCategoryRoutes = require("./routes/product/sub_category_route");
const wooproductRoutes = require("./routes/product/woo_commerce_route/woo_commerce_route");
const darazCategoryRoutes = require("./routes/daraz/daraz_category/daraz_category_route");
const darazOrderRoutes = require("./routes/daraz/daraz_order_route");
const darazInventoryRoutes = require("./routes/daraz/daraz_inventory_route");
const darazAdvancedRoutes = require("./routes/daraz/advanced/daraz_advanced_route");
const systemSettingsRoutes = require("./routes/system/system_settings_route");
const unifiedInventoryRoutes = require("./routes/system/unified_inventory_route");
const enterpriseCmsRoutes = require("./routes/system/enterprise_cms_route");
const darazToDarazTransferRoutes = require("./routes/daraz/transfer/daraz_to_daraz_transfer_routes");
const supplierRoutes = require("./routes/supplier/supplier_routes");

const { bootstrapProductManagementSchema } = require("./bootstrap/productManagementSchemaBootstrap");
const { ensureUnifiedInventorySchema } = require("./models/system/unified_inventory_model");
const enterpriseCmsModel = require("./models/system/enterprise_cms_model");
require("./cron/daraz_corn");

const app = express();

/* ================= MIDDLEWARE ================= */

app.use(cors());
app.use(express.json());

/* ================= API ROUTES ================= */

app.use("/api/user", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/colours", colourRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/variations", variationRoutes);
app.use("/api/product-images", productImageRoutes);
app.use("/api/blog", blogRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/daraz", darazRoutes);
app.use("/api/daraz", darazProductRoutes);
app.use("/api/daraz", darazCategoryRoutes);
app.use("/api/daraz", darazOrderRoutes);
app.use("/api/daraz", darazInventoryRoutes);
app.use("/api/daraz/advanced", darazAdvancedRoutes);
app.use("/api/sku-mapping", skuMappingRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/daraz/analytics", productTrendRoutes);
app.use("/api/sub-categories", subCategoryRoutes);
app.use("/api/woo-products", wooproductRoutes);
app.use("/api/daraz-to-daraz", darazToDarazTransferRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/system", systemSettingsRoutes);
app.use("/api/system-inventory", unifiedInventoryRoutes);
app.use("/api/enterprise", enterpriseCmsRoutes);


/* ================= STATIC FILES ================= */

app.use("/images", express.static(path.join(__dirname, "images")));

/* ================= SERVER ================= */

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await bootstrapProductManagementSchema();
    await ensureUnifiedInventorySchema();
    await enterpriseCmsModel.ensureSchema();
  } catch (error) {
    console.error("[BOOTSTRAP_WARNING]: Backend will start, but schema bootstrap failed:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`Server running → http://localhost:${PORT}`);
  });
};

startServer();