# Central Management System — Database Setup

This project uses 6 separate MySQL databases, each with a clear business purpose:

```txt
cm_auth_management         users, roles, page registry, permissions
cm_product_management      categories, sub-categories, models, colours,
                           attributes, products, variants, images
cm_inventory_management    stock levels + stock ledger (by SKU)
cm_price_management        cost price, selling price, Daraz price, Woo price
cm_marketplace_management  Daraz/WooCommerce accounts, credentials,
                           sync jobs, API logs, marketplace product mirrors
cm_logs_management         login logs, system logs, product change logs
```

## First-time setup

```bash
cd backend
npm install
npm run setup-db
npm run dev
```

`npm run setup-db` runs, in order:

```txt
database/00_RESET_ONLY_NEW_DATABASES.sql
database/01_auth_management.sql
database/02_marketplace_management.sql
database/03_product_management.sql
database/04_inventory_management.sql
database/05_price_management.sql
database/06_logs_management.sql
```

**Warning:** `00_RESET_ONLY_NEW_DATABASES.sql` drops and recreates the 6
databases above. Do not run `npm run setup-db` again on a database you want
to keep — it will wipe existing data. To only add new/missing tables without
wiping data, run files `01` through `06` manually with a MySQL client instead
of using `npm run setup-db`.

## Upgrading an existing (pre-Daraz-inventory) database

`database/07_daraz_inventory_core_patch.sql` is **not** part of
`npm run setup-db` and is **not** needed for a fresh install — `03_product_management.sql`
and `06_logs_management.sql` already contain everything it adds. It exists only
for a database created *before* the Daraz inventory sync feature shipped,
where `daraz_products` may be missing `local_product_id` / `local_variant_id`,
its unique keys, and/or the `daraz_inventory_sync_logs` table, and may still
have duplicate rows that need dropping before the unique keys can be added.
Run it once, after `01`–`06`, only on such a database:

```bash
cd backend
npm run patch-daraz-inventory
```

## Upgrading an existing (pre-Images-Dashboard) database

Same situation for `database/08_product_images_media_library_patch.sql`: not
part of `npm run setup-db`, not needed for a fresh install. It exists for a
database created *before* the Images Dashboard shipped, where
`product_images.product_id` is still `NOT NULL` and `alt_text` doesn't exist
yet — you'll see `"Database column mismatch"` / `ER_BAD_FIELD_ERROR` errors
from the Images Dashboard until this runs. Run it once, after `01`–`07`:

```bash
cd backend
npm run patch-images-dashboard
```

## Default login

```txt
identifier: admin  (or admin@system.local)
password:   Admin@123
```

Change this password immediately after first login.

## SKU is the system-wide key

Local products are the master record. Every local product and every variant
has a unique SKU. Inventory (`cm_inventory_management`), pricing
(`cm_price_management`) and marketplace sync all key off SKU — not the
numeric database id. Cost price, selling price, Daraz price and WooCommerce
price all live on the `product_prices` table (one row per SKU) in
`cm_price_management`.

## Important: where Daraz / Woo product mirrors actually live

`daraz_products`, `daraz_product_variants`, `daraz_product_sync_runs`,
`woo_products`, `woo_product_variants` and `woo_product_images` are queried
by the backend from **`cm_product_management`** (not
`cm_marketplace_management`) — that's where the code's connection pool
points. If these tables were created in the wrong database, product sync
will silently fail with "table not found" errors. This package creates them
in the correct database (`03_product_management.sql`), while accounts,
credentials, and sync job logs stay in `cm_marketplace_management`
(`02_marketplace_management.sql`). All `id` / `*_id` columns use
`BIGINT UNSIGNED` to match a production-style schema (not `INT UNSIGNED`).

Run order matters: `02_marketplace_management.sql` must run **before**
`03_product_management.sql`, because the Daraz/Woo mirror tables have a
foreign key back to `cm_marketplace_management.accounts`. `npm run setup-db`
already runs them in the correct order.

## Menu / page seed alignment

Daraz Products and WooCommerce Products are seeded under **PRODUCT
MANAGEMENT**, not Marketplace/Account Management:

```txt
/dashboard
/product/local-products
/product/images
/product/daraz-products
/product/woo-products
/product/categories
/product/colours
/inventory
/pricing
/marketplace/accounts
/product/sync-logs
/users
/access-control
/logs
```
