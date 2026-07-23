// db.js — tiny JSON-file "database" for Business News Hub
// Reads/writes data/articles.json. Not for high-concurrency use,
// but perfect for a single-editor content site.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "articles.json", "articles1.json");

function readArticles() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to read articles.json:", err.message);
    return [];
  }
}

function writeArticles(articles) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(articles, null, 2), "utf-8");
}

function getAll() {
  return readArticles().sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getById(id) {
  return readArticles().find((a) => a.id === id);
}

function create(article) {
  const articles = readArticles();
  const newArticle = {
    id: Date.now().toString(),
    title: article.title || "Untitled",
    category: article.category || "General",
    summary: article.summary || "",
    body: article.body || "",
    author: article.author || "Business News Hub Desk",
    date: article.date || new Date().toISOString().slice(0, 10),
    featured: !!article.featured,
    image: article.image || "",
  };
  articles.push(newArticle);
  writeArticles(articles);
  return newArticle;
}

function update(id, updates) {
  const articles = readArticles();
  const index = articles.findIndex((a) => a.id === id);
  if (index === -1) return null;
  articles[index] = { ...articles[index], ...updates, id };
  writeArticles(articles);
  return articles[index];
}

function remove(id) {
  const articles = readArticles();
  const filtered = articles.filter((a) => a.id !== id);
  if (filtered.length === articles.length) return false;
  writeArticles(filtered);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
