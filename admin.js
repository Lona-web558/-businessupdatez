let adminKey = "";

document.getElementById("unlockBtn").addEventListener("click", async () => {
  adminKey = document.getElementById("adminKeyInput").value.trim();
  if (!adminKey) return;
  // Verify key by attempting a harmless GET (always allowed) then testing on first save.
  document.getElementById("keyGate").style.display = "none";
  document.getElementById("adminContent").style.display = "block";
  document.getElementById("date").valueAsDate = new Date();
  loadArticles();
  loadMarket();
});

async function loadMarket() {
  const res = await fetch("/api/market");
  const data = await res.json();
  document.getElementById("jseValue").value = data.jseAlsi?.value || "";
  document.getElementById("jseChange").value = data.jseAlsi?.change || "";
  document.getElementById("jseDirection").value = data.jseAlsi?.direction || "flat";
  document.getElementById("repoValue").value = data.repoRate?.value || "";
  document.getElementById("cpiValue").value = data.cpi?.value || "";
  document.getElementById("brentValue").value = data.brent?.value || "";
  document.getElementById("brentChange").value = data.brent?.change || "";
  document.getElementById("brentDirection").value = data.brent?.direction || "flat";
}

document.getElementById("marketForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    jseAlsi: {
      label: "JSE ALSI",
      value: document.getElementById("jseValue").value,
      change: document.getElementById("jseChange").value,
      direction: document.getElementById("jseDirection").value,
    },
    repoRate: {
      label: "REPO RATE",
      value: document.getElementById("repoValue").value,
      change: "",
      direction: "flat",
    },
    cpi: {
      label: "CPI (YoY)",
      value: document.getElementById("cpiValue").value,
      change: "",
      direction: "flat",
    },
    brent: {
      label: "BRENT CRUDE",
      value: document.getElementById("brentValue").value,
      change: document.getElementById("brentChange").value,
      direction: document.getElementById("brentDirection").value,
    },
  };

  const res = await fetch("/api/market", {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    alert("Invalid admin key. Please refresh and re-enter it.");
    return;
  }
  if (!res.ok) {
    alert("Something went wrong saving market data.");
    return;
  }
  alert("Market data updated.");
});

async function loadArticles() {
  const res = await fetch("/api/articles");
  const articles = await res.json();
  const list = document.getElementById("articleList");

  if (articles.length === 0) {
    list.innerHTML = '<p class="text-muted">No articles yet.</p>';
    return;
  }

  list.innerHTML = articles
    .map(
      (a) => `
    <div class="admin-row d-flex justify-content-between align-items-center">
      <div>
        <span class="category-tag mono">${escapeHtml(a.category)}</span><br>
        <strong>${escapeHtml(a.title)}</strong>
        <div class="text-muted mono" style="font-size:0.75rem;">${a.date} ${a.featured ? "· FEATURED" : ""}</div>
      </div>
      <div>
        <button class="btn btn-sm btn-outline-info me-2" onclick="editArticle('${a.id}')">Edit</button>
        <button class="btn btn-sm btn-outline-danger" onclick="deleteArticle('${a.id}')">Delete</button>
      </div>
    </div>
  `
    )
    .join("");
}

document.getElementById("articleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("articleId").value;

  const payload = {
    title: document.getElementById("title").value,
    category: document.getElementById("category").value,
    summary: document.getElementById("summary").value,
    body: document.getElementById("body").value,
    author: document.getElementById("author").value,
    date: document.getElementById("date").value,
    featured: document.getElementById("featured").checked,
  };

  const url = id ? `/api/articles/${id}` : "/api/articles";
  const method = id ? "PUT" : "POST";

  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    alert("Invalid admin key. Please refresh and re-enter it.");
    return;
  }
  if (!res.ok) {
    alert("Something went wrong saving the article.");
    return;
  }

  resetForm();
  loadArticles();
});

async function editArticle(id) {
  const res = await fetch(`/api/articles/${id}`);
  const a = await res.json();
  document.getElementById("articleId").value = a.id;
  document.getElementById("title").value = a.title;
  document.getElementById("category").value = a.category;
  document.getElementById("summary").value = a.summary;
  document.getElementById("body").value = a.body;
  document.getElementById("author").value = a.author;
  document.getElementById("date").value = a.date;
  document.getElementById("featured").checked = a.featured;
  document.getElementById("formTitle").textContent = "Edit Article";
  document.getElementById("cancelEdit").style.display = "inline-block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteArticle(id) {
  if (!confirm("Delete this article? This cannot be undone.")) return;
  const res = await fetch(`/api/articles/${id}`, {
    method: "DELETE",
    headers: { "x-admin-key": adminKey },
  });
  if (res.status === 401) {
    alert("Invalid admin key.");
    return;
  }
  loadArticles();
}

document.getElementById("cancelEdit").addEventListener("click", resetForm);

function resetForm() {
  document.getElementById("articleForm").reset();
  document.getElementById("articleId").value = "";
  document.getElementById("date").valueAsDate = new Date();
  document.getElementById("formTitle").textContent = "New Article";
  document.getElementById("cancelEdit").style.display = "none";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
