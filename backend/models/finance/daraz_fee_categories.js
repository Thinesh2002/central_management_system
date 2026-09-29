// Groups Daraz QueryTransactionDetails lines (fee_type / fee_name /
// transaction_type) into the handful of buckets the finance app reports on.
// Daraz fee names seen in production (2026-09): Product Price Paid by Buyer
// (13), Shipping Fee Paid by Buyer (8), Commission Fee (16), Payment Fee (3),
// Shipping Fee (28), Shipping Fee Discount (157), Free Shipping Max Fee
// (298), Handling Fee (114), Co-funded Voucher Max (515), Daraz Coins
// Discount Participation Fee (5028), Sponsored Solutions: Top-Up (301),
// Penalties for Fulfillment (96), Penalties due to Quality Returns (90),
// Claims for Incorrect Penalties Charged (103). Matching is by name as well
// as ID so reversal lines ("Reversal Commission Fee" ...) land in the same
// bucket as the fee they reverse.

const CATEGORIES = [
  { key: "product_price", label: "Product price", income: true },
  { key: "buyer_shipping", label: "Shipping paid by buyer", income: true },
  { key: "commission", label: "Commission" },
  { key: "payment_fee", label: "Payment fee" },
  { key: "shipping", label: "Shipping fees" },
  { key: "handling", label: "Handling fees" },
  { key: "promotions", label: "Vouchers & promotions" },
  { key: "marketing", label: "Ads & marketing" },
  { key: "penalties", label: "Penalties" },
  { key: "claims", label: "Claims & adjustments" },
  { key: "other", label: "Other" },
];

function categorySql(alias = "") {
  const t = alias ? `${alias}.` : "";
  const name = `LOWER(COALESCE(${t}fee_name, ''))`;
  const type = `LOWER(COALESCE(${t}transaction_type, ''))`;
  return `(CASE
    WHEN ${t}fee_type = '13' OR ${name} LIKE '%product price%' OR ${name} LIKE '%item price%' THEN 'product_price'
    WHEN ${t}fee_type = '8' OR ${name} LIKE '%shipping fee paid by buyer%' THEN 'buyer_shipping'
    WHEN ${name} LIKE '%commission%' THEN 'commission'
    WHEN ${name} LIKE '%payment fee%' THEN 'payment_fee'
    WHEN ${name} LIKE '%penalt%' OR ${type} LIKE '%penalt%' THEN 'penalties'
    WHEN ${name} LIKE '%claim%' OR ${type} LIKE '%claim%' THEN 'claims'
    WHEN ${name} LIKE '%sponsored%' OR ${type} LIKE '%advertis%' OR ${type} LIKE '%marketing%' THEN 'marketing'
    WHEN ${name} LIKE '%handling%' THEN 'handling'
    WHEN ${name} LIKE '%voucher%' OR ${name} LIKE '%coin%' OR ${name} LIKE '%discount participation%'
      OR ${name} LIKE '%campaign%' OR ${name} LIKE '%promotion%' OR ${name} LIKE '%flexi%' THEN 'promotions'
    WHEN ${name} LIKE '%shipping%' THEN 'shipping'
    ELSE 'other'
  END)`;
}

// "734.57 LKR" / "1,234.00" -> number (GetPayoutStatus returns payout as text).
function parseAmount(value) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

module.exports = { CATEGORIES, categorySql, parseAmount };
