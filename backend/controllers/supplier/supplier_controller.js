const supplierModel = require("../../models/supplier/supplier_model");


exports.createSupplier = async (req, res) => {
  try {
    const { supplier_name } = req.body;

    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplierId = await supplierModel.createSupplier(req.body);

    return res.status(201).json({
      success: true,
      message: "Supplier created successfully",
      supplier_id: supplierId,
    });
  } catch (error) {
    console.error("Create supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier",
      error: error.message,
    });
  }
};

exports.getAllSuppliers = async (req, res) => {
  try {
    const { search, status } = req.query;

    const suppliers = await supplierModel.getAllSuppliers({
      search,
      status,
    });

    return res.json({
      success: true,
      count: suppliers.length,
      data: suppliers,
    });
  } catch (error) {
    console.error("Get suppliers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get suppliers",
      error: error.message,
    });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await supplierModel.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    return res.json({
      success: true,
      data: supplier,
    });
  } catch (error) {
    console.error("Get supplier by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get supplier",
      error: error.message,
    });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_name } = req.body;

    if (!supplier_name) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required",
      });
    }

    const supplier = await supplierModel.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await supplierModel.updateSupplier(id, req.body);

    return res.json({
      success: true,
      message: "Supplier updated successfully",
    });
  } catch (error) {
    console.error("Update supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier",
      error: error.message,
    });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = await supplierModel.getSupplierById(id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await supplierModel.deleteSupplier(id);

    return res.json({
      success: true,
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete supplier",
      error: error.message,
    });
  }
};

/* =========================
   SUPPLIER PRODUCT CONTROLLER
========================= */

exports.createSupplierProduct = async (req, res) => {
  try {
    const { supplier_id, sku } = req.body;

    if (!supplier_id || !sku) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID and SKU are required",
      });
    }

    const supplier = await supplierModel.getSupplierById(supplier_id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    const supplierProductId = await supplierModel.createSupplierProduct(req.body);

    return res.status(201).json({
      success: true,
      message: "Supplier product created successfully",
      supplier_product_id: supplierProductId,
    });
  } catch (error) {
    console.error("Create supplier product error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This SKU is already assigned to this supplier",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create supplier product",
      error: error.message,
    });
  }
};

exports.getSupplierProducts = async (req, res) => {
  try {
    const { search, supplier_id } = req.query;

    const products = await supplierModel.getSupplierProducts({
      search,
      supplier_id,
    });

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get supplier products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get supplier products",
      error: error.message,
    });
  }
};

exports.getSupplierProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await supplierModel.getSupplierProductById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Supplier product not found",
      });
    }

    return res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get supplier product by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get supplier product",
      error: error.message,
    });
  }
};

exports.getSupplierProductBySku = async (req, res) => {
  try {
    const { sku } = req.params;

    const products = await supplierModel.getSupplierProductBySku(sku);

    return res.json({
      success: true,
      sku,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Get supplier product by SKU error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get supplier product by SKU",
      error: error.message,
    });
  }
};

exports.updateSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplier_id, sku } = req.body;

    if (!supplier_id || !sku) {
      return res.status(400).json({
        success: false,
        message: "Supplier ID and SKU are required",
      });
    }

    const existingProduct = await supplierModel.getSupplierProductById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Supplier product not found",
      });
    }

    const supplier = await supplierModel.getSupplierById(supplier_id);

    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: "Supplier not found",
      });
    }

    await supplierModel.updateSupplierProduct(id, req.body);

    return res.json({
      success: true,
      message: "Supplier product updated successfully",
    });
  } catch (error) {
    console.error("Update supplier product error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This SKU is already assigned to this supplier",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update supplier product",
      error: error.message,
    });
  }
};

exports.deleteSupplierProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await supplierModel.getSupplierProductById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Supplier product not found",
      });
    }

    await supplierModel.deleteSupplierProduct(id);

    return res.json({
      success: true,
      message: "Supplier product deleted successfully",
    });
  } catch (error) {
    console.error("Delete supplier product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete supplier product",
      error: error.message,
    });
  }
};

exports.createShipment = async (req, res) => {
  try {
    const { supplier_id, shipment_code } = req.body;

    if (!supplier_id || !shipment_code) {
      return res.status(400).json({
        success: false,
        message: "Supplier and shipment code are required",
      });
    }

    const shipmentId = await supplierModel.createShipment(req.body);

    return res.status(201).json({
      success: true,
      message: "Shipment created successfully",
      shipment_id: shipmentId,
    });
  } catch (error) {
    console.error("Create shipment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create shipment",
      error: error.message,
    });
  }
};

exports.getShipments = async (req, res) => {
  try {
    const shipments = await supplierModel.getShipments(req.query);

    return res.json({
      success: true,
      count: shipments.length,
      data: shipments,
    });
  } catch (error) {
    console.error("Get shipments error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get shipments",
      error: error.message,
    });
  }
};

exports.getShipmentById = async (req, res) => {
  try {
    const shipment = await supplierModel.getShipmentById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const orders = await supplierModel.getShipmentOrders(req.params.id);

    return res.json({
      success: true,
      data: {
        ...shipment,
        orders,
      },
    });
  } catch (error) {
    console.error("Get shipment by id error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get shipment",
      error: error.message,
    });
  }
};

exports.updateShipment = async (req, res) => {
  try {
    const shipment = await supplierModel.getShipmentById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    await supplierModel.updateShipment(req.params.id, req.body);

    return res.json({
      success: true,
      message: "Shipment updated successfully",
    });
  } catch (error) {
    console.error("Update shipment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shipment",
      error: error.message,
    });
  }
};

exports.deleteShipment = async (req, res) => {
  try {
    const shipment = await supplierModel.getShipmentById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    await supplierModel.deleteShipment(req.params.id);

    return res.json({
      success: true,
      message: "Shipment deleted successfully",
    });
  } catch (error) {
    console.error("Delete shipment error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete shipment",
      error: error.message,
    });
  }
};

exports.createShipmentOrder = async (req, res) => {
  try {
    const { sku, order_qty } = req.body;

    if (!sku || !order_qty) {
      return res.status(400).json({
        success: false,
        message: "SKU and order quantity are required",
      });
    }

    const shipment = await supplierModel.getShipmentById(req.params.id);

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: "Shipment not found",
      });
    }

    const orderId = await supplierModel.createShipmentOrder(
      req.params.id,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Shipment order created successfully",
      order_id: orderId,
    });
  } catch (error) {
    console.error("Create shipment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create shipment order",
      error: error.message,
    });
  }
};

exports.getShipmentOrders = async (req, res) => {
  try {
    const orders = await supplierModel.getShipmentOrders(req.params.id);

    return res.json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Get shipment orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get shipment orders",
      error: error.message,
    });
  }
};

exports.updateShipmentOrder = async (req, res) => {
  try {
    const order = await supplierModel.getShipmentOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Shipment order not found",
      });
    }

    await supplierModel.updateShipmentOrder(req.params.orderId, req.body);

    return res.json({
      success: true,
      message: "Shipment order updated successfully",
    });
  } catch (error) {
    console.error("Update shipment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update shipment order",
      error: error.message,
    });
  }
};

exports.deleteShipmentOrder = async (req, res) => {
  try {
    const order = await supplierModel.getShipmentOrderById(req.params.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Shipment order not found",
      });
    }

    await supplierModel.deleteShipmentOrder(req.params.orderId);

    return res.json({
      success: true,
      message: "Shipment order deleted successfully",
    });
  } catch (error) {
    console.error("Delete shipment order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete shipment order",
      error: error.message,
    });
  }
};