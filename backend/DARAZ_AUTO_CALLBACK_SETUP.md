# Daraz Automatic Authorization Callback Setup

Backend `.env` must include:

```env
DARAZ_REDIRECT_URI=https://www.system.teckvora.com/daraz/callback
```

Daraz Open Platform callback URL must be exactly the same.

Automatic flow:

1. Frontend opens `/api/accounts/:account_code/auth-url`.
2. Daraz redirects to `/daraz/callback?code=...&state=ACCOUNT_CODE`.
3. Frontend callback page calls `/api/accounts/:account_code/auth/callback?code=...`.
4. Backend saves access_token and refresh_token.
5. Frontend redirects to `/daraz/accounts`.
