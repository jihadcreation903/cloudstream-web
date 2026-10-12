# Deployment checklist

- [ ] Install Node.js 20+ and run `npm install && npm run build`.
- [ ] Create a Cloudflare Pages project connected to this GitHub repository (`npm run build`, output `dist`).
- [ ] Create a Cloudflare D1 database and apply `worker/schema.sql`.
- [ ] Configure `wrangler.toml` using your real D1 database ID.
- [ ] Set `ADMIN_BEARER_TOKEN` as a Worker secret; never commit secrets.
- [ ] Deploy the Worker and test `/api/health` and `/api/repository`.
- [ ] Replace the demo admin UI with real server-side authentication before public launch.
- [ ] Add Cloudflare Web Analytics using your actual token.
- [ ] Test provider adapters and use only content sources you are authorized to access.