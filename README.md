# Conversational Agent

Simple chat application with:
- A static web UI (`index.html`, `script.js`, `style.css`)
- Optional React client in `client/`
- Serverless API endpoints for Vercel in `api/`

## Local Run (root static app)
1. Install dependencies:
```bash
npm install
```
2. Start server (optional for local API usage):
```bash
npm start
```
3. Open `http://localhost:3001`.

## Local Run (React client)
```bash
cd client
npm install
npm run dev
```

Optional env for client API base:
```bash
VITE_API_BASE_URL=http://localhost:3001
```

## Vercel Deploy
This repo is configured for Vercel with `vercel.json`.

- Static assets are served from project root.
- API routes are exposed as:
  - `POST /api/chat`
  - `GET /api/health`

Deploy:
```bash
vercel
```

Then verify:
- `https://<your-domain>/api/health`
