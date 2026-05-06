# Premier Brands Art Request Portal

## Auth Setup

Authentication uses **Microsoft Entra (Azure AD) SSO via Supabase Auth**.

### Required environment variables

These are auto-populated by Lovable from the connected Supabase project — do not commit secrets.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |

### Supabase configuration

1. In **Supabase Dashboard → Authentication → Providers**, enable **Azure** and provide the Entra app's `Client ID`, `Client Secret`, and `Tenant URL`.
2. Set the **Site URL** and add **Redirect URLs**:
   - `http://localhost:5173/auth/callback`
   - `https://<your-domain>/auth/callback`
3. Scopes requested by the app: `openid email profile User.Read`.

### Provisioning

On first sign-in, an `auth.users` row triggers `public.handle_new_user()` which inserts a `profiles` row with the user's Azure `oid`, email, name, and the default role `requester`. Admins promote roles from the Settings panel.
