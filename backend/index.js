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
const skuMappingRoutes = require("./routes/product_management/sku_mapping/sku_mapping_routes");
const localProductManagementRoutes = require("./routes/product_management/product/product_management_routes");
const productVariantRoutes = require("./routes/product_management/product/product_variants_routes");
const productCategoryRoutes = require("./routes/product_management/category/category_route");
const productSubCategoryRoutes = require("./routes/product_management/category/sub_category_route");
const attributeRoutes = require("./routes/product_management/attribute/attribute_route");
const attributeValueRoutes = require("./routes/product_management/attribute/attributeValue_route");

const marketplaceRoutes = require("./routes/marketplace/marketplace_routes");
const accountController = require("./controllers/marketplace/account_controller");
const darazWebhookController = require("./controllers/daraz/order_management/daraz_webhook_controller");

const darazProductSyncRoutes = require("./routes/daraz/product_management/daraz_product_sync_route");
const darazTransferRoutes = require("./routes/daraz/product_management/daraz_transfer_route");
const darazTitleOptimizerRoutes = require("./routes/daraz/product_management/daraz_title_optimizer_route");
const darazPriceReconciliationRoutes = require("./routes/daraz/pricing/daraz_price_reconciliation_route");
const darazInventorySyncRoutes = require("./routes/daraz/inventory/daraz_inventory_sync_route");
const darazCatalogRoutes = require("./routes/marketplace/daraz_catalog_route");
const darazSellerMetricsRoutes = require("./routes/daraz/marketplace_management/daraz_seller_metrics_routes");
const wooRoutes = require("./routes/woo/woo_route");
const brighthubRoutes = require("./routes/brighthub/brighthub_route");

const skuReportRoutes = require("./routes/order_management/sku_report_routes");
const orderCustomersRoutes = require("./routes/order_management/customers_routes");
const productTrendsRoutes = require("./routes/order_management/product_trends_routes");
const ordersRoutes = require("./routes/order_management/orders_routes");
const darazOrderActionsRoutes = require("./routes/order_management/daraz_order_actions_routes");
const orderSyncSettingsRoutes = require("./routes/order_management/order_sync_settings_routes");
const messageTemplatesRoutes = require("./routes/order_management/message_templates_routes");
const darazFinanceRoutes = require("./routes/daraz/finance_management/daraz_finance_routes");
const notificationRoutes = require("./routes/notifications/notification_routes");
const supplierRoutes = require("./routes/supplier_management/supplier_routes");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const {
  startMarketplaceTokenCheckerJob,
} = require("./services/marketplace/token_checker_job");

const {
  startDarazProductSyncJob,
} = require("./jobs/daraz/product_management/daraz_product_sync_job");

const {
  startDarazInventorySyncJob,
} = require("./jobs/daraz/inventory/daraz_inventory_sync_job");

const {
  startDarazOrderSyncJob,
} = require("./jobs/daraz/order_management/daraz_order_sync_job");
const {
  startWooOrderSyncJob,
} = require("./jobs/woo/order_management/woo_order_sync_job");

const {
  startDarazFinanceSyncJob,
} = require("./jobs/daraz/finance_management/daraz_finance_sync_job");

const {
  startDarazTitleOptimizerJob,
} = require("./jobs/daraz/product_management/daraz_title_optimizer_job");

const {
  startDarazTitleFullScanJob,
} = require("./jobs/daraz/product_management/daraz_title_full_scan_job");

const {
  startDarazListingSalesReportJob,
} = require("./jobs/daraz/product_management/daraz_listing_sales_report_job");

const { startLowStockCheckJob } = require("./jobs/inventory/low_stock_check_job");

const {
  startTransExpressTrackingSyncJob,
} = require("./jobs/order_management/trans_express_tracking_sync_job");

const {
  startDarazPriceReconciliationJob,
} = require("./jobs/daraz/pricing/daraz_price_reconciliation_job");

const {
  startWooProductSyncJob,
} = require("./jobs/woo/product/woo_product_sync_job");

const {
  startBrightHubProductSyncJob,
} = require("./jobs/brighthub/product/brighthub_product_sync_job");

const app = express();
const PORT = Number(process.env.PORT || 5000);

app.set("trust proxy", 1);

const normalizeOrigin = (origin = "") =>
  String(origin).trim().replace(/\/$/, "");

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://system.teckvora.com",
  "https://www.system.teckvora.com",
  "https://backend.teckvora.com",
];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...String(process.env.CORS_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]
  .map(normalizeOrigin)
  .filter(Boolean);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const requestOrigin = normalizeOrigin(origin);

      if (allowedOrigins.includes("*") || allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.options(/.*/, cors());

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

app.use("/api/product-management/models", productModelRoutes);
app.use("/api/product-management/colours", productColourRoutes);
app.use("/api/product-management/sku-mappings", skuMappingRoutes);
app.use("/api/product-management", localProductManagementRoutes);
app.use("/api/product/product-variants", productVariantRoutes);
app.use("/api/product/categories", productCategoryRoutes);
app.use("/api/product/sub-categories", productSubCategoryRoutes);
app.use("/api/product/attributes", attributeRoutes);
app.use("/api/product/attribute-values", attributeValueRoutes);

app.use("/api/marketplace", marketplaceRoutes);

app.get(
  "/api/daraz/tokens/callback",
  accountController.handleDarazOAuthCallback
);

app.get(
  "/api/daraz/oauth/callback",
  accountController.handleDarazOAuthCallback
);

// Public, no `protect` - Daraz's push notification can't carry a JWT,
// verified by HMAC signature inside the controller instead. See
// daraz_webhook_controller.js for the trust model.
app.post(
  "/api/daraz/webhooks/orders",
  darazWebhookController.handleOrderWebhook
);

app.use("/api/daraz-products", darazProductSyncRoutes);
app.use("/api/daraz/transfer", darazTransferRoutes);
app.use("/api/daraz/title-optimizer", darazTitleOptimizerRoutes);
app.use("/api/daraz/price-reconciliation", darazPriceReconciliationRoutes);
app.use("/api/daraz-inventory", darazInventorySyncRoutes);
app.use("/api/daraz-catalog", darazCatalogRoutes);
app.use("/api/daraz/seller-metrics", darazSellerMetricsRoutes);
app.use("/api/marketplace/woo", wooRoutes);
app.use("/api/marketplace/brighthub", brighthubRoutes);

app.use("/api/order-management/sku-report", skuReportRoutes);
app.use("/api/order-management/customers", orderCustomersRoutes);
app.use("/api/order-management/product-trends", productTrendsRoutes);
app.use("/api/order-management/orders", ordersRoutes);
app.use("/api/order-management/daraz-actions", darazOrderActionsRoutes);
app.use("/api/order-management/sync-settings", orderSyncSettingsRoutes);
app.use("/api/order-management/message-templates", messageTemplatesRoutes);
app.use("/api/daraz/finance", darazFinanceRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/suppliers", supplierRoutes);

app.use(notFound);
app.use(errorHandler);

function startJob(name, starter) {
  try {
    if (typeof starter !== "function") {
      console.warn(`[${name}]: Starter function missing.`);
      return;
    }

    starter();
    console.log(`[${name}]: Started successfully.`);
  } catch (error) {
    console.error(`[${name}_ERROR]:`, error.message);
  }
}

async function syncPermissions() {
  try {
    if (typeof accessModel.ensureAllUserPermissions !== "function") {
      console.warn("[PERMISSION_SYNC]: ensureAllUserPermissions missing.");
      return;
    }

    await accessModel.ensureAllUserPermissions();
    console.log("[PERMISSION_SYNC]: User page permissions synced successfully.");
  } catch (error) {
    console.error("[PERMISSION_SYNC_ERROR]:", error.message);
  }
}

async function startServer() {
  await syncPermissions();

  app.listen(PORT, () => {
    console.log(`Backend running: http://localhost:${PORT}`);

    if (String(process.env.DISABLE_JOBS || "").toLowerCase() === "true") {
      console.log("[JOBS]: Disabled by DISABLE_JOBS=true");
      return;
    }

    startJob("MARKETPLACE_TOKEN_JOB", startMarketplaceTokenCheckerJob);
    startJob("DARAZ_PRODUCT_SYNC_JOB", startDarazProductSyncJob);
    startJob("DARAZ_INVENTORY_SYNC_JOB", startDarazInventorySyncJob);
    startJob("DARAZ_ORDER_SYNC_JOB", startDarazOrderSyncJob);
    startJob("WOO_ORDER_SYNC_JOB", startWooOrderSyncJob);
    startJob("DARAZ_FINANCE_SYNC_JOB", startDarazFinanceSyncJob);
    startJob("DARAZ_TITLE_OPTIMIZER_JOB", startDarazTitleOptimizerJob);
    startJob("DARAZ_TITLE_FULL_SCAN_JOB", startDarazTitleFullScanJob);
    startJob("DARAZ_LISTING_SALES_REPORT_JOB", startDarazListingSalesReportJob);
    startJob("LOW_STOCK_CHECK_JOB", startLowStockCheckJob);
    startJob("TRANS_EXPRESS_TRACKING_SYNC_JOB", startTransExpressTrackingSyncJob);
    startJob("DARAZ_PRICE_RECONCILIATION_JOB", startDarazPriceReconciliationJob);
    startJob("WOO_PRODUCT_SYNC_JOB", startWooProductSyncJob);
    startJob("BRIGHTHUB_PRODUCT_SYNC_JOB", startBrightHubProductSyncJob);
  });
}

startServer().catch((error) => {
  console.error("[SERVER_START_ERROR]:", error.message);
  process.exit(1);
});