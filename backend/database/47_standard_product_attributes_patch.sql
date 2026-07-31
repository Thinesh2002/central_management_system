-- =====================================================================
-- 47_standard_product_attributes_patch.sql
-- Seeds standard spec-sheet attributes (Colour, Material, Brand,
-- Manufacturer, Warranty) so they're always available to pick from on
-- the Product/Variant Attributes panel without needing to create them
-- ad hoc. input_type is 'text' since that panel now only captures a
-- free-text custom_value per attribute, not a picklist of values.
--
-- Run this after 46_model_code_scoped_unique_patch.sql.
-- =====================================================================

USE cm_product_management;

INSERT INTO attributes (name, slug, input_type)
VALUES
  ('Colour', 'colour', 'text'),
  ('Material', 'material', 'text'),
  ('Brand', 'brand', 'text'),
  ('Manufacturer', 'manufacturer', 'text'),
  ('Warranty', 'warranty', 'text')
ON DUPLICATE KEY UPDATE name = VALUES(name);
