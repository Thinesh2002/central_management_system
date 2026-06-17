const axios = require("axios");
const crypto = require("crypto");

const darazAccountModel = require("../../../../models/daraz/daraz_model");
const financeModel = require("../../../../models/finance/daraz/sync/daraz_finance_model");

function generateSignature(apiPath, params, appSecret) {
  const sortedKeys = Object.keys(params)
    .filter(k => k !== "sign")
    .sort();

  let signString = apiPath;

  for (let key of sortedKeys) {
    signString += key + params[key];
  }

  return crypto
    .createHmac("sha256", appSecret)
    .update(signString)
    .digest("hex")
    .toUpperCase();
}

function formatDate(date) {
  return date.toISOString().split("T")[0];
}

exports.syncFinance = async () => {

  const accounts = await darazAccountModel.getAllAccounts();

  for (const account of accounts) {

    let start = new Date("2016-01-01");
    const today = new Date();

    while (start < today) {

      let end = new Date(start);
      end.setDate(end.getDate() + 179);
      if (end > today) end = today;

      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {

        const apiPath = "/finance/transaction/details/get";

        const params = {
          app_key: account.app_key,
          access_token: account.access_token,
          timestamp: Date.now().toString(),
          sign_method: "sha256",
          start_time: formatDate(start),
          end_time: formatDate(end),
          offset: offset.toString(),
          limit: limit.toString()
        };

        params.sign = generateSignature(apiPath, params, account.app_secret);

        const response = await axios.get(
          `${account.api_base}${apiPath}`,
          { params }
        );

        if (response.data.code !== "0") break;

        const data = response.data.data || [];

        for (const item of data) {
          await financeModel.upsertFinanceTransaction(
            account.account_code,
            item
          );
        }

        hasMore = data.length === limit;
        offset += limit;

        await new Promise(r => setTimeout(r, 300));
      }

      start.setDate(start.getDate() + 180);
    }
  }
};
