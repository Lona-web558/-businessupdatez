// market.js — ticker data for the homepage.
//
// USD/ZAR is fetched live from Frankfurter (free ECB-sourced rates API, no
// key required), cached in memory for an hour.
//
// JSE ALSI, Repo Rate, CPI, and Brent Crude don't have a reliable free
// real-time feed, so these are SIMULATED: each time the ticker is requested,
// every field takes a small random step from its last value. This is mock
// movement, not real market data — but it keeps the ticker looking alive
// instead of frozen. The admin panel sets the starting point (and can reset
// it any time by saving new values).
//
// Notes:
// - On Render's free/standard tier the filesystem is ephemeral, so an
//   admin-set starting value (like article edits) is lost on redeploy or
//   restart unless you attach a persistent disk.
// - The in-memory simulation itself also resets on every server restart
//   (back to whatever's in data/market.json / the defaults below).

const fs = require("fs");
const path = require("path");

const DATA_FILE = path.join(__dirname, "data", "market.json");

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

// --- Parsing / formatting helpers for the simulated fields ---
function parseNumber(str) {
  const n = parseFloat(String(str).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}
function formatJse(n) {
  return Math.round(n).toLocaleString("en-US");
}
function formatPercent(n, decimals) {
  return `${n.toFixed(decimals)}%`;
}
function formatBrent(n) {
  return `$${n.toFixed(2)}`;
}

// --- In-memory random-walk simulation ---
let sim = null;

function initSim(manual) {
  sim = {
    jseAlsi: { value: parseNumber(manual.jseAlsi.value), volatility: 0.4, format: formatJse },
    repoRate: { value: parseNumber(manual.repoRate.value), volatility: 0.05, format: (n) => formatPercent(n, 2) },
    cpi: { value: parseNumber(manual.cpi.value), volatility: 0.15, format: (n) => formatPercent(n, 1) },
    brent: { value: parseNumber(manual.brent.value), volatility: 0.6, format: formatBrent },
  };
}

function step(field) {
  const changePct = (Math.random() - 0.5) * 2 * field.volatility; // e.g. +-0.4%
  const prev = field.value;
  const next = Math.max(0, prev * (1 + changePct / 100));
  field.value = next;
  const pctDiff = prev ? ((next - prev) / prev) * 100 : 0;
  return {
    value: field.format(next),
    change: `${Math.abs(pctDiff).toFixed(2)}%`,
    direction: pctDiff > 0 ? "up" : pctDiff < 0 ? "down" : "flat",
  };
}

function getSimulatedTicker() {
  const manual = readManual();
  if (!sim) initSim(manual);
  return {
    jseAlsi: { label: "JSE ALSI", ...step(sim.jseAlsi) },
    repoRate: { label: "REPO RATE", ...step(sim.repoRate) },
    cpi: { label: "CPI (YoY)", ...step(sim.cpi) },
    brent: { label: "BRENT CRUDE", ...step(sim.brent) },
  };
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
    const latestRes = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=ZAR");
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
      const prevRes = await fetch(`https://api.frankfurter.dev/v1/${prevDateStr}?base=USD&symbols=ZAR`);
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
  const fx = await getUsdZar();
  const simulated = getSimulatedTicker();
  return {
    ...simulated,
    usdZar: fx || { label: "USD/ZAR", value: "—", change: "", direction: "flat", source: "unavailable" },
    updatedAt: new Date().toISOString(),
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
  // Reset the simulation baseline to whatever the admin just set,
  // so the next request starts walking from the new values.
  sim = null;
  return updated;
}

module.exports = { getTicker, updateManual, readManual };
