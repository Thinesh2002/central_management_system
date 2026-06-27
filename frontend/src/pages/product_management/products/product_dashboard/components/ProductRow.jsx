import { Fragment, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, Copy, Edit, Eye, MoreVertical, PackageCheck, Send, Trash2 } from "lucide-react";
import erpApi from "../../../../../config/sub_api/erp_api/erpApi";
import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";
import { getMainImageFromRows, getProductImageRows } from "../utils/localProductsImageHelpers";
import { getProductVariants, hasProductVariants } from "../utils/localProductsTableHelpers";
import VariantTable from "./VariantTable";

const TABLE_COL_SPAN = 8;
const ACTION_MENU_WIDTH = 204;

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

function getProductSku(product = {}) {
  return product.sku || product.product_sku || product.local_sku || product.seller_sku || "-";
}

function getProductTitle(product = {}) {
  return product.title || product.name || product.product_name || "Untitled Product";
}

function copyText(value) {
  if (!value || value === "-") return;
  navigator.clipboard?.writeText(String(value)).catch(() => {});
}

function openNewTab(path) {
  const url = `${window.location.origin}${path}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

function num(value) {
  return Number(value || 0).toLocaleString();
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "-";
}

function getProductMetaText(product = {}) {
  const category = first(product.category_name, product.category, product.product_category_name);
  const subCategory = first(product.sub_category_name, product.subcategory_name, product.product_sub_category_name);
  const model = first(product.model_name, product.product_model_name, product.model);
  const type = first(product.product_type, product.type, product.product_kind);
  return { category, subCategory, model, type };
}

export default function ProductRow({ product, productIndex, productKey, productImages, expandedRows, toggleExpanded, handleDelete, setImagePreview, onReload }) {
  const [actionOpen, setActionOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [busy, setBusy] = useState("");
  const actionButtonRef = useRef(null);
  const actionMenuRef = useRef(null);

  const productId = getProductId(product);
  const sku = getProductSku(product);
  const title = getProductTitle(product);
  const parentImageRows = getProductImageRows(productImages, productId);
  const primaryImage = getMainImageFromRows(parentImageRows) || EMPTY_IMAGE;
  const variants = getProductVariants(product);
  const hasVariants = hasProductVariants(product);
  const isExpanded = Boolean(expandedRows[productKey]);
  const meta = getProductMetaText(product);
  const metrics = product.metrics || {};
  const availableStock = metrics.available_stock ?? product.available_qty ?? product.stock_qty ?? product.total_inventory ?? 0;
  const reservedStock = metrics.reserved_qty ?? product.reserved_qty ?? 0;
  const sales30 = metrics.sales_30_days ?? product.sales_30_days ?? 0;
  const sales90 = metrics.sales_90_days ?? product.sales_90_days ?? 0;
  const pendingOrders = metrics.pending_orders ?? product.pending_orders ?? 0;

  function updateMenuPosition() {
    const button = actionButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    setMenuPosition({ top: rect.bottom + 6, left: Math.max(8, rect.right - ACTION_MENU_WIDTH) });
  }

  function toggleActionMenu() {
    updateMenuPosition();
    setActionOpen((prev) => !prev);
  }

  function handleViewProduct() {
    setActionOpen(false);
    openNewTab(`/product/view/${productId}`);
  }

  function handleEditProduct() {
    setActionOpen(false);
    openNewTab(`/product/local-products/edit/${productId}/basic`);
  }

  function handleRemoveProduct() {
    setActionOpen(false);
    handleDelete(product);
  }

  async function handleManualStock() {
    setActionOpen(false);
    const qty = window.prompt(`Enter new local stock for ${sku}`, String(availableStock ?? 0));
    if (qty === null || qty === "") return;
    try {
      setBusy("stock");
      await erpApi.manualStockUpdate({ local_sku: sku, stock_qty: Number(qty), note: "Updated from local product dashboard" });
      await onReload?.();
    } catch (error) {
      alert(error?.response?.data?.message || error.message || "Manual stock update failed.");
    } finally {
      setBusy("");
    }
  }

  async function handlePush(marketplace) {
    setActionOpen(false);
    try {
      setBusy(marketplace);
      await erpApi.pushStock({ local_sku: sku, marketplace, requested_qty: Number(availableStock || 0) });
      alert(`${marketplace} stock push added to queue.`);
    } catch (error) {
      alert(error?.response?.data?.message || error.message || `${marketplace} stock push failed.`);
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (!actionOpen) return undefined;
    function handleOutsideClick(event) {
      const button = actionButtonRef.current;
      const menu = actionMenuRef.current;
      if (button?.contains(event.target) || menu?.contains(event.target)) return;
      setActionOpen(false);
    }
    function handleWindowChange() { setActionOpen(false); }
    document.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("scroll", handleWindowChange, true);
    window.addEventListener("resize", handleWindowChange);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("scroll", handleWindowChange, true);
      window.removeEventListener("resize", handleWindowChange);
    };
  }, [actionOpen]);

  return (
    <Fragment key={productKey || productIndex}>
      <tr className="group bg-[#1b2a3a] text-[11px] text-slate-200 transition hover:bg-[#21344a]">
        <td className="px-3 py-3 align-middle"><input type="checkbox" className="h-3.5 w-3.5 cursor-pointer rounded border-slate-500 bg-slate-900 accent-orange-500" /></td>
        <td className="px-2 py-3 text-center align-middle">
          <button type="button" onClick={() => hasVariants && toggleExpanded(productKey)} disabled={!hasVariants} className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${hasVariants ? "cursor-pointer text-orange-300 hover:bg-white/10 hover:text-orange-200" : "cursor-default text-slate-600"}`} title={hasVariants ? "Show variants" : "No variants"}>
            {hasVariants ? (isExpanded ? <ChevronDown size={15} /> : <ChevronRight size={15} />) : <span className="text-slate-600">•</span>}
          </button>
        </td>
        <td className="px-3 py-3 align-middle">
          <button type="button" onClick={() => setImagePreview({ title, image: primaryImage })} className="h-10 w-10 cursor-pointer overflow-hidden rounded bg-white ring-1 ring-slate-600 transition hover:ring-orange-400" title="View product image">
            <img src={primaryImage} alt={title} className="h-full w-full object-contain" onError={(event) => { event.currentTarget.src = EMPTY_IMAGE; }} />
          </button>
        </td>
        <td className="px-3 py-3 align-middle">
          <button type="button" onClick={handleViewProduct} className="line-clamp-2 min-w-0 cursor-pointer text-left text-[11px] font-semibold leading-4 text-slate-100 transition hover:text-orange-300 hover:underline hover:underline-offset-2" title="View product details">{title}</button>
          <div className="mt-1 grid gap-0.5 text-[10px] text-slate-500 sm:grid-cols-2">
            <span>Category: {meta.category}</span>
            <span>Sub: {meta.subCategory}</span>
            <span>Model: {meta.model}</span>
            <span>Type: {meta.type}</span>
          </div>
        </td>
        <td className="px-3 py-3 align-middle">
          <div className="flex min-w-0 items-center gap-2">
            <Link to={`/reports/sku-economics/${encodeURIComponent(sku)}`} className="truncate font-mono text-[11px] font-semibold text-yellow-100 hover:text-yellow-200 hover:underline" title="Open SKU economics report">{sku}</Link>
            <button type="button" onClick={() => copyText(sku)} className="shrink-0 cursor-pointer text-orange-400 transition hover:text-orange-200" title="Copy SKU"><Copy size={12} /></button>
          </div>
          {pendingOrders > 0 && <p className="mt-1 text-[10px] text-amber-300">Pending orders: {num(pendingOrders)}</p>}
        </td>
        <td className="px-3 py-3 text-right align-middle">
          <p className="font-bold text-slate-100">{num(availableStock)}</p>
          <p className="text-[10px] text-slate-500">Reserved: {num(reservedStock)}</p>
        </td>
        <td className="px-3 py-3 text-right align-middle">
          <p className="font-bold text-slate-100">30d: {num(sales30)}</p>
          <p className="text-[10px] text-slate-500">90d: {num(sales90)}</p>
        </td>
        <td className="px-3 py-3 text-center align-middle">
          <button ref={actionButtonRef} type="button" onClick={toggleActionMenu} disabled={!!busy} className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded text-slate-300 transition hover:bg-white/10 hover:text-orange-300" title="Product actions"><MoreVertical size={16} /></button>
        </td>
      </tr>

      {actionOpen && createPortal(
        <div ref={actionMenuRef} style={{ position: "fixed", top: `${menuPosition.top}px`, left: `${menuPosition.left}px`, width: `${ACTION_MENU_WIDTH}px` }} className="z-[9999] overflow-hidden rounded-lg border border-slate-600 bg-[#0f1b2b] text-left shadow-2xl shadow-black/50">
          <button type="button" onClick={handleViewProduct} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><Eye size={14} /> View Product</button>
          <button type="button" onClick={handleEditProduct} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><Edit size={14} /> Edit Product</button>
          <Link to={`/reports/sku-economics/${encodeURIComponent(sku)}`} onClick={() => setActionOpen(false)} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><PackageCheck size={14} /> SKU Economics</Link>
          <button type="button" onClick={handleManualStock} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><PackageCheck size={14} /> Manual Stock Update</button>
          <button type="button" onClick={() => handlePush('DARAZ')} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><Send size={14} /> Push Stock Daraz</button>
          <button type="button" onClick={() => handlePush('WOO')} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-slate-100 transition hover:bg-orange-500/15 hover:text-orange-300"><Send size={14} /> Push Stock Woo</button>
          <button type="button" onClick={handleRemoveProduct} className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-xs font-normal text-red-300 transition hover:bg-red-500/15 hover:text-red-200"><Trash2 size={14} /> Delete Product</button>
        </div>, document.body
      )}

      {isExpanded && hasVariants && (
        <tr>
          <td colSpan={TABLE_COL_SPAN} className="bg-[#101827] px-4 py-3">
            <VariantTable variants={variants} product={product} productId={productId} productKey={productKey} productImages={productImages} setImagePreview={setImagePreview} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
