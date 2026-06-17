const axios = require("axios");

const API_URL = `${process.env.WC_API_URL}/products`;

const auth = {
  username: process.env.WC_CONSUMER_KEY,
  password: process.env.WC_CONSUMER_SECRET,
};

/* ================= GET ALL PRODUCTS ================= */
exports.getAllProducts = async (req, res) => {
  try {
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get(
        `${API_URL}?per_page=100&page=${page}`,
        { auth }
      );

      if (!response.data.length) {
        hasMore = false;
      } else {
        allProducts.push(...response.data);
        page++;
      }
    }

    // 🔥 FILTER BAD PRODUCTS
    const filteredProducts = allProducts.filter(
      (p) =>
        p.name !== "Default Product" &&
        p.price !== "0" &&
        p.images.length > 0
    );

    res.json(filteredProducts);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
};

/* ================= GET SINGLE PRODUCT ================= */
exports.getProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${API_URL}/${id}`, { auth });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= CREATE PRODUCT ================= */
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      description,
      short_description,
      categoryId,
      image,
      type, // "simple" or "variable"
      attributes, // [{ name: "Color", options: ["Red","Blue"] }]
      variations, // [{ price: 100, attributes: [{ name:"Color", option:"Red"}]}]
    } = req.body;

    /* ================= VALIDATION ================= */
    if (!name) {
      return res.status(400).json({ error: "Product name is required" });
    }

    if (!image) {
      return res.status(400).json({ error: "Product image is required" });
    }

    if (type !== "variable" && (!price || price === "0")) {
      return res.status(400).json({ error: "Valid price is required" });
    }

    /* ================= BASE PRODUCT ================= */
    const productData = {
      name,
      type: type === "variable" ? "variable" : "simple",
      regular_price: type === "variable" ? "" : String(price),
      description: description || "",
      short_description: short_description || "",
      categories: categoryId ? [{ id: categoryId }] : [],
      images: [{ src: image }],

      meta_data: [
        {
          key: "rank_math_focus_keyword",
          value: name,
        },
        {
          key: "_yoast_wpseo_title",
          value: `${name} Best Price in Sri Lanka`,
        },
        {
          key: "_yoast_wpseo_metadesc",
          value: `Buy ${name} online at best price in Sri Lanka.`,
        },
      ],
    };

    /* ================= ADD ATTRIBUTES (VARIABLE ONLY) ================= */
    if (type === "variable" && attributes?.length > 0) {
      productData.attributes = attributes.map((attr, index) => ({
        name: attr.name,
        position: index,
        visible: true,
        variation: true,
        options: attr.options,
      }));
    }

    /* ================= CREATE PRODUCT ================= */
    const productResponse = await axios.post(API_URL, productData, { auth });

    const productId = productResponse.data.id;

    /* ================= CREATE VARIATIONS ================= */
    if (type === "variable" && variations?.length > 0) {
      const variationPromises = variations.map((v) =>
        axios.post(
          `${API_URL}/${productId}/variations`,
          {
            regular_price: String(v.price),
            attributes: v.attributes, // [{ name: "Color", option: "Red" }]
          },
          { auth }
        )
      );

      await Promise.all(variationPromises);
    }

    /* ================= FINAL RESPONSE ================= */
    const finalProduct = await axios.get(`${API_URL}/${productId}`, { auth });

    res.json(finalProduct.data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
};

/* ================= UPDATE PRODUCT ================= */
/* ================= UPDATE PRODUCT ================= */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, slug, sku, regular_price, sale_price, 
      stock_quantity, description, short_description, 
      status, categories, images, attributes, meta_data 
    } = req.body;

    // WooCommerce structure-ku data-va mathurom
    const updatedData = {
      name,
      slug,
      sku,
      regular_price: String(regular_price),
      sale_price: String(sale_price),
      stock_quantity: Number(stock_quantity),
      description,
      short_description,
      status,
      categories: categories || [],
      images: images || [],
      attributes: attributes || [],
      meta_data: meta_data || []
    };

    console.log("Updating Product ID:", id);

    const response = await axios.put(`${API_URL}/${id}`, updatedData, { auth });

    res.json(response.data);
  } catch (error) {
    console.error("Update Error Details:", error.response?.data || error.message);
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
};
/* ================= DELETE PRODUCT ================= */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.delete(`${API_URL}/${id}`, {
      auth,
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.response?.data || error.message,
    });
  }
};



/* ================= GET VARIATIONS ================= */
exports.getVariations = async (req, res) => {
  try {
    const { id } = req.params;
    const response = await axios.get(`${API_URL}/${id}/variations`, { auth });
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data || error.message,
    });
  }
};

/* ================= BATCH UPDATE VARIATIONS ================= */
exports.updateVariationsBatch = async (req, res) => {
  try {
    const { id } = req.params;
    // WooCommerce batch update uses POST to /variations/batch
    const response = await axios.post(
      `${API_URL}/${id}/variations/batch`, 
      req.body, 
      { auth }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= CREATE SINGLE VARIATION ================= */
exports.createVariation = async (req, res) => {
  try {
    const { id } = req.params;
    // req.body-la neenga default attributes kooda anuppalaam
    const response = await axios.post(`${API_URL}/${id}/variations`, req.body, { auth });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ================= DELETE SINGLE VARIATION ================= */
exports.deleteVariation = async (req, res) => {
  try {
    const { id, varId } = req.params; // Donu, id (1070) and varId (1341) edukurom
    
    // WooCommerce URL: /products/<id>/variations/<varId>
    const response = await axios.delete(`${API_URL}/${id}/variations/${varId}`, { 
      params: { force: true }, // Permanently delete panna idhu mukkiyam
      auth 
    });
    
    res.json(response.data);
  } catch (error) {
    console.error("Delete Variation Error:", error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
};