// market.js — ticker data for the homepage.
//
// USD/ZAR is fetched live from Frankfurter (free ECB-sourced rates API, no
// key required) and cached in memory for an hour.
//
// JSE ALSI, Repo Rate, CPI, and Brent Crude don't have a reliable free
// real-time feed, so those are stored in data/market.json and edited from
// the admin panel — no code changes or redeploys needed to update them.
//
// Note: on Render's free/standard tier the filesystem is ephemeral, so
// admin edits to market.json (like article edits) are lost on redeploy or
// restart unless you attach a persistent disk.

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "market.json");

const DEFAULTS = {
  jseAlsi: { label: "JSE ALSI", value: "84,210", change: "0.6%", direction: "up" },
  repoRate: { label: "REPO RATE", value: "8.25%", change: "", direction: "flat" },
  cpi: { label: "CPI (YoY)", value: "4.9%", change: "", direction: "flat" },
  brent: { label: "BRENT CRUDE", value: "$82.10", change: "0.4%", direction: "up" },
  updatedAt: null,
};

function readManual() {
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch (err) {
    return DEFAULTS;
  }
}

function writeManual(data) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

// --- Live USD/ZAR via Frankfurter (ECB reference rates, daily, no key) ---
let fxCache = { value: null, fetchedAt: 0 };
const FX_TTL_MS = 60 * 60 * 1000; // re-fetch at most once an hour

async function getUsdZar() {
  const now = Date.now();
  if (fxCache.value && now - fxCache.fetchedAt < FX_TTL_MS) {
    return fxCache.value;
  }
  try {
    const latestRes = await fetch("https://api.frankfurter.dev/v2/latest?base=USD&symbols=ZAR");
    if (!latestRes.ok) throw new Error(`Frankfurter returned ${latestRes.status}`);
    const latest = await latestRes.json();
    const rate = latest.rates && latest.rates.ZAR;
    if (!rate) throw new Error("No ZAR rate in response");

    // Rough day-over-day change vs. the previous available business day.
    let pctChange = 0;
    try {
      const d = new Date(latest.date);
      d.setDate(d.getDate() - 1);
      const prevDateStr = d.toISOString().slice(0, 10);
      const prevRes = await fetch(`https://api.frankfurter.dev/v2/${prevDateStr}?base=USD&symbols=ZAR`);
      const prevData = await prevRes.json();
      const prevRate = prevData.rates && prevData.rates.ZAR;
      if (prevRate) pctChange = ((rate - prevRate) / prevRate) * 100;
    } catch (err) {
      // If the comparison fetch fails, we still show the live rate with no change indicator.
    }

    fxCache = {
      value: {
        value: rate.toFixed(2),
        change: pctChange ? `${Math.abs(pctChange).toFixed(2)}%` : "",
        direction: pctChange > 0 ? "up" : pctChange < 0 ? "down" : "flat",
        source: "live",
        asOf: latest.date,
      },
      fetchedAt: now,
    };
  } catch (err) {
    console.error("Failed to fetch USD/ZAR rate:", err.message);
    // Keep serving the last good value (even if stale) rather than nothing.
  }
  return fxCache.value;
}

async function getTicker() {
  const manual = readManual();
  const fx = await getUsdZar();
  return {
    jseAlsi: manual.jseAlsi,
    usdZar: fx || { label: "USD/ZAR", value: "—", change: "", direction: "flat", source: "unavailable" },
    repoRate: manual.repoRate,
    cpi: manual.cpi,
    brent: manual.brent,
    updatedAt: manual.updatedAt,
  };
}

function updateManual(fields) {
  const current = readManual();
  const updated = {
    ...current,
    ...fields,
    updatedAt: new Date().toISOString(),
  };
  writeManual(updated);
  return updated;
}

module.exports = { getTicker, updateManual, readManual };
