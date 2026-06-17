import React, { useEffect, useMemo, useState } from "react";
import API from "../../../../config/api";

const DarazToDarazTransferPreviewPage = () => {
  const [sourceAccountCode, setSourceAccountCode] = useState("");
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [accountDetails, setAccountDetails] = useState([]);
  const [allAccounts, setAllAccounts] = useState([]);
  const [editableProducts, setEditableProducts] = useState([]);

  const [transferLoading, setTransferLoading] = useState(false);
  const [transferResult, setTransferResult] = useState(null);

  useEffect(() => {
    fetchAccounts();

    const saved = JSON.parse(
      localStorage.getItem("daraz_transfer_preview") || "{}"
    );

    const savedProducts = saved.products || [];

    setSourceAccountCode(saved.source_account_code || "");
    setSelectedAccounts(saved.target_accounts || saved.accounts || []);
    setAccountDetails(saved.account_details || []);

    const editable = savedProducts.map((product) => {
      const images = extractImages(product).slice(0, 6);
      const attrs = parseJson(product.attributes_json) || {};
      const raw = parseJson(product.raw_json) || {};
      const firstSku = product.skus?.[0] || raw.skus?.[0] || {};

      return {
        id: product.id,
        account_code: product.account_code,
        item_id: product.item_id,

        title: product.name || attrs.name || raw.attributes?.name || "",
        brand:
          product.brand ||
          attrs.brand ||
          raw.attributes?.brand ||
          "No Brand",

        category_id:
          product.primary_category ||
          raw.primary_category ||
          "",

        price:
          product.price ||
          firstSku.price ||
          "",

        sku:
          product.seller_sku ||
          product.sku ||
          firstSku.SellerSku ||
          firstSku.seller_sku ||
          "",

        description_html:
          product.description ||
          attrs.description ||
          raw.attributes?.description ||
          product.short_description ||
          "",

        short_description_html:
          product.short_description ||
          attrs.short_description ||
          raw.attributes?.short_description ||
          "",

        image_links: images,

        white_background_image:
          attrs.promotion_whitebkg_image?.[0] ||
          raw.attributes?.promotion_whitebkg_image?.[0] ||
          images[0] ||
          "",

        material:
          attrs.material ||
          raw.attributes?.material ||
          "Stainless Steel",

        microwave_safe:
          attrs.microwave_safe ||
          raw.attributes?.microwave_safe ||
          "Yes",
      };
    });

    setEditableProducts(editable);
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await API.get("/daraz/accounts");
      const accounts = res.data?.accounts || res.data?.data || res.data || [];
      setAllAccounts(Array.isArray(accounts) ? accounts : []);
    } catch (err) {
      console.error("Accounts fetch error:", err);
      setAllAccounts([]);
    }
  };

  const parseJson = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const extractImages = (product) => {
    const images = [];

    const addImage = (url) => {
      if (url && typeof url === "string" && url.startsWith("http")) {
        images.push(url.trim());
      }
    };

    const parseValue = (value) => {
      if (!value) return;

      if (Array.isArray(value)) {
        value.forEach((img) => {
          if (typeof img === "string") addImage(img);
          else if (img?.url) addImage(img.url);
          else if (img?.image_url) addImage(img.image_url);
        });
        return;
      }

      if (typeof value === "string") {
        if (value.trim().startsWith("http")) {
          addImage(value.trim());
          return;
        }

        try {
          const parsed = JSON.parse(value);

          if (Array.isArray(parsed)) {
            parsed.forEach((img) => {
              if (typeof img === "string") addImage(img);
              else if (img?.url) addImage(img.url);
              else if (img?.image_url) addImage(img.image_url);
            });
          }

          if (parsed?.images) parsed.images.forEach(addImage);
          if (parsed?.marketImages) parsed.marketImages.forEach(addImage);

          if (parsed?.attributes?.promotion_whitebkg_image) {
            parsed.attributes.promotion_whitebkg_image.forEach(addImage);
          }
        } catch {
          value.split(",").forEach((url) => addImage(url.trim()));
        }
      }
    };

    parseValue(product.images_json);
    parseValue(product.images);
    parseValue(product.raw_json);

    return [...new Set(images)];
  };

  const updateProduct = (productId, field, value) => {
    setEditableProducts((prev) =>
      prev.map((product) =>
        product.id === productId ? { ...product, [field]: value } : product
      )
    );
  };

  const updateImage = (productId, index, value) => {
    setEditableProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product;

        const images = [...product.image_links];
        images[index] = value;

        return {
          ...product,
          image_links: images.slice(0, 6),
        };
      })
    );
  };

  const addImage = (productId) => {
    setEditableProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product;

        if (product.image_links.length >= 6) {
          alert("Maximum 6 images only allowed");
          return product;
        }

        return {
          ...product,
          image_links: [...product.image_links, ""],
        };
      })
    );
  };

  const removeImage = (productId, index) => {
    setEditableProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product;

        return {
          ...product,
          image_links: product.image_links.filter((_, i) => i !== index),
        };
      })
    );
  };

  const toggleAccount = (accountCode) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(accountCode)) {
        return prev.filter((code) => code !== accountCode);
      }

      return [...prev, accountCode];
    });
  };

  const disabledReasons = useMemo(() => {
    const reasons = [];

    if (!sourceAccountCode) reasons.push("Source account missing.");
    if (!selectedAccounts.length) {
      reasons.push("Select at least one target account.");
    }
    if (!editableProducts.length) reasons.push("No product selected.");

    editableProducts.forEach((product) => {
      const name = product.title || `Product ID ${product.id}`;

      if (!product.title) reasons.push(`${name}: Product title missing.`);
      if (!product.category_id) reasons.push(`${name}: Category ID missing.`);
      if (!product.description_html) reasons.push(`${name}: Description missing.`);
      if (product.image_links.filter(Boolean).length < 1) {
        reasons.push(`${name}: At least one image required.`);
      }
      if (!product.material) reasons.push(`${name}: Material missing.`);
      if (!product.microwave_safe) {
        reasons.push(`${name}: Microwave Safe value missing.`);
      }
    });

    return reasons;
  }, [sourceAccountCode, selectedAccounts, editableProducts]);

  const submitDisabled = disabledReasons.length > 0;

  const submitTransfer = async () => {
    if (submitDisabled) {
      alert("Please check required fields.");
      return;
    }

    try {
      setTransferLoading(true);
      setTransferResult(null);

      const payload = {
        source_account_code: sourceAccountCode,
        target_account_codes: selectedAccounts,
        product_ids: editableProducts.map((p) => p.id),

        customized_products: editableProducts.map((p) => ({
          id: p.id,
          title: p.title,
          brand: p.brand,
          category_id: p.category_id,
          price: p.price,
          sku: p.sku,
          description_html: p.description_html,
          short_description_html: p.short_description_html,
          image_links: p.image_links.filter(Boolean).slice(0, 6),
          white_background_image: p.white_background_image,
          category_attributes: {
            material: p.material,
            microwave_safe: p.microwave_safe,
          },
        })),
      };

      const res = await API.post("/daraz-to-daraz/transfer", payload);
      setTransferResult(res.data);
    } catch (err) {
      setTransferResult(
        err.response?.data || {
          success: false,
          message: "Daraz to Daraz transfer failed",
        }
      );
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen p-6">
      <div className="max-w-[1500px] mx-auto">
        <h1 className="text-2xl font-semibold text-[#fbb931] mb-6">
          Daraz to Daraz Transfer Preview
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-1 space-y-4">
            {editableProducts.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400">
                No Daraz product selected.
              </div>
            ) : (
              editableProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4"
                >
                  <h2 className="text-sm font-semibold text-[#fbb931] mb-4">
                    Product Preview
                  </h2>

                  <label className="block text-xs mb-2">Product Name</label>
                  <input
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm mb-4"
                    value={product.title}
                    onChange={(e) =>
                      updateProduct(product.id, "title", e.target.value)
                    }
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs mb-2">Category ID</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.category_id}
                        onChange={(e) =>
                          updateProduct(product.id, "category_id", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-2">Brand</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.brand}
                        onChange={(e) =>
                          updateProduct(product.id, "brand", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs mb-2">Price</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.price}
                        onChange={(e) =>
                          updateProduct(product.id, "price", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-2">SKU</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.sku}
                        onChange={(e) =>
                          updateProduct(product.id, "sku", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="block text-xs mb-2">Material</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.material}
                        onChange={(e) =>
                          updateProduct(product.id, "material", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label className="block text-xs mb-2">Microwave Safe</label>
                      <input
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                        value={product.microwave_safe}
                        onChange={(e) =>
                          updateProduct(product.id, "microwave_safe", e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs mb-2">
                      White Background Image
                    </label>
                    <input
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                      value={product.white_background_image}
                      onChange={(e) =>
                        updateProduct(
                          product.id,
                          "white_background_image",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <label className="block text-xs mb-2">Description</label>
                    <textarea
                      rows="8"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm"
                      value={product.description_html}
                      onChange={(e) =>
                        updateProduct(
                          product.id,
                          "description_html",
                          e.target.value
                        )
                      }
                    />
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs">Images</label>

                      <button
                        type="button"
                        onClick={() => addImage(product.id)}
                        className="text-xs text-[#fbb931]"
                      >
                        + Add Image
                      </button>
                    </div>

                    {product.image_links.map((link, index) => (
                      <div key={index} className="mb-3">
                        <div className="flex gap-2">
                          <input
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm"
                            value={link}
                            onChange={(e) =>
                              updateImage(product.id, index, e.target.value)
                            }
                          />

                          <button
                            type="button"
                            onClick={() => removeImage(product.id, index)}
                            className="px-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20"
                          >
                            ×
                          </button>
                        </div>

                        {link && (
                          <img
                            src={link}
                            alt="product"
                            className="w-full h-32 object-cover rounded-xl border border-slate-800 mt-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-semibold mb-3">Transfer Accounts</h3>

              <p className="text-xs text-slate-400 mb-3">
                Source Account:{" "}
                <span className="text-[#fbb931]">
                  {sourceAccountCode || "Missing"}
                </span>
              </p>

              <div className="mt-4">
                <h4 className="text-xs font-semibold text-slate-300 mb-2">
                  Select Target Accounts
                </h4>

                {allAccounts.length === 0 ? (
                  <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                    No Daraz accounts found. Check /daraz/accounts API.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    {allAccounts
                      .filter(
                        (account) => account.account_code !== sourceAccountCode
                      )
                      .map((account) => {
                        const checked = selectedAccounts.includes(
                          account.account_code
                        );

                        return (
                          <label
                            key={account.account_code}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs ${
                              checked
                                ? "bg-[#fbb931]/10 border-[#fbb931] text-[#fbb931]"
                                : "bg-slate-950 border-slate-800 text-slate-400"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() =>
                                toggleAccount(account.account_code)
                              }
                            />

                            {account.account_name || account.account_code}
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>

              {accountDetails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {accountDetails.map((account) => (
                    <span
                      key={account.account_code}
                      className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-3 py-2"
                    >
                      {account.account_name || account.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {submitDisabled && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl p-3">
                <div className="font-semibold mb-2">
                  Transfer button disabled because:
                </div>

                <ul className="list-disc pl-5 space-y-1">
                  {disabledReasons.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {transferResult && (
              <div
                className={`border rounded-2xl p-4 ${
                  transferResult.success
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-red-500/30 bg-red-500/10"
                }`}
              >
                <h3
                  className={`text-sm font-semibold mb-2 ${
                    transferResult.success ? "text-green-300" : "text-red-300"
                  }`}
                >
                  Transfer Result
                </h3>

                <pre className="text-xs whitespace-pre-wrap overflow-x-auto text-slate-300">
                  {JSON.stringify(transferResult, null, 2)}
                </pre>
              </div>
            )}

            <button
              type="button"
              onClick={submitTransfer}
              disabled={submitDisabled || transferLoading}
              className="w-full px-6 py-3 rounded-xl bg-[#fbb931] text-slate-950 font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {transferLoading ? "Transferring..." : "Submit Daraz Transfer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DarazToDarazTransferPreviewPage;