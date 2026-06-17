const productSyncService = require("./daraz_product_sync_service");

exports.syncProducts = async () => {
  return productSyncService.syncAllProducts({ force: false, syncType: "cron" });
};
