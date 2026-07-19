async function loadArticle() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const container = document.getElementById("articleContent");

  if (!id) {
    container.innerHTML = '<p class="text-danger">No article specified.</p>';
    return;
  }

  try {
    const res = await fetch(`/api/articles/${id}`);
    if (!res.ok) {
      container.innerHTML = '<p class="text-danger">Article not found.</p>';
      return;
    }
    const a = await res.json();
    document.title = `${a.title} — Business News Hub`;

    const paragraphs = (a.body || "")
      .split(/\n\s*\n/)
      .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
      .join("");

    container.innerHTML = `
      <p class="category-tag mono mb-2">${escapeHtml(a.category)}</p>
      <h1 class="mb-2" style="font-size: 1.8rem;">${escapeHtml(a.title)}</h1>
      <p class="meta mono mb-4" style="border-top:none; padding-top:0;">${escapeHtml(a.author)} · ${formatDate(a.date)}</p>
      <div class="article-body">${paragraphs}</div>
    `;
  } catch (err) {
    container.innerHTML = '<p class="text-danger">Could not load this article.</p>';
    console.error(err);
  }
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

loadArticle();
