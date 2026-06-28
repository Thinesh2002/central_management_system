require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");

const pool = require("./config/db");
const accessModel = require("./models/accessModel");

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const accessRoutes = require("./routes/accessRoutes");
const logRoutes = require("./routes/logRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const productModelRoutes = require("./routes/product_management/product_model/product_model_routes");
const productColourRoutes = require("./routes/product_management/product_colour/product_colour_routes");
const localProductManagementRoutes = require("./routes/product_management/product/product_management_routes");
const productVariantRoutes = require("./routes/product_management/product/product_variants_routes");
const productCategoryRoutes = require("./routes/product_management/category/category_route");
const productSubCategoryRoutes = require("./routes/product_management/category/sub_category_route");
const productAttributeRoutes = require("./routes/product_management/attribute/attribute_route");
const productAttributeValueRoutes = require("./routes/product_management/attribute/attributeValue_route");
const productRoutes = require("./routes/product_management/product/products_routes");
const productPriceRoutes = require("./routes/product_management/product/product_prices_routes");
const productAttributeValueProductRoutes = require("./routes/product_management/product/product_attribute_values_routes");
const productLogRoutes = require("./routes/product_management/product/product_logs_routes");
const productImageLogRoutes = require("./routes/product_management/product/product_image_logs_routes");

const marketplaceRoutes = require("./routes/marketplace/marketplace_routes");
const darazProductSyncRoutes = require("./routes/daraz/product_management/daraz_product_sync_route");
const wooRoutes = require("./routes/woo/woo_route");
const darazFinanceRoutes = require("./routes/daraz/daraz_finance/daraz_finance_route");
const darazOrderRoutes = require("./routes/daraz/order_management/daraz_order_routes");
const manualOrderRoutes = require("./routes/order_management/order_routes");
const inventoryRoutes = require("./routes/inventory/inventory_routes");
const financeRoutes = require("./routes/finance/finance_routes");
const wooOrderRoutes = require("./routes/woo/woo_orders_routes");
const darazOrderStatusRoutes = require("./routes/daraz/order_management/daraz_order_status_routes");
const marketplaceSkuMappingRoutes = require("./routes/marketplace/sku_mapping_routes");
const productInventoryRoutes = require("./routes/product_management/product/product_inventory_routes");
const productImageRoutes = require("./routes/product_management/product/product_images_routes");
const erpRoutes = require("./routes/erp/erp_routes");


const { notFound, errorHandler } = require("./middleware/errorHandler");

const {
  startMarketplaceTokenCheckerJob,
} = require("./services/marketplace/token_checker_job");

const {
  startDarazProductSyncJob,
} = require("./jobs/daraz/product_management/daraz_product_sync_job");

const {
  startDarazOrderSyncJob,
} = require("./jobs/daraz/daraz_orders/daraz_order_sync_job");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.set("trust proxy", 1);

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://system.teckvora.com",
  "https://www.system.teckvora.com",
];

const allowedOrigins = Array.from(
  new Set([
    ...defaultAllowedOrigins,
    ...String(process.env.CORS_ORIGIN || "")
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  ])
);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many login requests from this device. Please try again after 15 minutes.",
  },
});

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      success: true,
      message: "API and database are running.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Database connection failed.",
      error: error.message,
    });
  }
});

app.use("/api/auth/login", loginLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Product API compatibility mounts.
// Old frontend pages use /api/product/*, while newer pages use /api/product-management/*.
// Keep both path styles working so local product pages do not fail with 404.
app.use("/api/product/categories", productCategoryRoutes);
app.use("/api/product/category", productCategoryRoutes);
app.use("/api/product/sub-categories", productSubCategoryRoutes);
app.use("/api/product/sub_categories", productSubCategoryRoutes);
app.use("/api/product/attributes", productAttributeRoutes);
app.use("/api/product/attribute-values", productAttributeValueRoutes);
app.use("/api/product/products", productRoutes);
app.use("/api/product/product-prices", productPriceRoutes);
app.use("/api/product/product-attribute-values", productAttributeValueProductRoutes);
app.use("/api/product/product-logs", productLogRoutes);
app.use("/api/product/product-image-logs", productImageLogRoutes);

app.use("/api/product-management/categories", productCategoryRoutes);
app.use("/api/product-management/sub-categories", productSubCategoryRoutes);
app.use("/api/product-management/attributes", productAttributeRoutes);
app.use("/api/product-management/attribute-values", productAttributeValueRoutes);

app.use("/api/product-management/models", productModelRoutes);
app.use("/api/product-management/colours", productColourRoutes);
app.use("/api/product-management", localProductManagementRoutes);
app.use("/api/product/product-variants", productVariantRoutes);
app.use("/api/product/categories", productCategoryRoutes);
app.use("/api/product/sub-categories", productSubCategoryRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/daraz-products", darazProductSyncRoutes);
app.use("/api/marketplace/woo", wooRoutes);
app.use("/api/marketplace/daraz/finance", darazFinanceRoutes);
app.use("/api/daraz/orders", darazOrderRoutes);
app.use("/api/orders", manualOrderRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/woo", wooOrderRoutes);
app.use("/api/daraz/order-status", darazOrderStatusRoutes);
app.use("/api/marketplace/sku-mappings", marketplaceSkuMappingRoutes);

// Backward-compatible direct product API mounts used by current frontend files.
app.use("/api/product/product-inventory", productInventoryRoutes);
app.use("/api/product/product-images", productImageRoutes);
app.use("/api/erp", erpRoutes);


app.use(notFound);
app.use(errorHandler);

function startJob(name, starter) {
  try {
    if (typeof starter !== "function") return;
    starter();
  } catch (error) {
    console.error(`[${name}_ERROR]:`, error.message);
  }
}

async function syncPermissions() {
  try {
    if (typeof accessModel.ensureAllUserPermissions === "function") {
      await accessModel.ensureAllUserPermissions();
    }
  } catch (error) {
    // Keep terminal clean. Permission sync errors are handled from access pages/logs.
  }
}

async function startServer() {
  await pool.query("SELECT 1");
  console.log("Database connected successfully.");

  await syncPermissions();

  app.listen(PORT, () => {
    if (String(process.env.ENABLE_JOBS || "").toLowerCase() === "true") {
      startJob("MARKETPLACE_TOKEN_JOB", startMarketplaceTokenCheckerJob);
      startJob("DARAZ_PRODUCT_SYNC_JOB", startDarazProductSyncJob);
      startJob("DARAZ_ORDER_SYNC_JOB", startDarazOrderSyncJob);
      console.log("Background jobs enabled.");
    }
  });
}

startServer().catch((error) => {
  console.error("[SERVER_START_ERROR]:", error.message);
  process.exit(1);
});