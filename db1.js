// db.js — tiny JSON-file "database" for Business News Hub
// Reads from BOTH data/articles.json (archive, read-only) and
// data/articles1.json (active file — all new writes go here).
// Not for high-concurrency use, but perfect for a single-editor content site.

const fs = require("fs");
const path = require("path");

const ARCHIVE_FILE = path.join(__dirname, "articles.json");
const ACTIVE_FILE = path.join(__dirname, "articles1.json");

function readJsonFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message);
    return [];
  }
}

function readArchive() {
  return readJsonFile(ARCHIVE_FILE);
}

function readActive() {
  return readJsonFile(ACTIVE_FILE);
}

// Combined view of both files — used for all reads
function readArticles() {
  return [...readArchive(), ...readActive()];
}

// Writes always go to articles1.json only.
// articles.json is treated as a frozen archive and never rewritten.
function writeActive(articles) {
  fs.writeFileSync(ACTIVE_FILE, JSON.stringify(articles, null, 2), "utf-8");
}

function getAll() {
  return readArticles().sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getById(id) {
  return readArticles().find((a) => a.id === id);
}

function create(article) {
  const active = readActive();
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
  active.push(newArticle);
  writeActive(active);
  return newArticle;
}

function update(id, updates) {
  // Only articles in articles1.json can be updated — articles.json is frozen.
  const active = readActive();
  const index = active.findIndex((a) => a.id === id);
  if (index === -1) {
    const inArchive = readArchive().some((a) => a.id === id);
    if (inArchive) {
      console.error(`Cannot update id ${id}: it lives in the read-only articles.json archive.`);
    }
    return null;
  }
  active[index] = { ...active[index], ...updates, id };
  writeActive(active);
  return active[index];
}

function remove(id) {
  // Only articles in articles1.json can be removed — articles.json is frozen.
  const active = readActive();
  const filtered = active.filter((a) => a.id !== id);
  if (filtered.length === active.length) {
    const inArchive = readArchive().some((a) => a.id === id);
    if (inArchive) {
      console.error(`Cannot remove id ${id}: it lives in the read-only articles.json archive.`);
    }
    return false;
  }
  writeActive(filtered);
  return true;
}

module.exports = { getAll, getById, create, update, remove };
