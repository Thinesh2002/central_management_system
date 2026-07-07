export function money(value) {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) ? number : 0;
}

export function calcProductSelling(cost, profitPercent) {
  const c = money(cost);
  return c + (c * money(profitPercent)) / 100;
}

export function calcDaraz(cost, profitPercent, darazFeePercent, advertisingPercent, packingPercent) {
  const c = money(cost);

  return (
    c +
    (c * money(profitPercent)) / 100 +
    (c * money(darazFeePercent)) / 100 +
    (c * money(advertisingPercent)) / 100 +
    (c * money(packingPercent)) / 100
  );
}
