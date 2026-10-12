# CloudStream Web Starter

A dark React/Vite prototype for a movie-discovery website with a demo admin panel and Cloudflare Worker/D1 scaffolding.

## Run locally
1. Install Node.js 20+
2. Run `npm install`
3. Run `npm run dev`
4. Open the Vite URL shown in the terminal.

## Current status
This is a prototype: catalogue entries and analytics are demo data. The admin gate is not production authentication. The configured Phisher URL is a CloudStream extension manifest, not a normal movie catalogue; Kotlin/JVM extensions cannot execute directly in a browser. Build and test compatible adapters only for sources you are authorized to use.

## Deploy
See `DEPLOY-CHECKLIST.md`. Frontend can be hosted on Cloudflare Pages; API scaffolding uses Workers and D1. Do not expose secrets in frontend code.