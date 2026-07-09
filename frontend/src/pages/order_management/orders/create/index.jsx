import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ImageOff, Plus, Save, Search, Trash2 } from "lucide-react";

import ordersApi from "../../../../config/sub_api/order_management_api/orders_api";
import localProductsApi from "../../../../config/sub_api/product_management_api/local_products_api";
import { getApiError } from "../../../../config/api";
import { useToast } from "../../../../components/common/toast/ToastProvider";

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api"
).trim();
const BACKEND_BASE_URL = RAW_API_BASE_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");

function clean(value) {
  return String(value ?? "").trim();
}

function imgUrl(url) {
  const u = clean(url);
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/uploads/")) return `${BACKEND_BASE_URL}${u}`;
  if (u.startsWith("uploads/")) return `${BACKEND_BASE_URL}/${u}`;
  if (u.startsWith("/")) return `${BACKEND_BASE_URL}${u}`;
  return `${BACKEND_BASE_URL}/${u.replace(/^\/+/, "")}`;
}

function productName(p = {}) {
  return clean(p.product_name || p.title || p.name || p.product_title || p.sku || "Product");
}

function productSku(p = {}) {
  return clean(p.sku || p.product_sku || p.local_sku || "");
}

function variantSku(v = {}) {
  return clean(v.variant_sku || v.sku || v.local_sku || "");
}

function mainImage(row = {}) {
  return clean(
    row.main_image_url || row.image_url || row.product_image_url || row.thumbnail_url || row.image || ""
  );
}

function flattenCatalog(products = []) {
  const out = [];

  products.forEach((p) => {
    const pSku = productSku(p);
    const base = {
      product_id: p.id || p.product_id,
      product_name: productName(p),
      image_url: mainImage(p),
    };

    const variants = Array.isArray(p.variants) ? p.variants : [];

    if (variants.length) {
      variants.forEach((v) => {
        const vSku = variantSku(v);
        if (!vSku) return;

        out.push({
          ...base,
          sku: vSku,
          variant_id: v.id || v.variant_id,
          image_url: mainImage(v) || base.image_url,
          label: `${vSku} — ${base.product_name}`,
        });
      });
    } else if (pSku) {
      out.push({ ...base, sku: pSku, variant_id: null, label: `${pSku} — ${base.product_name}` });
    }
  });

  return out;
}

function ProductImage({ src, name }) {
  const url = imgUrl(src);

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-slate-700 bg-white">
      {url ? (
        <img src={url} alt={name || "Product"} className="h-full w-full object-cover" />
      ) : (
        <ImageOff size={14} className="text-slate-400" />
      )}
    </div>
  );
}

function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function emptyItem() {
  return {
    sku: "",
    product_title: "",
    qty: 1,
    unit_price: "0.00",
    discount_amount: "0.00",
    product_id: null,
    variant_id: null,
    image_url: "",
  };
}

function lineTotal(item) {
  return Math.max(Number(item.qty || 0) * Number(item.unit_price || 0) - Number(item.discount_amount || 0), 0);
}

function money(value, currency = "LKR") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function FieldLabel({ children, required }) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
      {children} {required && <span className="text-orange-400">*</span>}
    </span>
  );
}

const FIELD_CLASS =
  "h-9 w-full border border-slate-700 bg-[#0a101d] px-2.5 text-[12px] font-medium text-slate-100 outline-none focus:border-orange-400";

export default function CreateManualOrderPage() {
  const navigate = useNavigate();
  const showToast = useToast();

  const [saving, setSaving] = useState(false);
  const [skuSearch, setSkuSearch] = useState({});
  const [productMatches, setProductMatches] = useState({});
  const [searching, setSearching] = useState(null);

  const [form, setForm] = useState({
    source_type: "MANUAL_WHATSAPP",
    account_name: "",
    order_date: todayInputValue(),
    customer: { customer_name: "", company_name: "", phone_1: "", phone_2: "", email: "" },
    shipping: {
      shipping_address_line1: "",
      shipping_address_line2: "",
      shipping_city: "",
      shipping_district: "",
      shipping_province: "",
      shipping_postal_code: "",
      shipping_country: "Sri Lanka",
    },
    items: [emptyItem()],
    currency: "LKR",
    discount_total: "0.00",
    shipping_fee: "0.00",
    tax_percentage: "0",
    payment_method: "COD",
    customer_note: "",
  });

  const itemTotal = useMemo(
    () => form.items.reduce((sum, item) => sum + lineTotal(item), 0),
    [form.items]
  );

  const taxTotal = useMemo(
    () => itemTotal * (Number(form.tax_percentage || 0) / 100),
    [itemTotal, form.tax_percentage]
  );

  const orderTotal = useMemo(
    () => itemTotal - Number(form.discount_total || 0) + Number(form.shipping_fee || 0) + taxTotal,
    [itemTotal, form.discount_total, form.shipping_fee, taxTotal]
  );

  function setRoot(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setNested(section, key, value) {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [key]: value } }));
  }

  function updateItem(index, key, value) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [key]: value } : item)),
    }));
  }

  function addItem() {
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length === 1 ? prev.items : prev.items.filter((_, i) => i !== index),
    }));
  }

  async function searchSku(index) {
    const query = clean(skuSearch[index]);
    if (!query) return;

    setSearching(index);

    try {
      const res = await localProductsApi.getProducts({ limit: 100, search: query });
      const rows = res?.data?.data || res?.data || [];
      const flat = flattenCatalog(Array.isArray(rows) ? rows : []);
      setProductMatches((prev) => ({ ...prev, [index]: flat.slice(0, 20) }));
    } catch {
      setProductMatches((prev) => ({ ...prev, [index]: [] }));
    } finally {
      setSearching(null);
    }
  }

  function selectMatch(index, match) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              sku: match.sku,
              product_title: match.product_name,
              product_id: match.product_id,
              variant_id: match.variant_id,
              image_url: match.image_url,
            }
          : item
      ),
    }));

    setProductMatches((prev) => ({ ...prev, [index]: [] }));
    setSkuSearch((prev) => ({ ...prev, [index]: match.sku }));
  }

  async function submit(event) {
    event.preventDefault();

    if (!form.customer.phone_1.trim()) {
      alert("Phone number 1 is required.");
      return;
    }

    if (!form.account_name.trim()) {
      alert("Account name is required.");
      return;
    }

    const validItems = form.items.filter((item) => item.sku.trim());

    if (!validItems.length) {
      alert("Add at least one order item with a SKU.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        items: validItems,
        totals: { item_total: itemTotal, tax_total: taxTotal, order_total: orderTotal },
      };

      const result = await ordersApi.createManualOrder(payload);
      showToast("Order created successfully.");

      const created = result?.data;
      if (created?.id) {
        navigate(`/order-management/orders/local/${created.id}`);
      } else {
        navigate("/order-management/orders");
      }
    } catch (error) {
      alert(getApiError(error, "Order create failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/order-management/orders")}
            className="inline-flex h-8 w-8 items-center justify-center border border-slate-700 text-slate-300 hover:border-orange-400 hover:text-orange-300"
          >
            <ArrowLeft size={15} />
          </button>

          <div>
            <h1 className="text-[14px] font-semibold text-white">Create Manual Order</h1>
            <p className="text-[11px] text-slate-500">
              Order number is generated automatically from the account name (e.g. BH0001, BH0002...).
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-8 items-center gap-1.5 bg-orange-500 px-3 text-[12px] font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Save size={13} /> {saving ? "Saving..." : "Create Order"}
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="border border-slate-800 bg-[#0b1220] p-3">
          <h3 className="mb-3 text-[12px] font-semibold text-white">Customer Details</h3>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <FieldLabel required>Customer Name</FieldLabel>
              <input
                className={FIELD_CLASS}
                value={form.customer.customer_name}
                onChange={(e) => setNested("customer", "customer_name", e.target.value)}
                required
              />
            </label>

            <label className="block">
              <FieldLabel>Company</FieldLabel>
              <input
                className={FIELD_CLASS}
                value={form.customer.company_name}
                onChange={(e) => setNested("customer", "company_name", e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel required>Phone Number 1</FieldLabel>
              <input
                className={FIELD_CLASS}
                value={form.customer.phone_1}
                onChange={(e) => setNested("customer", "phone_1", e.target.value)}
                required
              />
            </label>

            <label className="block">
              <FieldLabel>Phone Number 2</FieldLabel>
              <input
                className={FIELD_CLASS}
                value={form.customer.phone_2}
                onChange={(e) => setNested("customer", "phone_2", e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel>Email</FieldLabel>
              <input
                type="email"
                className={FIELD_CLASS}
                value={form.customer.email}
                onChange={(e) => setNested("customer", "email", e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel>Payment Method</FieldLabel>
              <select
                className={FIELD_CLASS}
                value={form.payment_method}
                onChange={(e) => setRoot("payment_method", e.target.value)}
              >
                <option value="COD">COD</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
          </div>
        </section>

        <section className="border border-slate-800 bg-[#0b1220] p-3">
          <h3 className="mb-3 text-[12px] font-semibold text-white">Order Source</h3>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <FieldLabel>Order Type</FieldLabel>
              <select
                className={FIELD_CLASS}
                value={form.source_type}
                onChange={(e) => setRoot("source_type", e.target.value)}
              >
                <option value="MANUAL_WHATSAPP">Manual WhatsApp</option>
                <option value="MANUAL_FACEBOOK">Manual Facebook</option>
                <option value="MANUAL_TIKTOK">Manual TikTok</option>
                <option value="MANUAL_OTHER">Manual Other</option>
              </select>
            </label>

            <label className="block">
              <FieldLabel required>Account Name</FieldLabel>
              <input
                className={FIELD_CLASS}
                value={form.account_name}
                onChange={(e) => setRoot("account_name", e.target.value)}
                placeholder="e.g. BrightHub"
                required
              />
            </label>

            <label className="block">
              <FieldLabel required>Order Date</FieldLabel>
              <input
                type="date"
                className={FIELD_CLASS}
                value={form.order_date}
                onChange={(e) => setRoot("order_date", e.target.value)}
                required
              />
            </label>

            <label className="block">
              <FieldLabel>Currency</FieldLabel>
              <input className={`${FIELD_CLASS} bg-slate-900 text-slate-500`} value={form.currency} readOnly />
            </label>
          </div>
        </section>
      </div>

      <section className="border border-slate-800 bg-[#0b1220] p-3">
        <h3 className="mb-3 text-[12px] font-semibold text-white">Shipping Address</h3>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <FieldLabel required>Address Line 1</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_address_line1}
              onChange={(e) => setNested("shipping", "shipping_address_line1", e.target.value)}
              required
            />
          </label>

          <label className="block">
            <FieldLabel>Address Line 2</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_address_line2}
              onChange={(e) => setNested("shipping", "shipping_address_line2", e.target.value)}
            />
          </label>

          <label className="block">
            <FieldLabel required>City</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_city}
              onChange={(e) => setNested("shipping", "shipping_city", e.target.value)}
              required
            />
          </label>

          <label className="block">
            <FieldLabel>District</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_district}
              onChange={(e) => setNested("shipping", "shipping_district", e.target.value)}
            />
          </label>

          <label className="block">
            <FieldLabel>Province</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_province}
              onChange={(e) => setNested("shipping", "shipping_province", e.target.value)}
            />
          </label>

          <label className="block">
            <FieldLabel>Postcode</FieldLabel>
            <input
              className={FIELD_CLASS}
              value={form.shipping.shipping_postal_code}
              onChange={(e) => setNested("shipping", "shipping_postal_code", e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="border border-slate-800 bg-[#0b1220] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[12px] font-semibold text-white">Order Items</h3>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex h-7 items-center gap-1 border border-slate-700 px-2.5 text-[11px] font-semibold text-slate-300 hover:border-orange-400 hover:text-orange-300"
          >
            <Plus size={12} /> Add Item
          </button>
        </div>

        <div className="space-y-2">
          {form.items.map((item, index) => (
            <div key={index} className="border border-slate-800 bg-[#070b16] p-2.5">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-[40px_1fr_1fr_90px_110px_110px_32px] md:items-end">
                <div className="hidden md:block">
                  <ProductImage src={item.image_url} name={item.product_title} />
                </div>

                <label className="block">
                  <FieldLabel>SKU</FieldLabel>
                  <div className="flex gap-1">
                    <input
                      className={FIELD_CLASS}
                      value={skuSearch[index] ?? item.sku}
                      onChange={(e) => setSkuSearch((prev) => ({ ...prev, [index]: e.target.value }))}
                      placeholder="Search SKU..."
                    />
                    <button
                      type="button"
                      onClick={() => searchSku(index)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center border border-slate-700 bg-slate-800 text-slate-300 hover:border-orange-400"
                    >
                      <Search size={13} className={searching === index ? "animate-pulse" : ""} />
                    </button>
                  </div>

                  {productMatches[index]?.length > 0 && (
                    <div className="relative z-10 mt-1 max-h-48 overflow-y-auto border border-slate-700 bg-[#0b1220] shadow-xl">
                      {productMatches[index].map((match) => (
                        <button
                          type="button"
                          key={`${match.sku}-${match.product_id}`}
                          onClick={() => selectMatch(index, match)}
                          className="flex w-full items-center gap-2 border-b border-slate-800 px-2 py-1.5 text-left hover:bg-slate-800/60"
                        >
                          <ProductImage src={match.image_url} name={match.product_name} />
                          <span className="min-w-0 truncate text-[11px] text-slate-200">{match.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>

                <label className="block">
                  <FieldLabel>Product Title</FieldLabel>
                  <input
                    className={FIELD_CLASS}
                    value={item.product_title}
                    onChange={(e) => updateItem(index, "product_title", e.target.value)}
                  />
                </label>

                <label className="block">
                  <FieldLabel>Qty</FieldLabel>
                  <input
                    type="number"
                    min="1"
                    className={FIELD_CLASS}
                    value={item.qty}
                    onChange={(e) => updateItem(index, "qty", e.target.value)}
                  />
                </label>

                <label className="block">
                  <FieldLabel>Unit Price</FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    className={FIELD_CLASS}
                    value={item.unit_price}
                    onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                  />
                </label>

                <label className="block">
                  <FieldLabel>Discount</FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    className={FIELD_CLASS}
                    value={item.discount_amount}
                    onChange={(e) => updateItem(index, "discount_amount", e.target.value)}
                  />
                </label>

                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={form.items.length === 1}
                  className="flex h-9 w-9 items-center justify-center border border-red-900 text-red-400 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <p className="mt-1.5 text-right text-[11px] font-semibold text-slate-400">
                Line total: {money(lineTotal(item), form.currency)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_360px]">
        <section className="border border-slate-800 bg-[#0b1220] p-3">
          <label className="block">
            <FieldLabel>Customer Note</FieldLabel>
            <textarea
              rows={4}
              className="w-full border border-slate-700 bg-[#0a101d] px-2.5 py-2 text-[12px] text-slate-100 outline-none focus:border-orange-400"
              value={form.customer_note}
              onChange={(e) => setRoot("customer_note", e.target.value)}
              placeholder="Note for internal team or customer"
            />
          </label>
        </section>

        <section className="border border-slate-800 bg-[#0b1220] p-3">
          <div className="space-y-2">
            <label className="block">
              <FieldLabel>Discount Total</FieldLabel>
              <input
                type="number"
                step="0.01"
                className={FIELD_CLASS}
                value={form.discount_total}
                onChange={(e) => setRoot("discount_total", e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel>Shipping Fee</FieldLabel>
              <input
                type="number"
                step="0.01"
                className={FIELD_CLASS}
                value={form.shipping_fee}
                onChange={(e) => setRoot("shipping_fee", e.target.value)}
              />
            </label>

            <label className="block">
              <FieldLabel>Tax %</FieldLabel>
              <input
                type="number"
                step="0.01"
                className={FIELD_CLASS}
                value={form.tax_percentage}
                onChange={(e) => setRoot("tax_percentage", e.target.value)}
              />
            </label>

            <div className="space-y-1 border-t border-slate-800 pt-2 text-[12px]">
              <div className="flex justify-between text-slate-400">
                <span>Item total</span>
                <span>{money(itemTotal, form.currency)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax</span>
                <span>{money(taxTotal, form.currency)}</span>
              </div>
              <div className="flex justify-between text-[13px] font-bold text-orange-300">
                <span>Order Total</span>
                <span>{money(orderTotal, form.currency)}</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </form>
  );
}
