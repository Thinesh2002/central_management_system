-- =====================================================================
-- 40_standard_attributes_patch.sql
-- Seeds standard Amazon-style spec-sheet attributes (Colour, Material,
-- Special Feature, Included Components) into the existing generic
-- attributes system (attributes / attribute_values / product_attribute_values,
-- already wired end-to-end via ProductAttributesPanel.jsx) so staff can
-- pick them from the dropdown instead of typing them from scratch on
-- every product. No code changes needed - purely seed data.
--
-- Colour here is intentionally separate from the structural variant
-- Colour dropdown (product_variants.colour_id) - this is a free-text
-- spec-sheet row, not something that drives SKU/variant creation.
-- =====================================================================

USE cm_product_management;

INSERT INTO attributes (name, slug, input_type)
VALUES
  ('Colour', 'colour', 'text'),
  ('Material', 'material', 'text'),
  ('Special Feature', 'special-feature', 'text'),
  ('Included Components', 'included-components', 'text')
ON DUPLICATE KEY UPDATE name = VALUES(name);
