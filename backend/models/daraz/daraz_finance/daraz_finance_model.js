const crypto = require("crypto");
const db = require("../../../config/finance_management_db/cm_finance_management");

function jsonValue(value) {
  if (value === undefined || value === null) return null;

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function firstValue(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") return value;
  }

  return null;
}

function safeString(value) {
  if (value === undefined || value === null || value === "") return null;
  return String(value);
}

function safeNumber(value) {
  if (value === undefined || value === null || value === "") return 0;

  const text = String(value)
    .replace(/,/g, "")
    .replace(/[A-Za-z]/g, "")
    .trim();

  const number = Number(text);
  return Number.isFinite(number) ? number : 0;
}

function mysqlDate(value) {
  if (value === undefined || value === null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 19).replace("T", " ");
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric)) {
    const date = new Date(numeric > 9999999999 ? numeric : numeric * 1000);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString().slice(0, 19).replace("T", " ");
    }
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().slice(0, 19).replace("T", " ");
  }

  return null;
}

function mysqlDateOnly(value) {
  const date = mysqlDate(value);
  return date ? date.slice(0, 10) : null;
}

function hashValue(value) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(value || {}))
    .digest("hex");
}

function classifyTransaction(line = {}) {
  const amount = safeNumber(
    firstValue(
      line.amount,
      line.Amount,
      line.fee_amount,
      line.feeAmount,
      line.transaction_amount,
      line.transactionAmount,
      line.total_amount,
      line.totalAmount
    )
  );

  const label = String(
    firstValue(
      line.fee_name,
      line.feeName,
      line.details,
      line.detail,
      line.transaction_type,
      line.transactionType,
      line.fee_type,
      line.feeType,
      line.name,
      ""
    )
  ).toLowerCase();

  if (
    label.includes("penalty") ||
    label.includes("fine") ||
    label.includes("seller fault") ||
    label.includes("late") ||
    label.includes("cancellation") ||
    label.includes("cancel")
  ) {
    return "penalty";
  }

  if (label.includes("refund") || label.includes("return")) return "refund";

  if (
    label.includes("shipping") ||
    label.includes("shipment") ||
    label.includes("logistic") ||
    label.includes("delivery")
  ) {
    return "shipping";
  }

  if (
    label.includes("commission") ||
    label.includes("fee") ||
    label.includes("charge") ||
    label.includes("payment")
  ) {
    return "fee";
  }

  if (
    label.includes("item revenue") ||
    label.includes("revenue") ||
    label.includes("sale") ||
    label.includes("sales")
  ) {
    return "revenue";
  }

  if (amount < 0) return "expense";

  return "other";
}

function normalizeTransaction(line = {}, account = {}, range = {}) {
  const raw = line.raw && typeof line.raw === "object" ? line.raw : line;

  const orderNo = firstValue(
    raw.order_no,
    raw.orderNo,
    raw.trade_order_id,
    raw.tradeOrderId,
    raw.order_id,
    raw.orderId,
    line.order_no
  );

  const orderItemNo = firstValue(
    raw.orderItem_no,
    raw.order_item_no,
    raw.orderItemNo,
    raw.trade_order_line_id,
    raw.tradeOrderLineId,
    raw.order_item_id,
    line.order_item_no
  );

  const sellerSku = firstValue(
    raw.seller_sku,
    raw.sellerSku,
    raw.sellerSKU,
    raw.sku,
    raw.SKU,
    line.seller_sku
  );

  const feeName = firstValue(
    raw.fee_name,
    raw.feeName,
    raw.details,
    raw.detail,
    raw.transaction_type,
    raw.transactionType,
    raw.fee_type,
    raw.feeType,
    raw.name,
    line.fee_name,
    "Unknown Fee"
  );

  const transactionType = firstValue(
    raw.transaction_type,
    raw.transactionType,
    line.transaction_type
  );

  const transactionNumber = firstValue(
    raw.transaction_number,
    raw.transactionNumber,
    raw.transaction_no,
    raw.transactionNo,
    line.transaction_number
  );

  const amount = safeNumber(
    firstValue(
      raw.amount,
      raw.Amount,
      raw.fee_amount,
      raw.feeAmount,
      raw.transaction_amount,
      raw.transactionAmount,
      raw.total_amount,
      raw.totalAmount,
      line.amount
    )
  );

  const transactionDateRaw = firstValue(
    raw.transaction_date,
    raw.transactionDate,
    raw.created_at,
    raw.createdAt,
    line.transaction_date
  );

  const category = safeString(line.category || classifyTransaction(raw));
  const itemPrice = category === "revenue" ? amount : 0;
  const shipping = category === "shipping" ? amount : 0;
  const commission = String(feeName || "").toLowerCase().includes("commission") ? amount : 0;
  const fees = category === "fee" ? amount : 0;
  const payoutAmount = amount;
  const netSales = itemPrice + shipping + fees + commission;

  const hash = hashValue({
    account_id: account.id || account.account_id || null,
    account_code: account.account_code || null,
    order_no: orderNo || null,
    order_item_no: orderItemNo || null,
    seller_sku: sellerSku || null,
    transaction_number: transactionNumber || null,
    transaction_date: transactionDateRaw || null,
    fee_name: feeName || null,
    transaction_type: transactionType || null,
    amount,
    reference: firstValue(raw.reference, raw.ref, line.reference),
    raw,
  });

  return {
    transaction_hash: hash,
    account_id: account.id || account.account_id || null,
    account_code: account.account_code || null,
    order_no: safeString(orderNo),
    order_item_no: safeString(orderItemNo),
    seller_sku: safeString(sellerSku),
    lazada_sku: safeString(firstValue(raw.lazada_sku, raw.lazadaSku)),
    transaction_number: safeString(transactionNumber),
    transaction_date_raw: safeString(transactionDateRaw),
    transaction_date: mysqlDate(transactionDateRaw),
    amount,
    paid_status: safeString(firstValue(raw.paid_status, raw.paidStatus, line.paid_status)),
    payment_ref_id: safeString(firstValue(raw.payment_ref_id, raw.paymentRefId)),
    shipping_provider: safeString(firstValue(raw.shipping_provider, raw.shippingProvider)),
    shipping_speed: safeString(firstValue(raw.shipping_speed, raw.shippingSpeed)),
    shipment_type: safeString(firstValue(raw.shipment_type, raw.shipmentType)),
    order_item_status: safeString(firstValue(raw.orderItem_status, raw.order_item_status, raw.orderItemStatus)),
    fee_type: safeString(firstValue(raw.fee_type, raw.feeType, line.fee_type)),
    fee_name: safeString(feeName),
    transaction_type: safeString(transactionType),
    category,
    item_price: itemPrice,
    shipping_amount: shipping,
    commission_amount: commission,
    fee_amount: fees,
    payout_amount: payoutAmount,
    net_sales: netSales,
    statement_label: safeString(firstValue(raw.statement, raw.statement_id, raw.statementId, line.statement)),
    reference_no: safeString(firstValue(raw.reference, raw.ref, line.reference)),
    details: safeString(firstValue(raw.details, raw.detail, line.details)),
    comment_text: safeString(firstValue(raw.comment, raw.remarks, line.comment)),
    vat_in_amount: safeNumber(firstValue(raw.VAT_in_amount, raw.vat_amount, raw.vatAmount, line.vat_amount)),
    wht_amount: safeNumber(firstValue(raw.WHT_amount, raw.wht_amount, raw.whtAmount, line.wht_amount)),
    source_start_time: mysqlDateOnly(range.start_time),
    source_end_time: mysqlDateOnly(range.end_time),
    raw_json: jsonValue(raw),
  };
}

function normalizePayout(row = {}, account = {}, createdAfter = null) {
  const statementNumber = firstValue(row.statement_number, row.statementNumber);
  const createdAt = firstValue(row.created_at, row.createdAt);
  const updatedAt = firstValue(row.updated_at, row.updatedAt);
  const payoutText = firstValue(row.payout, row.payout_text, row.payoutText);

  const hash = hashValue({
    account_id: account.id || account.account_id || null,
    account_code: account.account_code || null,
    statement_number: statementNumber || null,
    created_at: createdAt || null,
    updated_at: updatedAt || null,
    raw: row,
  });

  return {
    payout_hash: hash,
    account_id: account.id || account.account_id || null,
    account_code: account.account_code || null,
    statement_number: safeString(statementNumber),
    created_after: mysqlDateOnly(createdAfter),
    created_at_daraz: mysqlDate(createdAt),
    updated_at_daraz: mysqlDate(updatedAt),
    opening_balance: safeNumber(row.opening_balance),
    closing_balance: safeNumber(row.closing_balance),
    payout_text: safeString(payoutText),
    payout_amount: safeNumber(payoutText),
    item_revenue: safeNumber(row.item_revenue),
    shipment_fee: safeNumber(row.shipment_fee),
    shipment_fee_credit: safeNumber(row.shipment_fee_credit),
    fees_total: safeNumber(row.fees_total),
    refunds: safeNumber(row.refunds),
    guarantee_deposit: safeNumber(row.guarantee_deposit),
    other_revenue_total: safeNumber(row.other_revenue_total),
    fees_on_refunds_total: safeNumber(row.fees_on_refunds_total),
    subtotal1: safeNumber(row.subtotal1),
    subtotal2: safeNumber(row.subtotal2),
    paid: safeNumber(row.paid),
    raw_json: jsonValue(row),
  };
}

async function createSyncRun(data = {}) {
  const syncUid = data.sync_uid || `DF-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  const [result] = await db.query(
    `
    INSERT INTO daraz_finance_sync_runs (
      sync_uid,
      account_id,
      account_code,
      sync_type,
      sync_status,
      date_from,
      date_to,
      request_summary,
      started_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      syncUid,
      data.account_id || null,
      data.account_code || null,
      data.sync_type || "transactions",
      data.sync_status || "running",
      mysqlDateOnly(data.date_from),
      mysqlDateOnly(data.date_to),
      jsonValue(data.request_summary || {}),
    ]
  );

  return {
    id: result.insertId,
    sync_uid: syncUid,
  };
}

async function finishSyncRun(id, data = {}) {
  if (!id) return null;

  await db.query(
    `
    UPDATE daraz_finance_sync_runs
    SET
      sync_status = ?,
      total_fetched = ?,
      total_saved = ?,
      total_failed = ?,
      error_message = ?,
      response_summary = ?,
      finished_at = NOW()
    WHERE id = ?
    `,
    [
      data.sync_status || "success",
      data.total_fetched || 0,
      data.total_saved || 0,
      data.total_failed || 0,
      data.error_message || null,
      jsonValue(data.response_summary || {}),
      id,
    ]
  );

  return true;
}

async function saveTransactions({ account, start_time, end_time, rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    return {
      saved: 0,
      fetched: 0,
    };
  }

  const syncRun = await createSyncRun({
    account_id: account.id,
    account_code: account.account_code,
    sync_type: "transactions",
    date_from: start_time,
    date_to: end_time,
    request_summary: { start_time, end_time, total_rows: list.length },
  });

  let saved = 0;
  let failed = 0;

  for (const row of list) {
    try {
      const data = normalizeTransaction(row, account, { start_time, end_time });

      await db.query(
        `
        INSERT INTO daraz_finance_transactions (
          transaction_hash,
          account_id,
          account_code,
          order_no,
          order_item_no,
          seller_sku,
          lazada_sku,
          transaction_number,
          transaction_date_raw,
          transaction_date,
          amount,
          paid_status,
          payment_ref_id,
          shipping_provider,
          shipping_speed,
          shipment_type,
          order_item_status,
          fee_type,
          fee_name,
          transaction_type,
          category,
          item_price,
          shipping_amount,
          commission_amount,
          fee_amount,
          payout_amount,
          net_sales,
          statement_label,
          reference_no,
          details,
          comment_text,
          vat_in_amount,
          wht_amount,
          source_start_time,
          source_end_time,
          raw_json,
          last_synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          account_id = VALUES(account_id),
          account_code = VALUES(account_code),
          order_no = VALUES(order_no),
          order_item_no = VALUES(order_item_no),
          seller_sku = VALUES(seller_sku),
          lazada_sku = VALUES(lazada_sku),
          transaction_number = VALUES(transaction_number),
          transaction_date_raw = VALUES(transaction_date_raw),
          transaction_date = VALUES(transaction_date),
          amount = VALUES(amount),
          paid_status = VALUES(paid_status),
          payment_ref_id = VALUES(payment_ref_id),
          shipping_provider = VALUES(shipping_provider),
          shipping_speed = VALUES(shipping_speed),
          shipment_type = VALUES(shipment_type),
          order_item_status = VALUES(order_item_status),
          fee_type = VALUES(fee_type),
          fee_name = VALUES(fee_name),
          transaction_type = VALUES(transaction_type),
          category = VALUES(category),
          item_price = VALUES(item_price),
          shipping_amount = VALUES(shipping_amount),
          commission_amount = VALUES(commission_amount),
          fee_amount = VALUES(fee_amount),
          payout_amount = VALUES(payout_amount),
          net_sales = VALUES(net_sales),
          statement_label = VALUES(statement_label),
          reference_no = VALUES(reference_no),
          details = VALUES(details),
          comment_text = VALUES(comment_text),
          vat_in_amount = VALUES(vat_in_amount),
          wht_amount = VALUES(wht_amount),
          source_start_time = VALUES(source_start_time),
          source_end_time = VALUES(source_end_time),
          raw_json = VALUES(raw_json),
          last_synced_at = NOW()
        `,
        [
          data.transaction_hash,
          data.account_id,
          data.account_code,
          data.order_no,
          data.order_item_no,
          data.seller_sku,
          data.lazada_sku,
          data.transaction_number,
          data.transaction_date_raw,
          data.transaction_date,
          data.amount,
          data.paid_status,
          data.payment_ref_id,
          data.shipping_provider,
          data.shipping_speed,
          data.shipment_type,
          data.order_item_status,
          data.fee_type,
          data.fee_name,
          data.transaction_type,
          data.category,
          data.item_price,
          data.shipping_amount,
          data.commission_amount,
          data.fee_amount,
          data.payout_amount,
          data.net_sales,
          data.statement_label,
          data.reference_no,
          data.details,
          data.comment_text,
          data.vat_in_amount,
          data.wht_amount,
          data.source_start_time,
          data.source_end_time,
          data.raw_json,
        ]
      );

      saved += 1;
    } catch (error) {
      failed += 1;
      console.error("[DARAZ_FINANCE_TRANSACTION_SAVE_ERROR]", error.message);
    }
  }

  await finishSyncRun(syncRun.id, {
    sync_status: failed ? "partial_success" : "success",
    total_fetched: list.length,
    total_saved: saved,
    total_failed: failed,
    response_summary: { saved, failed },
  });

  return {
    sync_run_id: syncRun.id,
    sync_uid: syncRun.sync_uid,
    fetched: list.length,
    saved,
    failed,
  };
}

async function savePayouts({ account, created_after, rows = [] }) {
  const list = Array.isArray(rows) ? rows : [];

  if (!list.length) {
    return {
      saved: 0,
      fetched: 0,
    };
  }

  let saved = 0;
  let failed = 0;

  for (const row of list) {
    try {
      const data = normalizePayout(row, account, created_after);

      await db.query(
        `
        INSERT INTO daraz_finance_payouts (
          payout_hash,
          account_id,
          account_code,
          statement_number,
          created_after,
          created_at_daraz,
          updated_at_daraz,
          opening_balance,
          closing_balance,
          payout_text,
          payout_amount,
          item_revenue,
          shipment_fee,
          shipment_fee_credit,
          fees_total,
          refunds,
          guarantee_deposit,
          other_revenue_total,
          fees_on_refunds_total,
          subtotal1,
          subtotal2,
          paid,
          raw_json,
          last_synced_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          account_id = VALUES(account_id),
          account_code = VALUES(account_code),
          statement_number = VALUES(statement_number),
          created_after = VALUES(created_after),
          created_at_daraz = VALUES(created_at_daraz),
          updated_at_daraz = VALUES(updated_at_daraz),
          opening_balance = VALUES(opening_balance),
          closing_balance = VALUES(closing_balance),
          payout_text = VALUES(payout_text),
          payout_amount = VALUES(payout_amount),
          item_revenue = VALUES(item_revenue),
          shipment_fee = VALUES(shipment_fee),
          shipment_fee_credit = VALUES(shipment_fee_credit),
          fees_total = VALUES(fees_total),
          refunds = VALUES(refunds),
          guarantee_deposit = VALUES(guarantee_deposit),
          other_revenue_total = VALUES(other_revenue_total),
          fees_on_refunds_total = VALUES(fees_on_refunds_total),
          subtotal1 = VALUES(subtotal1),
          subtotal2 = VALUES(subtotal2),
          paid = VALUES(paid),
          raw_json = VALUES(raw_json),
          last_synced_at = NOW()
        `,
        [
          data.payout_hash,
          data.account_id,
          data.account_code,
          data.statement_number,
          data.created_after,
          data.created_at_daraz,
          data.updated_at_daraz,
          data.opening_balance,
          data.closing_balance,
          data.payout_text,
          data.payout_amount,
          data.item_revenue,
          data.shipment_fee,
          data.shipment_fee_credit,
          data.fees_total,
          data.refunds,
          data.guarantee_deposit,
          data.other_revenue_total,
          data.fees_on_refunds_total,
          data.subtotal1,
          data.subtotal2,
          data.paid,
          data.raw_json,
        ]
      );

      saved += 1;
    } catch (error) {
      failed += 1;
      console.error("[DARAZ_FINANCE_PAYOUT_SAVE_ERROR]", error.message);
    }
  }

  return {
    fetched: list.length,
    saved,
    failed,
  };
}

module.exports = {
  saveTransactions,
  savePayouts,
};
