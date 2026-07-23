const express = require("express");
const router = express.Router();
const db = require("./db1");
const market = require("./market");

// Simple shared-secret admin check.
// Set ADMIN_KEY as an environment variable on Render; falls back to a
// default for local testing only — change this before going live.
const ADMIN_KEY = process.env.ADMIN_KEY || "changeme-admin-key";

function requireAdmin(req, res, next) {
  const key = req.header("x-admin-key");
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized — invalid admin key." });
  }
  next();
}

// GET /api/articles — list all, optional ?category= filter
router.get("/articles", (req, res) => {
  let articles = db.getAll();
  const { category, featured } = req.query;
  if (category && category !== "All") {
    articles = articles.filter(
      (a) => a.category.toLowerCase() === category.toLowerCase()
    );
  }
  if (featured === "true") {
    articles = articles.filter((a) => a.featured);
  }
  res.json(articles);
});

// GET /api/articles/:id — single article
router.get("/articles/:id", (req, res) => {
  const article = db.getById(req.params.id);
  if (!article) return res.status(404).json({ error: "Article not found." });
  res.json(article);
});

// POST /api/articles — create (admin only)
router.post("/articles", requireAdmin, (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) {
    return res.status(400).json({ error: "Title and body are required." });
  }
  const created = db.create(req.body);
  res.status(201).json(created);
});

// PUT /api/articles/:id — update (admin only)
router.put("/articles/:id", requireAdmin, (req, res) => {
  const updated = db.update(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: "Article not found." });
  res.json(updated);
});

// DELETE /api/articles/:id — delete (admin only)
router.delete("/articles/:id", requireAdmin, (req, res) => {
  const deleted = db.remove(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Article not found." });
  res.json({ success: true });
});

// GET /api/market — ticker data (JSE ALSI, USD/ZAR, Repo Rate, CPI, Brent Crude).
// USD/ZAR is fetched live; the rest come from data/market.json.
router.get("/market", async (req, res) => {
  try {
    const data = await market.getTicker();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to load market data." });
  }
});

// PUT /api/market — update the manually-managed ticker fields (admin only).
// USD/ZAR can't be overridden here since it's fetched live.
router.put("/market", requireAdmin, (req, res) => {
  const { jseAlsi, repoRate, cpi, brent } = req.body;
  const updated = market.updateManual({ jseAlsi, repoRate, cpi, brent });
  res.json(updated);
});

module.exports = router;
