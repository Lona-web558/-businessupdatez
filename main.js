let allArticles = [];
let activeCategory = "All";

async function fetchArticles() {
  try {
    const res = await fetch("/api/articles");
    allArticles = await res.json();
    renderLeadStory();
    renderCategoryPills();
    renderGrid();
  } catch (err) {
    document.getElementById("articleGrid").innerHTML =
      '<p class="text-danger">Could not load articles. Please try again later.</p>';
    console.error(err);
  }
}

function renderLeadStory() {
  const lead = allArticles.find((a) => a.featured) || allArticles[0];
  const container = document.getElementById("leadStory");
  if (!lead) {
    container.innerHTML = "<p>No articles match this filter yet. Check back after the next update.</p>";
    return;
  }
  container.innerHTML = `
    <p class="category-tag mono mb-2">${lead.category}</p>
    <h2><a href="/article.html?id=${encodeURIComponent(lead.id)}" class="lead-link">${escapeHtml(lead.title)}</a></h2>
    <p class="text-muted">${escapeHtml(lead.summary)}</p>
    <p class="meta mono mb-2">${escapeHtml(lead.author)} · ${formatDate(lead.date)}</p>
    <div class="share-row">
      <span class="share-label mono">Share:</span>
      <button type="button" class="share-btn share-twitter" data-platform="twitter" title="Share on X/Twitter">Twitter/X</button>
      <button type="button" class="share-btn share-whatsapp" data-platform="whatsapp" title="Share on WhatsApp">WhatsApp</button>
    </div>
  `;
  attachShareHandlers(container, lead);
}

function renderCategoryPills() {
  const categories = ["All", ...new Set(allArticles.map((a) => a.category))];
  const container = document.getElementById("categoryPills");
  container.innerHTML = categories
    .map(
      (cat) =>
        `<button class="btn ${cat === activeCategory ? "active" : ""}" data-category="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`
    )
    .join("");

  container.querySelectorAll("button").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeCategory = btn.dataset.category;
      renderCategoryPills();
      renderGrid();
    });
  });
}

function renderGrid() {
  const grid = document.getElementById("articleGrid");
  const filtered =
    activeCategory === "All"
      ? allArticles
      : allArticles.filter((a) => a.category === activeCategory);

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="text-muted">No articles match this filter yet. Check back after the next update.</p>';
    return;
  }

  grid.innerHTML = filtered
    .map(
      (a) => `
    <div class="col-md-6 col-lg-4">
      <div class="article-card-wrapper" data-article-id="${escapeHtml(a.id)}">
        <a href="/article.html?id=${encodeURIComponent(a.id)}" class="article-card-link">
          <div class="article-card">
            <p class="category-tag mono mb-1">${escapeHtml(a.category)}</p>
            <h3>${escapeHtml(a.title)}</h3>
            <p class="summary">${escapeHtml(a.summary)}</p>
            <p class="meta mono mb-0">${escapeHtml(a.author)} · ${formatDate(a.date)}</p>
          </div>
        </a>
        <div class="share-row card-share-row">
          <span class="share-label mono">Share:</span>
          <button type="button" class="share-btn share-twitter" data-platform="twitter" title="Share on X/Twitter">Twitter/X</button>
          <button type="button" class="share-btn share-whatsapp" data-platform="whatsapp" title="Share on WhatsApp">WhatsApp</button>
        </div>
      </div>
    </div>
  `
    )
    .join("");

  grid.querySelectorAll(".article-card-wrapper").forEach((wrapper) => {
    const article = filtered.find((a) => String(a.id) === wrapper.dataset.articleId);
    if (article) attachShareHandlers(wrapper, article);
  });
}

async function fetchMarket() {
  try {
    const res = await fetch("/api/market");
    const data = await res.json();
    renderTicker(data);
  } catch (err) {
    console.error("Failed to load market data:", err);
  }
}

function renderTicker(data) {
  setTick("tick-jse", data.jseAlsi);
  setTick("tick-usdzar", data.usdZar);
  setTick("tick-repo", data.repoRate);
  setTick("tick-cpi", data.cpi);
  setTick("tick-brent", data.brent);

  const updatedEl = document.getElementById("tick-updated");
  if (updatedEl) {
    updatedEl.textContent =
      data.usdZar && data.usdZar.source === "live"
        ? `USD/ZAR live as of ${data.usdZar.asOf} — other figures updated by our desk`
        : "Business News Hub — updated daily by our desk";
  }
}

function setTick(elId, entry) {
  const el = document.getElementById(elId);
  if (!el || !entry) return;
  el.className =
    "val" + (entry.direction === "up" ? " up" : entry.direction === "down" ? " down" : "");
  const arrow = entry.direction === "up" ? " ▲" : entry.direction === "down" ? " ▼" : "";
  el.textContent = `${entry.value}${arrow}${entry.change ? " " + entry.change : ""}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function buildArticleUrl(article) {
  return `${window.location.origin}/article.html?id=${encodeURIComponent(article.id)}`;
}

function shareArticle(article, platform) {
  const url = buildArticleUrl(article);
  const text = article.title;
  let shareUrl;

  if (platform === "twitter") {
    shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  } else if (platform === "whatsapp") {
    shareUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  } else {
    return;
  }

  window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=500");
}

function attachShareHandlers(scopeEl, article) {
  scopeEl.querySelectorAll(".share-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      shareArticle(article, btn.dataset.platform);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

fetchArticles();
fetchMarket();
setInterval(fetchMarket, 5 * 60 * 1000); // refresh every 5 minutes
