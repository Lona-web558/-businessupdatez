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
    <p class="meta mono mb-0">${escapeHtml(lead.author)} · ${formatDate(lead.date)}</p>
  `;
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
      <a href="/article.html?id=${encodeURIComponent(a.id)}" class="article-card-link">
        <div class="article-card">
          <p class="category-tag mono mb-1">${escapeHtml(a.category)}</p>
          <h3>${escapeHtml(a.title)}</h3>
          <p class="summary">${escapeHtml(a.summary)}</p>
          <p class="meta mono mb-0">${escapeHtml(a.author)} · ${formatDate(a.date)}</p>
        </div>
      </a>
    </div>
  `
    )
    .join("");
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return d.toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

fetchArticles();
