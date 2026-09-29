# Finance Management (finance.teckvora.com)

Standalone React/Vite frontend for the Finance Dashboard. It has no backend
of its own: it logs in against, and reads from, the central system backend
(`backend.teckvora.com/api`, routes under `/api/finance`).

- **Dashboard**: order revenue (manual + Daraz orders, excluding
  cancelled/returned), Daraz expenses (fees, promotions, penalties, refunds,
  claims and adjustments, net of reversals; buyer-income lines are excluded
  because order revenue already counts them), calculated net payout, Daraz
  payouts and balances.
- **Daraz Income**: complete buyer-income and deduction totals, every Daraz
  fee type, per-order settlement breakdowns with line-level drill-down, payout
  statements, seller-account movements (deposits, withdrawals, payments and
  settlements), account/date/payment filters, and manual API backfills.
Net payout = order revenue − Daraz expenses. It does not include cost of goods
or operating expenses outside Daraz.

## Access

Users sign in with their central system account. Page access comes from two
Access Control pages on system.teckvora.com:

| Page key            | Controls                                            |
|---------------------|-----------------------------------------------------|
| `finance_dashboard` | view the dashboard                                  |

Master admins have full access automatically. Everyone else starts with no
access until someone grants it.

## Local development

```sh
cp .env.example .env   # point VITE_API_BASE_URL at your backend, e.g. http://localhost:5000/api
npm install
npm run dev            # http://localhost:5174 (whitelisted in backend CORS)
```

## Deploying (VPS)

```sh
cd /var/www/central_management_system && git pull

# 1. Required for complete Daraz fee-line storage and the Daraz Income page
cd backend
node scripts/run-sql-file.js 61_daraz_finance_line_key_patch.sql
pm2 restart central_management

# 2. Build the finance frontend
cd ../finance
echo "VITE_API_BASE_URL=https://backend.teckvora.com/api" > .env
npm ci && npm run build
```

DNS: add an `A` record for `finance` pointing at the VPS IP. Then add an nginx site:

```nginx
server {
    listen 80;
    server_name finance.teckvora.com;

    root /var/www/central_management_system/finance/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```sh
ln -s /etc/nginx/sites-available/finance.teckvora.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
certbot --nginx -d finance.teckvora.com
```
