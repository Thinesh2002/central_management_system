const { createGenericModel } = require("./_shared/generic_table_model");

module.exports = createGenericModel("customers", {
  dateColumn: "created_at",
  defaultSort: "id",
});
