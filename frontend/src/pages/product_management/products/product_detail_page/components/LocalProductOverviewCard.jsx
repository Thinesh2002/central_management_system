import { BadgeDollarSign, Boxes, Hash, Image as ImageIcon, Layers, Package, Tag } from "lucide-react";
import LocalProductInfoCard, { Badge, DetailItem } from "./LocalProductInfoCard";
import {
  formatMoney,
  getCategoryName,
  getMainImage,
  getModelName,
  getStatus,
  getSubCategoryName,
  valueOf,
  yesNo,
} from "../utils/localProductViewHelpers";

function ProductImageBox({ product }) {
  const imageUrl = getMainImage(product);

  return (
    <div className="flex h-full min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-[#070b16]">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={valueOf(product, ["title", "name"], "Product image")}
          className="h-full max-h-[320px] w-full object-contain p-4"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-center text-slate-500">
          <ImageIcon size={42} />
          <p className="text-sm font-bold">No image available</p>
        </div>
      )}
    </div>
  );
}

export default function LocalProductOverviewCard({ product }) {
  const currency = valueOf(product, ["currency"], "LKR");
  const status = getStatus(product);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <ProductImageBox product={product} />

      <LocalProductInfoCard title="Product Overview" icon={Package}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge tone={String(status).toLowerCase() === "active" ? "green" : "slate"}>
            {status}
          </Badge>
          <Badge tone={Number(product?.has_variants) === 1 ? "violet" : "orange"}>
            {Number(product?.has_variants) === 1 ? "Variant Product" : "Single Product"}
          </Badge>
        </div>

        <h2 className="text-2xl font-black leading-tight text-white">
          {valueOf(product, ["title", "name", "product_name"], "Untitled Product")}
        </h2>

        <p className="mt-2 text-sm font-medium leading-6 text-slate-400">
          {valueOf(product, ["short_description", "shortDescription"], "No short description added.")}
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailItem label="SKU" value={valueOf(product, ["sku", "product_sku"])} />
          <DetailItem label="Slug" value={valueOf(product, ["slug"])} />
          <DetailItem label="Category" value={getCategoryName(product)} />
          <DetailItem label="Sub Category" value={getSubCategoryName(product)} />
          <DetailItem label="Model" value={getModelName(product)} />
          <DetailItem label="Product Type" value={valueOf(product, ["product_type"], "single")} />
          <DetailItem label="Has Variants" value={yesNo(product?.has_variants)} />
          <DetailItem label="Currency" value={currency} />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
          <DetailItem
            label="Main Price"
            value={formatMoney(valueOf(product, ["main_price"], 0), currency)}
          />
          <DetailItem
            label="Cost Price"
            value={formatMoney(valueOf(product, ["cost_price"], 0), currency)}
          />
          <DetailItem
            label="Sale Price"
            value={formatMoney(valueOf(product, ["sale_price"], 0), currency)}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold text-slate-400 sm:grid-cols-4">
          <div className="inline-flex items-center gap-2"><Hash size={14} /> SKU</div>
          <div className="inline-flex items-center gap-2"><Tag size={14} /> Category</div>
          <div className="inline-flex items-center gap-2"><Layers size={14} /> Model</div>
          <div className="inline-flex items-center gap-2"><BadgeDollarSign size={14} /> Pricing</div>
          <div className="inline-flex items-center gap-2"><Boxes size={14} /> Variants</div>
        </div>
      </LocalProductInfoCard>
    </div>
  );
}
