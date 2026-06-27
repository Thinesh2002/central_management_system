const cron = require("node-cron");
const accountModel = require("../../models/marketplace/account_model");
const tokenService = require("./token_service");

let isRunning = false;

function buildTokenJobError(error) {
  return {
    message: error?.message || "Token check failed",
    code: error?.code || null,
    statusCode: error?.statusCode || null,
    sqlMessage: error?.sqlMessage || null,
    daraz: error?.daraz || null,
    request_id: error?.request_id || null,
    trace_id: error?.trace_id || null,
  };
}

async function safeUpdateAccountHealth(account, data) {
  try {
    if (typeof accountModel.upsertAccountHealth === "function") {
      await accountModel.upsertAccountHealth(
        account.id,
        account.platform_code || "DARAZ",
        data
      );
    }
  } catch (error) {
    console.error("[MARKETPLACE_TOKEN_JOB_HEALTH_UPDATE_FAIL]:", {
      account_id: account?.id,
      account_code: account?.account_code,
      message: error?.message,
      sqlMessage: error?.sqlMessage,
    });
  }
}

async function safeUpdateAccountStatus(accountId, status, connectionStatus, lastError = null) {
  try {
    if (typeof accountModel.updateAccountStatus === "function") {
      await accountModel.updateAccountStatus(
        accountId,
        status,
        connectionStatus,
        lastError
      );
    }
  } catch (error) {
    console.error("[MARKETPLACE_TOKEN_JOB_STATUS_UPDATE_FAIL]:", {
      account_id: accountId,
      message: error?.message,
      sqlMessage: error?.sqlMessage,
    });
  }
}

function resolveTokenStatus(credentials) {
  if (!credentials) {
    return {
      token_status: "missing",
      connection_status: "error",
      message: "Credentials missing",
    };
  }

  return {
    token_status: credentials.token_status || "valid",
    connection_status: "connected",
    message: "Token valid",
  };
}

async function checkMarketplaceTokens() {
  const accounts = await accountModel.getActiveDarazAccounts();

  let checked = 0;
  let valid = 0;
  let refreshed = 0;
  let failed = 0;
  let skipped = 0;

  if (!Array.isArray(accounts) || accounts.length === 0) {
    return {
      checked,
      valid,
      refreshed,
      failed,
      skipped,
      message: "No active Daraz accounts found for token checking.",
    };
  }

  for (const account of accounts) {
    try {
      if (!account?.id) {
        skipped += 1;
        continue;
      }

      checked += 1;

      const result = await tokenService.getValidCredentialsForAccount(account.id);

      const credentials = result?.credentials || result;
      const tokenStatus = resolveTokenStatus(credentials);

      /**
       * If your token_service returns refreshed flag, this will count correctly.
       * Example expected result:
       * {
       *   account,
       *   credentials,
       *   refreshed: true/false
       * }
       */
      if (result?.refreshed === true) {
        refreshed += 1;
      } else {
        valid += 1;
      }

      await safeUpdateAccountHealth(account, {
        connection_status: tokenStatus.connection_status,
        token_status: tokenStatus.token_status,
        last_error: null,
      });

      await safeUpdateAccountStatus(account.id, "active", "connected", null);

    } catch (error) {
      failed += 1;

      const errorInfo = buildTokenJobError(error);

      await safeUpdateAccountHealth(account, {
        connection_status: "error",
        token_status:
          error?.code === "REFRESH_TOKEN_EXPIRED" ||
          error?.code === "DARAZ_ACCESS_TOKEN_MISSING"
            ? "reauthorization_required"
            : "error",
        last_error: errorInfo.message,
      });

      await safeUpdateAccountStatus(
        account.id,
        "reauthorization_required",
        "error",
        errorInfo.message
      );

      console.error("[MARKETPLACE_TOKEN_JOB_ACCOUNT_ERROR]:", {
        account_id: account?.id,
        account_code: account?.account_code,
        ...errorInfo,
      });
    }
  }

  return {
    checked,
    valid,
    refreshed,
    failed,
    skipped,
    message: `Token check completed. Checked: ${checked}, Valid: ${valid}, Refreshed: ${refreshed}, Failed: ${failed}, Skipped: ${skipped}.`,
  };
}

function startMarketplaceTokenCheckerJob() {
  cron.schedule("*/15 * * * *", async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;

    try {

      const summary = await checkMarketplaceTokens();

    } catch (error) {
      console.error("[MARKETPLACE_TOKEN_JOB_ERROR]:", {
        message: error?.message || "Marketplace token checker failed.",
        code: error?.code || null,
        sqlMessage: error?.sqlMessage || null,
        stack: error?.stack || null,
      });
    } finally {
      isRunning = false;
    }
  });

}

module.exports = {
  startMarketplaceTokenCheckerJob,
  checkMarketplaceTokens,
};