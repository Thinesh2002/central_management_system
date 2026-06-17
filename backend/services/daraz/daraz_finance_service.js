const financeController = require("../../controllers/daraz/daraz_finance/sync/daraz_finance_controller");

exports.syncFinance = async () => {
  try {
    console.log("Starting Daraz Finance Sync...");
    await financeController.syncFinance();
    console.log("Finance Sync Completed");
  } catch (error) {
    console.error("Finance Sync Error:", error.message);
  }
};
