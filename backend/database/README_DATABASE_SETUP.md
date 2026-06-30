# Fresh Database Setup

This project uses only these approved databases:

```txt
cm_auth_management
cm_product_management
cm_inventory_management
cm_price_management
cm_marketplace_management
cm_logs_management
```

Run:

```bash
cd backend
npm install
npm run setup-db
npm run dev
```

Default login:

```txt
username: admin
password: Admin@123
```

Important: `00_RESET_ONLY_NEW_DATABASES.sql` drops old/wrong databases first. Do not run it if you need to keep old data.

## Latest menu/page seed alignment

Daraz Products and WooCommerce Products are seeded under **PRODUCT MANAGEMENT**, not Marketplace/Account Management.

```txt
/product/local-products
/product/daraz-products
/product/woo-products
/product/categories
/product/colours
/product/sync-logs
/inventory
/marketplace/accounts
/users
/access-control
/logs
```
