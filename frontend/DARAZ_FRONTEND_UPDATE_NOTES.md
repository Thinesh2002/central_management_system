# Daraz Frontend Upgrade Notes

This frontend has been aligned with the updated Daraz backend API routes.

## Main routes added

- `/daraz-dashboard` - Daraz seller central overview
- `/daraz/accounts` - Daraz account/token center
- `/daraz/products` - Daraz product catalog and sync center
- `/daraz/orders` - Daraz order management
- `/daraz/inventory` - OOS SKU and stock queue center
- `/daraz/categories` - Category, attribute, and brand center
- `/daraz/finance` - Existing finance ledger

## Backend routes used

- `GET /api/daraz/dashboard/summary`
- `POST /api/daraz/sync`
- `POST /api/daraz/sync/:account_code`
- `GET /api/daraz/products`
- `GET /api/daraz/products/:product_id`
- `POST /api/daraz/orders/sync`
- `GET /api/daraz/orders`
- `GET /api/daraz/orders/:order_id`
- `GET /api/accounts`
- `POST /api/accounts`
- `PUT /api/accounts/:account_code`
- `POST /api/accounts/:account_code/refresh-token`
- `GET /api/daraz/inventory/oos`
- `GET /api/daraz/inventory/stock-queue`
- `POST /api/daraz/inventory/stock-queue`
- `GET /api/daraz/categories`
- `POST /api/daraz/categories/sync-tree`
- `GET /api/daraz/category-attributes`
- `POST /api/daraz/category-attributes/:category_id/sync`
- `GET /api/daraz/category-brands`
- `POST /api/daraz/category-brands/:category_id/sync`

## Important

Set the backend URL in `.env`:

```env
VITE_API_BASE_URL=https://backend.teckvora.com/api
VITE_API_TIMEOUT_MS=45000
```

Then run:

```bash
npm install
npm run build
npm run dev
```

Build test passed after the update.
