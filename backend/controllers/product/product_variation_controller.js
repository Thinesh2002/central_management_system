const Variation = require("../../models/product/product_variation_model");

/* ================= CREATE ================= */
const createVariation = async (req, res) => {
  try {

    const {
      parent_sku,
      sku,
      color,
      size,
      material,
      weight,
      weight_unit,
      length,
      length_unit,
      width,
      width_unit,
      height,
      height_unit,
      capacity,
      capacity_unit,
      power,
      voltage,
      wattage,
      shape,
      style,
      pattern,
      cost_price,
      selling_price,
      status
    } = req.body;

    if (!sku || !sku.trim()) {
      return res.status(400).json({ success:false, message:"SKU is required" });
    }

    if (!parent_sku || !parent_sku.trim()) {
      return res.status(400).json({ success:false, message:"Parent SKU is required" });
    }

    if (sku.length > 100) {
      return res.status(400).json({ success:false, message:"SKU must be 100 characters or less" });
    }

    const skuExists = await Variation.skuExists(sku.trim());

    if (skuExists) {
      return res.status(409).json({
        success:false,
        message:`SKU '${sku}' already exists`
      });
    }

    const parentExists = await Variation.parentSkuExists(parent_sku.trim());

    if (!parentExists) {
      return res.status(400).json({
        success:false,
        message:`Parent product '${parent_sku}' does not exist`
      });
    }

    await Variation.create({
      parent_sku: parent_sku.trim(),
      sku: sku.trim(),
      color: color?.trim() || null,
      size: size?.trim() || null,
      material: material?.trim() || null,
      weight: weight || null,
      weight_unit: weight_unit || null,
      length: length || null,
      length_unit: length_unit || null,
      width: width || null,
      width_unit: width_unit || null,
      height: height || null,
      height_unit: height_unit || null,
      capacity: capacity || null,
      capacity_unit: capacity_unit || null,
      power: power || null,
      voltage: voltage || null,
      wattage: wattage || null,
      shape: shape?.trim() || null,
      style: style?.trim() || null,
      pattern: pattern?.trim() || null,
      cost_price: Number(cost_price) || 0,
      selling_price: Number(selling_price) || 0,
      status: status ?? 1
    });

    res.status(201).json({
      success:true,
      message:"Variation created successfully",
      data:{ sku: sku.trim() }
    });

  }
  catch(err){

    console.error("CREATE VARIATION ERROR:",err);

    if (err.code === "ER_DUP_ENTRY"){
      return res.status(409).json({
        success:false,
        message:"Duplicate SKU"
      });
    }

    res.status(500).json({
      success:false,
      message:"Failed to create variation",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });

  }

};


/* ================= GET ALL ================= */
const getAllVariations = async (req,res) => {

  try{

    const variations = await Variation.getAll();

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


/* ================= GET BY SKU ================= */
const getVariationBySku = async (req,res) => {

  try{

    const { sku } = req.params;

    if (!sku){
      return res.status(400).json({
        success:false,
        message:"SKU is required"
      });
    }

    const variation = await Variation.getBySku(sku);

    if (!variation){
      return res.status(404).json({
        success:false,
        message:`Variation '${sku}' not found`
      });
    }

    res.json({
      success:true,
      data: variation
    });

  }
  catch(err){

    console.error("GET VARIATION ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to retrieve variation"
    });

  }

};


/* ================= DELETE ================= */
const deleteVariation = async (req,res) => {

  try{

    const { sku } = req.params;

    if (!sku){
      return res.status(400).json({
        success:false,
        message:"SKU is required"
      });
    }

    const existing = await Variation.getBySku(sku);

    if (!existing){
      return res.status(404).json({
        success:false,
        message:`Variation '${sku}' not found`
      });
    }

    const hasInventory = await Variation.hasInventory(sku);

    if (hasInventory){
      return res.status(409).json({
        success:false,
        message:"Cannot delete variation with inventory"
      });
    }

    await Variation.delete(sku);

    res.json({
      success:true,
      message:"Variation deleted successfully"
    });

  }
  catch(err){

    console.error("DELETE VARIATION ERROR:",err);

    res.status(500).json({
      success:false,
      message:"Failed to delete variation"
    });

  }

};


module.exports = {
  createVariation,
  getAllVariations,
  getVariationBySku,
  deleteVariation
};