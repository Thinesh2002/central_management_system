import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API, { API_BASE_URL } from "../../../config/api";
import { supplierApi } from "../../../config/sub_api/supplierApi";
import SupplierProductModal from "../SupplierProductModal";
import SupplierDetailsPopup from "../SupplierDetails";
import ProductDetailsPopup from "../ProductDetails";

export default function SupplierProducts() {
  const [suppliers, setSuppliers] = useState([]);
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [productImageMap, setProductImageMap] = useState({});

  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [loading, setLoading] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [supplierPopupOpen, setSupplierPopupOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);

  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const getImageUrl = (sku, image) => {
    if (!sku || !image) return "";
    return `${API_BASE_URL}/images/productimage/${sku}/${image}`;
  };

  const loadProductImageBySku = async (sku) => {
    if (!sku || productImageMap[sku]) return;

    try {
      const productsRes = await API.get("/products");
      const products = productsRes.data?.data || [];

      const parentProduct = products.find(
        (item) =>
          item.parent_sku?.toLowerCase() === sku.toLowerCase()
      );

      if (parentProduct) {
        setProductImageMap((prev) => ({
          ...prev,
          [sku]: {
            product_name: parentProduct.product_name || "",
            image_url: getImageUrl(
              parentProduct.parent_sku,
              parentProduct.main_image
            ),
          },
        }));
        return;
      }

      for (const product of products) {
        if (!product.parent_sku) continue;

        try {
          const variationRes = await API.get(
            `/products/${product.parent_sku}/variations`
          );

          const variations = variationRes.data?.data || [];

          const variation = variations.find(
            (item) =>
              item.sku?.toLowerCase() === sku.toLowerCase()
          );

          if (variation) {
            const productName = [
              product.product_name,
              variation.color,
              variation.size,
            ]
              .filter(Boolean)
              .join(" - ");

            setProductImageMap((prev) => ({
              ...prev,
              [sku]: {
                product_name: productName || product.product_name || "",
                image_url: getImageUrl(
                  variation.sku,
                  variation.main_image
                ),
              },
            }));
            return;
          }
        } catch (error) {
          console.error("Variation image check error:", error);
        }
      }

      setProductImageMap((prev) => ({
        ...prev,
        [sku]: {
          product_name: "",
          image_url: "",
        },
      }));
    } catch (error) {
      console.error("Load product image by SKU error:", error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      const supplierRes = await supplierApi.getSuppliers({});
      const productRes = await supplierApi.getSupplierProducts({
        search,
        supplier_id: supplierId,
      });

      setSuppliers(supplierRes.data.data || []);
      setSupplierProducts(productRes.data.data || []);
    } catch (error) {
      console.error("Fetch supplier products error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, supplierId]);

  useEffect(() => {
    supplierProducts.forEach((item) => {
      loadProductImageBySku(item.sku);
    });
  }, [supplierProducts]);

  const handleDeleteProduct = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this SKU supplier link?"
      )
    ) {
      return;
    }

    try {
      await supplierApi.deleteSupplierProduct(id);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.message || "Delete failed");
    }
  };

  const openSupplierDetails = (item) => {
    setSelectedSupplier({
      id: item.supplier_id,
      supplier_name: item.supplier_name,
      contact_person: item.contact_person,
      phone: item.phone,
      email: item.email,
      address: item.address,
      status: item.status,
    });

    setSupplierPopupOpen(true);
  };

  const openProductDetails = (item) => {
    setSelectedProduct({
      ...item,
      product_name:
        productImageMap[item.sku]?.product_name ||
        item.product_name ||
        "",
      image_url:
        productImageMap[item.sku]?.image_url ||
        "",
    });

    setProductPopupOpen(true);
  };

  return (
    <div className="">
      <div className="space-y-6">
        <div className="">
          <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
            <div>
   
              <h1 className="text-3xl font-bold mt-1 text-yellow-400">
                Supplier Products
              </h1>

            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/suppliers"
                className="px-5 py-2 rounded-2xl bg-[#132238] border border-white/10 text-white font-semibold hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20 transition-all"
              >
                Back to Suppliers
              </Link>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="px-5 py-2 rounded-2xl bg-yellow-400 text-[#07111f] font-semibold shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/50 hover:scale-[1.03] transition-all"
              >
                + Assign SKU
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-[#0d1726] border border-white/10 p-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, product, supplier..."
              className="lg:col-span-2 bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white placeholder:text-slate-500 focus:border-yellow-400 focus:shadow-lg focus:shadow-yellow-400/20 transition-all"
            />

            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="bg-[#081221] border border-white/10 rounded-2xl px-4 py-3 outline-none text-white focus:border-yellow-400"
            >
              <option value="">All Suppliers</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.supplier_name}
                </option>
              ))}
            </select>

            <button
              onClick={fetchData}
              className="rounded-2xl bg-[#132238] border border-white/10 px-4 py-3 font-semibold text-white hover:border-yellow-400 hover:shadow-lg hover:shadow-yellow-400/20 transition-all"
            >
              Refresh
            </button>
          </div>
        </div>

        {loading && (
          <div className="text-center text-yellow-400 py-10">
            Loading supplier products...
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl bg-[#0d1726] border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#132238] text-slate-200">
                  <tr>
                    <th className="text-left p-4">Image</th>
                    <th className="text-left p-4">SKU</th>
                    <th className="text-left p-4">Product</th>
                    <th className="text-left p-4">Supplier</th>
                    <th className="text-left p-4">Purchase Price</th>
                    <th className="text-left p-4">Qty</th>
                    <th className="text-left p-4">Lead Time</th>
                    <th className="text-right p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {supplierProducts.map((item) => {
                    const imageUrl =
                      productImageMap[item.sku]?.image_url || "";

                    const productName =
                      productImageMap[item.sku]?.product_name ||
                      item.product_name ||
                      "-";

                    return (
                      <tr
                        key={item.id}
                        className="border-t border-white/10 hover:bg-white/[0.04] transition-all"
                      >
                        <td className="p-4">
                          <button
                            onClick={() => openProductDetails(item)}
                            className="w-14 h-14 rounded-xl bg-[#081221] border border-white/10 overflow-hidden flex items-center justify-center hover:border-yellow-400 transition-all"
                          >
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-slate-500">
                                No Image
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => openProductDetails(item)}
                            className="font-semibold text-yellow-400 hover:text-yellow-300 transition-all"
                          >
                            {item.sku}
                          </button>
                        </td>

                        <td className="p-4 max-w-[340px]">
                          <button
                            onClick={() => openProductDetails(item)}
                            className="text-left text-white hover:text-yellow-400 transition-all line-clamp-2"
                          >
                            {productName}
                          </button>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => openSupplierDetails(item)}
                            className="font-semibold text-yellow-400 hover:text-yellow-300 transition-all"
                          >
                            {item.supplier_name || "-"}
                          </button>

                          <div className="text-slate-400">
                            {item.phone || "-"}
                          </div>
                        </td>

                        <td className="p-4">
                          Rs.{" "}
                          {Number(
                            item.purchase_price || 0
                          ).toFixed(2)}
                        </td>

                        <td className="p-4">
                          {item.moq}
                        </td>

                        <td className="p-4">
                          {item.lead_time_days} Days
                        </td>

                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingProduct(item);
                                setProductModalOpen(true);
                              }}
                              className="px-3 py-2 rounded-xl bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400 hover:text-[#07111f] transition-all"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDeleteProduct(item.id)
                              }
                              className="px-3 py-2 rounded-xl bg-red-500/15 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {supplierProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="p-10 text-center text-slate-400"
                      >
                        No supplier product links found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <SupplierProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        editingProduct={editingProduct}
        suppliers={suppliers}
        onSuccess={fetchData}
      />

      <SupplierDetailsPopup
        open={supplierPopupOpen}
        onClose={() => setSupplierPopupOpen(false)}
        supplier={selectedSupplier}
      />

      <ProductDetailsPopup
        open={productPopupOpen}
        onClose={() => setProductPopupOpen(false)}
        product={selectedProduct}
      />
    </div>
  );
}