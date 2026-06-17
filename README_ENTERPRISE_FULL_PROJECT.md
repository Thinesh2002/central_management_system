# Enterprise Seller Central Full Project Update

This package patches the existing CMS with a light Amazon Seller Central style workflow for:

- Own local product system
- Parent/child SKU product creation
- SKU generation: Prefix + sub-category + model + colour + pack suffix
- Pack rules: 1PK, 2PK, 3PK, 4PK, 5PK, 10PK
- Local inventory stock editing
- Daraz inventory stock queue editing
- WooCommerce stock queue editing
- SKU mapping: wrong channel SKU → correct local system SKU
- Category and sub-category manager with images
- Daraz/Woo category mapping
- Product image dashboard with image popup
- Daraz orders with image/customer/status/tracking update
- Net sales dashboard from 2022 onward
- System action logs for product, inventory, SKU, order actions

## Important backend route

The new stable backend API is mounted at:

```txt
/api/enterprise
```

The old routes are also patched to use this safe layer:

```txt
/api/products/list
/api/categories
/api/sub-categories
/api/inventory/view
```

## First run

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

## Database

The backend auto-creates and auto-patches required tables on startup via:

```txt
backend/models/system/enterprise_cms_model.js
```

It does not drop existing tables.

## Main pages

```txt
/manage-all-inventory
/system/products
/system/categories
/system/images
/daraz/orders
/daraz/sku-mapping
/daraz/category-mapping
/daraz/net-sales
/daraz/business-reports
/daraz/pack-rules
/daraz/sync-logs
```

## Notes

Live Daraz and WooCommerce push still depends on valid API tokens and the existing external API service. Stock edits for Daraz/Woo are queued in `channel_stock_update_queue` and shown immediately in the local dashboard.
