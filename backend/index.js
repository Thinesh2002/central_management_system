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

const marketplaceRoutes = require("./routes/marketplace/marketplace_routes");
const darazProductSyncRoutes = require("./routes/daraz/product_management/daraz_product_sync_route");
const wooRoutes = require("./routes/woo/woo_route");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const {
  startMarketplaceTokenCheckerJob,
} = require("./services/marketplace/token_checker_job");

const {
  startDarazProductSyncJob,
} = require("./jobs/daraz/product_management/daraz_product_sync_job");


const app = express();
const PORT = Number(process.env.PORT || 5000);

app.set("trust proxy", 1);

const normalizeOrigin = (origin = "") => String(origin).trim().replace(/\/$/, "");

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

app.use("/api/product-management/models", productModelRoutes);
app.use("/api/product-management/colours", productColourRoutes);
app.use("/api/product-management", localProductManagementRoutes);
app.use("/api/product/product-variants", productVariantRoutes);
app.use("/api/product/categories", productCategoryRoutes);
app.use("/api/product/sub-categories", productSubCategoryRoutes);
app.use("/api/marketplace", marketplaceRoutes);
app.use("/api/daraz-products", darazProductSyncRoutes);
app.use("/api/marketplace/woo", wooRoutes);

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
  });
}

startServer().catch((error) => {
  console.error("[SERVER_START_ERROR]:", error.message);
  process.exit(1);
});