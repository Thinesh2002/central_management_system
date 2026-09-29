# Teckvora Finance (finance.teckvora.com)

Standalone React/Vite frontend for the Finance Dashboard. It has no backend
of its own: it logs in against, and reads from, the central system backend
(`backend.teckvora.com/api`, routes under `/api/finance`).

- **Dashboard**: order revenue (manual + Daraz orders, excluding
  cancelled/returned), Daraz marketplace fees (net of fee reversals; item-price
  lines are excluded because order revenue already counts them), ledger
  income/expenses, estimated net profit, Daraz payouts and balances.
- **Ledger**: manual income/expense entries, with CSV export.
- **Categories**: ledger categories.

Net profit = order revenue − marketplace fees + other income − expenses. It
does not include cost of goods unless you record stock purchases as ledger
expenses.

## Access

Users sign in with their central system account. Page access comes from two
Access Control pages on system.teckvora.com:

| Page key            | Controls                                            |
|---------------------|-----------------------------------------------------|
| `finance_dashboard` | view the dashboard                                  |
| `finance_ledger`    | view / edit / delete ledger entries and categories  |

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

# 1. DB patch (additive, safe on live data) + restart backend
cd backend && node scripts/run-sql-file.js 60_finance_ledger_patch.sql
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
