import { Fragment, useEffect, useRef, useState } from "react";
import {
  Boxes,
  ChevronDown,
  ChevronRight,
  Copy,
  Edit,
  Eye,
  MoreVertical,
  PackagePlus,
  Send,
  Tag,
  Trash2,
} from "lucide-react";
import { usePagePermission } from "../../../../../components/common/permissions/PermissionsProvider";
import { usePageOverlay } from "../../../../../components/common/page_overlay/PageOverlayProvider";
import { EMPTY_IMAGE } from "../constants/localProductsDashboardConstants";
import {
  getMainImageFromRows,
  getProductImageRows,
} from "../utils/localProductsImageHelpers";
import {
  getProductVariants,
  hasProductVariants,
} from "../utils/localProductsTableHelpers";
import VariantTable from "./VariantTable";
import TransferAccountModal from "./TransferAccountModal";

const TABLE_COL_SPAN = 7;

function getProductId(product = {}) {
  return product.id || product.product_id || product.local_product_id || "";
}

function getProductSku(product = {}) {
  return (
    product.sku ||
    product.product_sku ||
    product.local_sku ||
    product.seller_sku ||
    "-"
  );
}

function getProductTitle(product = {}) {
  return product.title || product.name || product.product_name || "Untitled Product";
}

function getPriceText(record = {}) {
  return record.price_summary?.price_text || "-";
}

function copyText(value) {
  if (!value || value === "-") return;
  navigator.clipboard?.writeText(String(value)).catch(() => {});
}

export default function ProductRow({
  product,
  productIndex,
  productKey,
  productImages,
  expandedRows,
  isSelected,
  onToggleSelect,
  toggleExpanded,
  handleDelete,
  handleDeleteVariant,
  setImagePreview,
}) {
  const { canEdit, canDelete } = usePagePermission("local_products");
  const { openOverlay } = usePageOverlay();
  const [actionOpen, setActionOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const actionRef = useRef(null);

  useEffect(() => {
    if (!actionOpen) return undefined;

    function closeActionMenu(event) {
      if (actionRef.current && !actionRef.current.contains(event.target)) {
        setActionOpen(false);
      }
    }

    document.addEventListener("mousedown", closeActionMenu);
    return () => document.removeEventListener("mousedown", closeActionMenu);
  }, [actionOpen]);

  const productId = getProductId(product);
  const sku = getProductSku(product);
  const title = getProductTitle(product);

  const parentImageRows = getProductImageRows(productImages, productId);
  const primaryImage = getMainImageFromRows(parentImageRows) || EMPTY_IMAGE;

  const variants = getProductVariants(product);
  const hasVariants = hasProductVariants(product);
  const isExpanded = Boolean(expandedRows[productKey]);

  const price = getPriceText(product);

  function handleViewProduct() {
    openOverlay(`/product/view/${productId}`);
  }

  function handleEditProduct() {
    openOverlay(`/product/local-products/edit/${productId}/basic`);
  }

  function handleAddVariant() {
    openOverlay(`/product/local-products/edit/${productId}/variants/create`);
  }

  // Parent rows with variants have no SKU of their own (getProductSku falls
  // back to "-") - link to the plain dashboard instead of searching for a
  // literal dash.
  function handlePriceDashboard() {
    openOverlay(sku && sku !== "-" ? `/price?search=${encodeURIComponent(sku)}` : "/price");
  }

  function handleInventoryDashboard() {
    openOverlay(sku && sku !== "-" ? `/inventory?search=${encodeURIComponent(sku)}` : "/inventory");
  }

  function handleRemoveProduct() {
    handleDelete(product);
  }

  return (
    <Fragment key={productKey || productIndex}>
      <tr className="group bg-[#1b2a3a] text-[11px] text-slate-200 transition hover:bg-[#21344a]">
        {/* Checkbox */}
        <td className="px-3 py-3 align-middle">
          <input
            type="checkbox"
            checked={Boolean(isSelected)}
            onChange={() => onToggleSelect?.(productKey)}
            className="h-3.5 w-3.5 cursor-pointer rounded border-slate-500 bg-slate-900 accent-orange-500"
          />
        </td>

        {/* Expand Icon - after checkbox */}
        <td className="px-2 py-3 text-center align-middle">
          <button
            type="button"
            onClick={() => hasVariants && toggleExpanded(productKey)}
            disabled={!hasVariants}
            className={`inline-flex h-6 w-6 items-center justify-center rounded transition ${
              hasVariants
                ? "cursor-pointer text-orange-300 hover:bg-white/10 hover:text-orange-200"
                : "cursor-default text-slate-600"
            }`}
            title={hasVariants ? "Show variants" : "No variants"}
          >
            {hasVariants ? (
              isExpanded ? (
                <ChevronDown size={15} />
              ) : (
                <ChevronRight size={15} />
              )
            ) : (
              <span className="text-slate-600">•</span>
            )}
          </button>
        </td>

        {/* Image */}
        <td className="px-3 py-3 align-middle">
          <button
            type="button"
            onClick={() =>
              setImagePreview({
                title,
                image: primaryImage,
              })
            }
            className="relative z-0 h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded bg-white ring-1 ring-slate-600 transition-transform duration-150 ease-out hover:z-20 hover:scale-[2.4] hover:shadow-xl hover:ring-orange-400"
            title="View product image"
          >
            <img
              src={primaryImage}
              alt={title}
              className="h-full w-full object-contain"
              onError={(event) => {
                event.currentTarget.src = EMPTY_IMAGE;
              }}
            />
          </button>
        </td>

        {/* Name */}
        <td className="px-3 py-3 align-middle">
          <button
            type="button"
            onClick={handleViewProduct}
            className="line-clamp-2 min-w-0 cursor-pointer text-left text-[11px] font-normal leading-4 text-slate-100 transition hover:text-orange-300 hover:underline hover:underline-offset-2"
            title="View product details"
          >
            {title}
          </button>
        </td>

        {/* SKU */}
        <td className="px-3 py-3 align-middle">
          <div className="flex min-w-0 items-center gap-2">
            {sku && sku !== "-" && !hasVariants ? (
              <button
                type="button"
                onClick={() => openOverlay(`/order-management/sku-report/${encodeURIComponent(sku)}`)}
                className="cursor-pointer truncate text-[11px] font-normal text-orange-300 underline decoration-dotted transition hover:text-orange-200"
                title={`View SKU report for ${sku}`}
              >
                {sku}
              </button>
            ) : (
              <span
                className="truncate text-[11px] font-normal text-slate-200"
                title={hasVariants ? "Parent product — see child SKUs for analysis" : ""}
              >
                {sku}
              </span>
            )}

            <button
              type="button"
              onClick={() => copyText(sku)}
              className="shrink-0 cursor-pointer text-orange-400 transition hover:text-orange-200"
              title="Copy SKU"
            >
              <Copy size={12} />
            </button>
          </div>
        </td>

        {/* Price */}
        <td className="px-3 py-3 text-right align-middle">
          <span className="text-[11px] font-normal text-slate-100">
            {price}
          </span>
        </td>

        {/* Actions */}
        <td className="px-3 py-3 align-middle">
          <div className="flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={handleViewProduct}
              title="View"
              className="flex h-6 w-6 cursor-pointer items-center justify-center text-sky-300 transition hover:text-sky-200"
            >
              <Eye size={13} />
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={handleEditProduct}
                title="Edit"
                className="flex h-6 w-6 cursor-pointer items-center justify-center text-amber-300 transition hover:text-amber-200"
              >
                <Edit size={13} />
              </button>
            )}

            {canDelete && (
              <button
                type="button"
                onClick={handleRemoveProduct}
                title="Delete"
                className="flex h-6 w-6 cursor-pointer items-center justify-center text-rose-300 transition hover:text-rose-200"
              >
                <Trash2 size={13} />
              </button>
            )}

            {canEdit && (
              <div className="relative" ref={actionOpen ? actionRef : null}>
                <button
                  type="button"
                  onClick={() => setActionOpen((prev) => !prev)}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center text-violet-300 transition hover:text-violet-200"
                  title="More actions"
                >
                  <MoreVertical size={14} />
                </button>

                {actionOpen ? (
                  <div className="absolute right-0 top-7 z-30 w-52 rounded-sm border border-zinc-800/60 bg-[#0b1220] py-1 text-left shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setActionOpen(false);
                        handleAddVariant();
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-[12px] text-zinc-200 hover:bg-white/5 hover:text-orange-300"
                    >
                      <PackagePlus size={13} /> Add Variant
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionOpen(false);
                        handlePriceDashboard();
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-[12px] text-emerald-300 hover:bg-white/5 hover:text-emerald-200"
                    >
                      <Tag size={13} /> Price Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionOpen(false);
                        handleInventoryDashboard();
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-[12px] text-sky-300 hover:bg-white/5 hover:text-sky-200"
                    >
                      <Boxes size={13} /> Inventory Dashboard
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActionOpen(false);
                        setTransferOpen(true);
                      }}
                      className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-[12px] text-zinc-200 hover:bg-white/5 hover:text-orange-300"
                    >
                      <Send size={13} /> Transfer to Daraz
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </td>
      </tr>

      {isExpanded && hasVariants && (
        <tr>
          <td colSpan={TABLE_COL_SPAN} className="bg-[#101827] px-4 py-3">
            <VariantTable
              variants={variants}
              product={product}
              productId={productId}
              productKey={productKey}
              productImages={productImages}
              setImagePreview={setImagePreview}
              onDeleteVariant={handleDeleteVariant}
            />
          </td>
        </tr>
      )}

      {transferOpen && (
        <TransferAccountModal
          product={{ id: productId, title }}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </Fragment>
  );
}