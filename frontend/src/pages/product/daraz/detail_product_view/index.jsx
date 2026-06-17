import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import API from "../../../../config/api";
import {
  ArrowLeft,
  Truck,
  Package,
  Layers,
  Info,
  Calendar,
  Tag,
  Store,
  ImageOff
} from "lucide-react";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImg, setActiveImg] = useState("");
  const [selectedSku, setSelectedSku] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

const fetchProduct = async () => {
  setLoading(true);

  try {
    const res = await API.get(`/daraz/products/${id}`);

    const data = res.data.product || res.data.data || res.data;

    setProduct(data);

    const firstImage =
      data?.images?.[0]?.image_url ||
      data?.images?.[0] ||
      "";

    setActiveImg(firstImage);
    setSelectedSku(data?.skus?.[0] || null);
  } catch (err) {
    console.error("Product details fetch error:", err);
    setProduct(null);
  } finally {
    setLoading(false);
  }
};

  const images = useMemo(() => {
    if (!product?.images) return [];

    return product.images
      .map((img) => {
        if (typeof img === "string") return img;
        return img.image_url || img.url || "";
      })
      .filter(Boolean);
  }, [product]);

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const statusClass =
    product?.status === "Active"
      ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
      : product?.status === "InActive"
      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
      : "text-amber-400 bg-amber-500/10 border-amber-500/20";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-slate-700 border-t-slate-200 animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-slate-400">
        Product Not Found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 px-4 py-5 md:px-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all"
        >
          <span className="p-1.5 rounded-md bg-[#0f172a] border border-slate-800">
            <ArrowLeft size={15} />
          </span>
          Back to Products
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="aspect-square flex items-center justify-center p-5">
                {activeImg ? (
                  <img
                    src={activeImg}
                    alt={product.name || "Product"}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <ImageOff size={34} />
                    <span className="text-sm">No Image</span>
                  </div>
                )}
              </div>

              {images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto p-3 border-t border-slate-800">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => setActiveImg(img)}
                      className={`w-16 h-16 rounded-lg border flex-shrink-0 bg-slate-900 p-1 transition-all ${
                        activeImg === img
                          ? "border-slate-300"
                          : "border-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-contain rounded-md"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-5">
            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide text-slate-300 bg-slate-800 border border-slate-700">
                  {product.brand || "No Brand"}
                </span>

                <span
                  className={`px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${statusClass}`}
                >
                  {product.status || "Unknown"}
                </span>
              </div>

              <h1 className="text-xl md:text-2xl font-semibold text-white leading-snug">
                {product.name || "No Product Name"}
              </h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-5">
                <InfoCard
                  icon={<Layers size={16} />}
                  label="Item ID"
                  value={product.item_id || "-"}
                />

                <InfoCard
                  icon={<Store size={16} />}
                  label="Account"
                  value={product.account_code || "-"}
                />

                <InfoCard
                  icon={<Calendar size={16} />}
                  label="Created Date"
                  value={formatDate(product.created_at)}
                />

                <InfoCard
                  icon={<Tag size={16} />}
                  label="Category"
                  value={product.primary_category || "-"}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-[#0f172a] border border-slate-800 rounded-xl p-5">
                <p className="text-[11px] uppercase tracking-widest text-slate-500 mb-2">
                  Price
                </p>

                <div className="text-3xl font-bold text-white">
                  Rs. {selectedSku?.price || product.price || "0"}
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex items-center gap-3">
                <Package size={19} className="text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-500 uppercase">
                    Stock
                  </p>
                  <p className="text-sm font-semibold text-white">
                    {selectedSku?.available || 0} Units
                  </p>
                </div>
              </div>

              <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5 flex items-center gap-3">
                <Truck size={19} className="text-slate-400" />
                <div>
                  <p className="text-[11px] text-slate-500 uppercase">
                    Delivery
                  </p>
                  <p className="text-sm font-semibold text-white">
                    Standard
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[#0f172a] border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                <Info size={14} />
                Variations
              </h4>

              {product.skus?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {product.skus.map((sku, index) => (
                    <button
                      key={sku.id || index}
                      onClick={() => setSelectedSku(sku)}
                      className={`px-4 py-2 text-xs rounded-lg border font-medium transition-all ${
                        selectedSku?.id === sku.id
                          ? "border-slate-300 bg-slate-700 text-white"
                          : "border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      {sku.seller_sku
                        ? sku.seller_sku.split("-").pop()
                        : `SKU ${index + 1}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No variations found</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-7 bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800">
            <h3 className="text-base font-semibold text-white">
              Product Description
            </h3>
          </div>

          <div className="bg-white text-black p-4 md:p-7">
            <div
              className="daraz-raw-content"
              dangerouslySetInnerHTML={{
                __html:
                  product.description ||
                  "<p>No product description available.</p>"
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        .daraz-raw-content img {
          display: block;
          max-width: 100%;
          height: auto;
          margin: 10px auto;
        }

        .daraz-raw-content p,
        .daraz-raw-content div {
          font-family: inherit;
          margin-bottom: 0;
        }

        .daraz-raw-content ul {
          list-style-type: disc;
          padding-left: 20px;
        }

        ::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 20px;
        }

        ::-webkit-scrollbar-track {
          background: #0f172a;
        }
      `}</style>
    </div>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3 flex items-center gap-3">
      <div className="text-slate-500">{icon}</div>

      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-sm text-slate-300 truncate">{value}</p>
      </div>
    </div>
  );
}