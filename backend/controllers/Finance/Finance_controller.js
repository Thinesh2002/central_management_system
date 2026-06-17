const {
  createIncome,
  getAllIncomes,
  getIncomeById,
  updateIncome,
  deleteIncome
} = require("../../models/finance/finance_model");

exports.storeIncome = async (req, res) => {
  try {
    const data = [
      req.body.source_name,
      req.body.order_number,
      req.body.gross_amount,
      req.body.platform_fee,
      req.body.commission,
      req.body.shipping_fee,
      req.body.net_amount,
      req.body.income_date,
      req.body.notes
    ];

    const result = await createIncome(data);

    res.status(201).json({
      success: true,
      message: "Income added successfully",
      insertId: result.insertId
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.getIncomes = async (req, res) => {
  try {
    const rows = await getAllIncomes();

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch incomes"
    });
  }
};



exports.getIncome = async (req, res) => {
  try {
    const { id } = req.params;
    const income = await getIncomeById(id);

    if (!income) {
      return res.status(404).json({
        success: false,
        message: "Income not found"
      });
    }

    res.json({
      success: true,
      data: income
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch income"
    });
  }
};




exports.updateIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      source_name,
      order_number,
      gross_amount,
      platform_fee,
      commission,
      shipping_fee,
      net_amount,
      income_date,
      notes
    } = req.body;

    const data = [
      source_name,
      order_number,
      gross_amount,
      platform_fee || 0,
      commission || 0,
      shipping_fee || 0,
      net_amount,
      income_date,
      notes || null
    ];

    const result = await updateIncome(id, data);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Income not found"
      });
    }

    res.json({
      success: true,
      message: "Income updated successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to update income"
    });
  }
};



exports.deleteIncome = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await deleteIncome(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Income not found"
      });
    }

    res.json({
      success: true,
      message: "Income deleted successfully"
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to delete income"
    });
  }
};



