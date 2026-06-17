# Daraz `refresh_failed` Fix

## Meaning
`refresh_failed` means the backend tried `/auth/token/refresh`, but Daraz did not return a valid new access token.

Most common reasons:
1. Refresh token expired.
2. Refresh token was already replaced by a newer refresh token and the old one is saved in DB.
3. Wrong `DARAZ_APP_KEY` or `DARAZ_APP_SECRET`.
4. Wrong account connected to the wrong app credentials.
5. Server network timeout.

## New route added

```http
GET /api/accounts/:account_code/auth-url
```

It returns an `auth_url`. Open it, login to Daraz Seller Center, authorize, and Daraz will redirect back with `code`.

Callback route already exists:

```http
GET /api/accounts/:account_code/auth/callback?code=AUTH_CODE
```

## Required .env

```env
DARAZ_APP_KEY=your_app_key
DARAZ_APP_SECRET=your_app_secret
DARAZ_BASE_URL=https://api.daraz.lk/rest
DARAZ_REDIRECT_URI=https://your-backend-domain.com/api/accounts/ACCOUNT_CODE/auth/callback
```

For multi-account, the redirect URL must exactly match the callback URL configured in Daraz Open Platform.

## Useful SQL checks

```sql
SELECT account_code, account_name, token_status,
       access_token IS NOT NULL AS has_access_token,
       refresh_token IS NOT NULL AS has_refresh_token,
       access_token_expires_at, refresh_token_expires_at, last_token_refresh_at
FROM daraz_accounts;

SELECT account_code, action, status, message, error_json, created_at
FROM daraz_token_logs
ORDER BY id DESC
LIMIT 20;
```
