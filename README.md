# Business News Hub

South African business & finance news site. Express backend, JSON file as the
local "database", Bootstrap 5 front end, dark gold/cyan terminal theme.

## Structure

```
business-news-hub/
├── server.js           # Express app entry point
├── db.js               # JSON file read/write helpers
├── routes/api.js        # /api/articles CRUD routes
├── data/articles.json   # your content lives here
├── public/
│   ├── index.html       # homepage
│   ├── admin.html       # content admin panel
│   ├── css/style.css
│   └── js/
│       ├── main.js       # homepage rendering
│       └── admin.js      # admin CRUD calls
└── package.json
```

## Run locally

```bash
npm install
npm start
```

Visit http://localhost:3000 — admin panel at http://localhost:3000/admin.html

## Admin access

Set an `ADMIN_KEY` environment variable before deploying (defaults to
`changeme-admin-key` for local testing only — change this before going live).
The admin panel asks for this key and sends it as an `x-admin-key` header on
every create/update/delete request.

## API

- `GET /api/articles` — list all articles (supports `?category=` and `?featured=true`)
- `GET /api/articles/:id` — single article
- `POST /api/articles` — create (requires `x-admin-key` header)
- `PUT /api/articles/:id` — update (requires `x-admin-key` header)
- `DELETE /api/articles/:id` — delete (requires `x-admin-key` header)

## Deploying to Render

1. Push this folder to a GitHub repo.
2. New Web Service on Render → connect the repo.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add an environment variable `ADMIN_KEY` with a strong value.

⚠️ **Note on Render's filesystem:** Render's free/standard web services use an
*ephemeral* filesystem — any edits made through the admin panel (which write
to `data/articles.json`) will be lost on redeploy or restart. This matches
the "local JSON database" approach you asked for and works fine for
demoing/editing between deploys, but if you want edits to persist long-term
in production, you'd eventually want a Render Disk (persistent volume) or a
real database (e.g. Postgres). Happy to wire that up if you want it later.

## Content

`data/articles.json` ships with 8 sample South African finance articles
(placeholder/generic content — not real reported news) covering markets, the
rand, the JSE, mining, and the budget, so you have something to look at
immediately. Replace them via the admin panel or by editing the JSON file
directly.
