# Daraz Backend Update Notes

This backend has been updated for a multi-account Daraz API integration using the existing `product_management` database.

## Main updates

- Central Daraz API client with HMAC-SHA256 signing
- Token refresh support using `refresh_token`
- Multi-account sync from `daraz_accounts`
- Product sync every 30 minutes
- Order sync every 30 minutes
- Finance sync every 30 minutes
- Category tree sync daily by default
- Product list pagination/filter/search API
- Product details + SKU API
- Account CRUD + token refresh API
- Category sync/list/attributes/brands API
- Order sync/list/detail API
- Inventory OOS + stock update queue API
- Safe DB migration included in `database/product_management_safe_daraz_update_v2_phpmyadmin.sql`

## Important routes

### Daraz accounts

```http
GET    /api/accounts/view
GET    /api/accounts
POST   /api/accounts
GET    /api/accounts/:account_code
PUT    /api/accounts/:account_code
POST   /api/accounts/:account_code/refresh-token
GET    /api/accounts/:account_code/auth/callback?code=AUTH_CODE
```

### Daraz products

```http
POST /api/daraz/sync
POST /api/daraz/sync/:account_code
GET  /api/daraz/products?page=1&limit=50&account_code=CODE&status=active&search=keyword
GET  /api/daraz/products/:product_id
GET  /api/daraz/products/:product_id/skus
GET  /api/daraz/products/item/:account_code/:item_id
GET  /api/daraz/dashboard/summary
```

### Daraz categories

```http
POST /api/daraz/categories/sync-tree
GET  /api/daraz/categories?leaf_only=true&search=light
GET  /api/daraz/category-attributes?category_id=123
GET  /api/daraz/category-attributes?category_id=123&live=true
POST /api/daraz/category-attributes/:category_id/sync
GET  /api/daraz/category-brands?category_id=123
POST /api/daraz/category-brands/:category_id/sync
```

### Daraz orders

```http
POST /api/daraz/orders/sync
POST /api/daraz/orders/sync/:account_code
GET  /api/daraz/orders?page=1&limit=50&account_code=CODE&status=pending
GET  /api/daraz/orders/:order_id
```

### Daraz inventory

```http
GET  /api/daraz/inventory/oos
GET  /api/daraz/inventory/stock-queue
POST /api/daraz/inventory/stock-queue
```

## Cron settings

The cron file is `cron/daraz_corn.js`.

Default values:

```env
DARAZ_AUTO_SYNC_ENABLED=true
DARAZ_PRODUCT_SYNC_CRON=*/30 * * * *
DARAZ_ORDER_SYNC_CRON=*/30 * * * *
DARAZ_FINANCE_SYNC_CRON=*/30 * * * *
DARAZ_CATEGORY_SYNC_CRON=15 2 * * *
DARAZ_ACCOUNT_SYNC_CONCURRENCY=2
DARAZ_PRODUCT_BATCH_SIZE=50
DARAZ_ORDER_BATCH_SIZE=50
DARAZ_ORDER_SYNC_LOOKBACK_HOURS=48
DARAZ_API_TIMEOUT_MS=30000
DARAZ_TOKEN_REFRESH_BUFFER_MINUTES=30
```

## Before running

1. Backup existing database.
2. Run the safe migration SQL in phpMyAdmin.
3. Add/save Daraz accounts into `daraz_accounts`.
4. Make sure `.env` has `DARAZ_APP_KEY`, `DARAZ_APP_SECRET`, and `DARAZ_BASE_URL`.
5. Restart backend using PM2 or npm.

```bash
npm install
npm run dev
```

or on server:

```bash
pm2 restart <your-backend-process-name>
```
