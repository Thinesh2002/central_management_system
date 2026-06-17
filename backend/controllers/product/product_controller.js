const Product = require("../../models/product/product_model");
const ProductVariation = require("../../models/product/product_variation_model");

/* ================= CREATE PRODUCT ================= */
const createProduct = async (req, res) => {
  try {

    let {
      parent_sku,
      product_name,
      sub_category_code,
      brand,
      description
    } = req.body;

    parent_sku = parent_sku?.trim();
    product_name = product_name?.trim();
    sub_category_code = sub_category_code?.trim();
    brand = brand?.trim();
    description = description?.trim();

    if (!parent_sku) {
      return res.status(400).json({ success:false, message:"Parent SKU is required" });
    }

    if (!product_name) {
      return res.status(400).json({ success:false, message:"Product name is required" });
    }

    if (parent_sku.length > 100) {
      return res.status(400).json({ success:false, message:"SKU must be 100 characters or less" });
    }

    const skuExists = await Product.parentSkuExists(parent_sku);

    if (skuExists) {
      return res.status(409).json({
        success:false,
        message:"Parent SKU already exists"
      });
    }

    if (sub_category_code) {

      const subCategoryValid = await Product.subCategoryExists(sub_category_code);

      if (!subCategoryValid) {
        return res.status(400).json({
          success:false,
          message:`Sub category '${sub_category_code}' does not exist`
        });
      }

    }

    await Product.create({
      parent_sku,
      product_name,
      sub_category_code: sub_category_code || null,
      brand: brand || null,
      description: description || null
    });

    res.status(201).json({
      success:true,
      message:"Product created successfully",
      data:{ parent_sku }
    });

  }
  catch(err){

    console.error("CREATE PRODUCT ERROR:",err);

    if (err.code === "ER_DUP_ENTRY"){
      return res.status(409).json({
        success:false,
        message:"Duplicate product"
      });
    }

    res.status(500).json({
      success:false,
      message:"Failed to create product",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });

  }
};


/* ================= GET ALL PRODUCTS ================= */
const getAllProducts = async (req,res) => {

  try{

    const products = await Product.getAll();

    res.json({
      success:true,
      count: products.length,
      data: products
    });

  }
  catch(err){

    console.error("GET PRODUCTS ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to retrieve products"
    });

  }

};


/* ================= GET PRODUCT BY SKU ================= */
const getProductBySku = async (req,res) => {

  try{

    const { parentSku } = req.params;

    if (!parentSku){
      return res.status(400).json({
        success:false,
        message:"Parent SKU is required"
      });
    }

    const product = await Product.getBySku(parentSku);

    if (!product){
      return res.status(404).json({
        success:false,
        message:`Product '${parentSku}' not found`
      });
    }

    res.json({
      success:true,
      data:product
    });

  }
  catch(err){

    console.error("GET PRODUCT ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to retrieve product"
    });

  }

};


/* ================= UPDATE PRODUCT ================= */
const updateProduct = async (req,res) => {

  try{

    const { parentSku } = req.params;

    if (!parentSku){
      return res.status(400).json({
        success:false,
        message:"Parent SKU is required"
      });
    }

    const existing = await Product.getBySku(parentSku);

    if (!existing){
      return res.status(404).json({
        success:false,
        message:`Product '${parentSku}' not found`
      });
    }

    const data = { ...req.body };

    delete data.parent_sku;
    delete data.created_at;
    delete data.updated_at;

    if (Object.keys(data).length === 0){
      return res.status(400).json({
        success:false,
        message:"No fields provided for update"
      });
    }

    if (data.sub_category_code){

      data.sub_category_code = data.sub_category_code.trim();

      const validSubCategory = await Product.subCategoryExists(data.sub_category_code);

      if (!validSubCategory){
        return res.status(400).json({
          success:false,
          message:`Sub category '${data.sub_category_code}' does not exist`
        });
      }

    }

    if (data.product_name){
      data.product_name = data.product_name.trim();
    }

    if (data.brand){
      data.brand = data.brand.trim();
    }

    if (data.description){
      data.description = data.description.trim();
    }

    const result = await Product.update(parentSku,data);

    if (result.affectedRows === 0){
      return res.status(400).json({
        success:false,
        message:"No changes were made"
      });
    }

    res.json({
      success:true,
      message:"Product updated successfully"
    });

  }
  catch(err){

    console.error("UPDATE PRODUCT ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to update product",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });

  }

};


/* ================= DELETE PRODUCT ================= */
const deleteProduct = async (req,res) => {

  try{

    const { parentSku } = req.params;

    if (!parentSku){
      return res.status(400).json({
        success:false,
        message:"Parent SKU is required"
      });
    }

    const existing = await Product.getBySku(parentSku);

    if (!existing){
      return res.status(404).json({
        success:false,
        message:`Product '${parentSku}' not found`
      });
    }

    const hasVariations = await Product.hasVariations(parentSku);

    await Product.delete(parentSku);

    res.json({
      success:true,
      message: hasVariations
        ? "Product and its variations deleted successfully"
        : "Product deleted successfully"
    });

  }
  catch(err){

    console.error("DELETE PRODUCT ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to delete product"
    });

  }

};


/* ================= GET VARIATIONS ================= */
const getVariationsByProduct = async (req,res) => {

  try{

    const { parentSku } = req.params;

    if (!parentSku){
      return res.status(400).json({
        success:false,
        message:"Parent SKU is required"
      });
    }

    // Use ProductVariation model which includes images from product_images table
    const variations = await ProductVariation.getByParentSku(parentSku);

    res.json({
      success:true,
      count: variations.length,
      data: variations
    });

  }
  catch(err){

    console.error("GET VARIATIONS ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to retrieve variations"
    });

  }

};


/* ================= GENERATE SKU ================= */
const generateSku = async (req,res) => {

  try{

    const { sub_category_code } = req.query;

    if (!sub_category_code){
      return res.status(400).json({
        success:false,
        message:"Sub category code is required"
      });
    }

    const prefix = sub_category_code.toUpperCase();

    // Get all products with this prefix
    const sql = `
      SELECT parent_sku 
      FROM products 
      WHERE parent_sku LIKE ?
      ORDER BY parent_sku DESC
    `;

    const db = require("../../config/product_management_db");
    const [rows] = await db.query(sql, [`${prefix}%`]);

    // Find highest number
    let maxNum = 0;

    for (const row of rows) {
      const numPart = row.parent_sku
        .toUpperCase()
        .replace(prefix, "")
        .replace("-", "")
        .replace(/[^0-9]/g, "");

      const num = parseInt(numPart, 10);

      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }

    const nextNum = (maxNum + 1).toString().padStart(4, "0");
    const newSku = `${prefix}-${nextNum}`;

    res.json({
      success:true,
      data:{
        parent_sku: newSku,
        prefix,
        sequence: maxNum + 1
      }
    });

  }
  catch(err){

    console.error("GENERATE SKU ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to generate SKU"
    });

  }

};


/* ================= GENERATE VARIATION SKU ================= */
const generateVariationSku = async (req,res) => {

  try{

    const { parent_sku } = req.query;

    if (!parent_sku){
      return res.status(400).json({
        success:false,
        message:"Parent SKU is required"
      });
    }

    const prefix = parent_sku.toUpperCase();

    // Get all variations with this parent
    const db = require("../../config/product_management_db");
    const [rows] = await db.query(
      "SELECT sku FROM product_variations WHERE parent_sku = ? ORDER BY sku DESC",
      [parent_sku]
    );

    // Find highest variation number
    let maxNum = 0;

    for (const row of rows) {
      const match = row.sku.match(/-V(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }

    const nextNum = (maxNum + 1).toString().padStart(2, "0");
    const newSku = `${prefix}-V${nextNum}`;

    res.json({
      success:true,
      data:{
        sku: newSku,
        parent_sku: prefix,
        sequence: maxNum + 1
      }
    });

  }
  catch(err){

    console.error("GENERATE VARIATION SKU ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to generate variation SKU"
    });

  }

};


module.exports = {
  createProduct,
  getAllProducts,
  getProductBySku,
  updateProduct,
  deleteProduct,
  getVariationsByProduct,
  generateSku,
  generateVariationSku
};