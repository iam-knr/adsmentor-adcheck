const $ = (id) => document.getElementById(id);
const copy = $("copy"), out = $("out"), statusEl = $("status"), crvEl = $("creatives");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const VERDICT = {
  high:   ["High risk of rejection", "Fix the red items before publishing."],
  review: ["Review recommended", "Some wording may be flagged."],
  low:    ["Low risk", "Minor style points only."],
  clean:  ["No known risky wording found", "Not a guarantee. Landing page and account history are also reviewed."],
};
const SEV = { high: "High", medium: "Medium", low: "Low" };
const SRC = { META: "Meta policy text", ASCI: "India regulator (ASCI/CCPA)", BLOG: "Third-party guidance" };

/* ---------------- copy checking ---------------- */
let shownFindings = [];
function highlight(text, findings) {
  const spans = [];
  findings.forEach((f, fi) => { for (const m of f.matches) spans.push({ s: m.index, e: m.index + m.text.length, sev: f.severity, fi }); });
  spans.sort((a, b) => a.s - b.s || b.e - a.e);
  let html = "", pos = 0;
  for (const sp of spans) {
    if (sp.s < pos) continue;
    html += esc(text.slice(pos, sp.s)) + `<mark class="m-${sp.sev}" data-fi="${sp.fi}" tabindex="0">${esc(text.slice(sp.s, sp.e))}</mark>`;
    pos = sp.e;
  }
  return html + esc(text.slice(pos));
}

function render() {
  const text = copy.value;
  $("count").textContent = text.length + " chars";
  if (!text.trim()) { out.innerHTML = '<p class="empty">Nothing to check yet.</p>'; return; }
  const r = AdChecker.run(text);
  shownFindings = r.findings;
  hideTip();
  const [title, sub] = VERDICT[r.verdict];
  let html = `<div class="verdict v-${r.verdict}"><div class="big">${title}<small>${sub}</small></div></div>`;
  if (r.findings.length) html += `<div class="card preview">${highlight(text, r.findings)}</div>`;
  for (const f of r.findings) {
    const found = [...new Set(f.matches.map((m) => m.text))].slice(0, 4).map((t) => `<span class="found">"${esc(t)}"</span>`).join(", ");
    html += `<div class="card finding ${f.severity}">
      <h3><span class="tag ${f.severity}">${SEV[f.severity]}</span>${esc(f.title)}</h3>
      <p class="meta">${esc(f.policy)} · ${SRC[f.source]}</p>
      <div>Found: ${found}</div>
      <p style="margin:8px 0 0">${esc(f.why)}</p>
      <div class="fix"><b>Safer direction</b>${esc(f.fix)}</div>
      ${f.example ? `<div class="pair"><span class="no">Risky:</span> ${esc(f.example[0])}<br><span class="yes">Safer:</span> ${esc(f.example[1])}</div>` : ""}
    </div>`;
  }
  out.innerHTML = html;
}

/* ---------------- hover explanations on highlighted phrases ---------------- */
const tip = document.createElement("div");
tip.className = "tip"; tip.setAttribute("role", "tooltip"); tip.hidden = true;
document.body.appendChild(tip);
function hideTip() { tip.hidden = true; }
function showTip(mark) {
  const f = shownFindings[Number(mark.dataset.fi)];
  if (!f) return;
  tip.innerHTML = `<div class="tip-h"><span class="tag ${f.severity}">${SEV[f.severity]}</span> <b>${esc(f.title)}</b></div>
    <div class="tip-m">${esc(f.policy)} · ${SRC[f.source]}</div>
    <div class="tip-p">Flagged: <span class="found">"${esc(mark.textContent)}"</span></div>
    <div class="tip-p">${esc(f.why)}</div>
    <div class="tip-p"><b>Fix:</b> ${esc(f.fix)}</div>`;
  tip.hidden = false;
  const r = mark.getBoundingClientRect(), pad = 8;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  let left = Math.min(Math.max(pad, r.left), window.innerWidth - tw - pad);
  let top = r.bottom + 6;
  if (top + th > window.innerHeight - pad) top = Math.max(pad, r.top - th - 6);
  tip.style.left = left + "px"; tip.style.top = top + "px";
}
out.addEventListener("mouseover", (e) => { const m = e.target.closest && e.target.closest("mark[data-fi]"); if (m) showTip(m); });
out.addEventListener("mouseout", (e) => { if (e.target.closest && e.target.closest("mark[data-fi]")) hideTip(); });
out.addEventListener("focusin", (e) => { const m = e.target.closest && e.target.closest("mark[data-fi]"); if (m) showTip(m); });
out.addEventListener("focusout", hideTip);
out.addEventListener("click", (e) => { const m = e.target.closest && e.target.closest("mark[data-fi]"); if (m) { tip.hidden ? showTip(m) : hideTip(); } });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideTip(); });
window.addEventListener("scroll", hideTip, true);

function setText(t, note) {
  copy.value = t;
  if (note !== undefined) statusEl.textContent = note;
  render();
}

/* ---------------- page extraction (runs inside the page / every frame) ---------------- */
function extractFromPage() {
  const SKIP = /ad name|campaign name|ad set name|search|budget|bid|website url|display link|\burl\b|pixel|name your|filter|utm|tracking|schedule|date|audience name|location|interest/i;
  const KINDS = [
    ["Primary text", /primary text|primary\s*copy|ad text|body text|\bmessage\b/i],
    ["Headline", /headline/i],
    ["Description", /description/i],
  ];
  const vis = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    const s = getComputedStyle(el);
    return s.visibility !== "hidden" && s.display !== "none";
  };
  const labelFor = (el) => {
    const parts = [];
    const a = el.getAttribute("aria-label"); if (a) parts.push(a);
    const p = el.getAttribute("placeholder"); if (p) parts.push(p);
    const lb = el.getAttribute("aria-labelledby");
    if (lb) lb.split(/\s+/).forEach((id) => { const n = document.getElementById(id); if (n) parts.push(n.innerText || n.textContent || ""); });
    if (el.id) { try { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) parts.push(l.innerText); } catch (e) {} }
    let n = el;
    for (let i = 0; i < 5 && n; i++, n = n.parentElement) {
      let s = n.previousElementSibling, hops = 0;
      while (s && hops < 3) {
        const t = (s.innerText || "").trim();
        if (t && t.length < 40) { parts.push(t); break; }
        s = s.previousElementSibling; hops++;
      }
    }
    return parts;
  };

  const fields = [], loose = [];
  const sel = 'textarea, input[type="text"], input:not([type]), [contenteditable="true"], [contenteditable=""], [role="textbox"]';
  document.querySelectorAll(sel).forEach((el) => {
    if (!vis(el)) return;
    const text = String(el.value !== undefined ? el.value : el.innerText || "").trim();
    if (text.length < 3) return;
    const parts = labelFor(el);
    if (SKIP.test(parts.slice(0, 2).join(" | "))) return;
    // nearest label wins: first label part that names a known field
    let k = null;
    for (const part of parts) { k = KINDS.find(([, re]) => re.test(part)); if (k) break; }
    if (k) fields.push({ kind: k[0], text });
    else if (text.length > 20) loose.push({ kind: "Text field", text });
  });
  const seen = new Set();
  const uniq = (arr) => arr.filter((f) => { const key = f.kind + "|" + f.text; if (seen.has(key)) return false; seen.add(key); return true; });

  // Creatives
  const images = [];
  const addIf = (el, src, w, h, kind) => {
    if (!src || Math.min(w, h) < 250) return;
    if (/rsrc\.php|\.svg(\?|$)|\/static\//i.test(src)) return;
    if (!vis(el)) return;
    if (/profile|avatar|logo|icon|emoji/i.test((el.alt || "") + " " + (el.className && el.className.baseVal === undefined ? el.className : ""))) return;
    if (images.some((i) => i.src === src)) return;
    const item = { kind, src, w, h, alt: el.alt || "" };
    if (/^(blob:|data:)/.test(src)) {
      try {
        const k = Math.min(1, 1024 / Math.max(w, h));
        const c = document.createElement("canvas");
        c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext("2d").drawImage(el, 0, 0, c.width, c.height);
        item.data = c.toDataURL("image/jpeg", 0.85);
      } catch (e) {}
    }
    images.push(item);
  };
  document.querySelectorAll("img").forEach((im) => addIf(im, im.currentSrc || im.src, im.naturalWidth, im.naturalHeight, "image"));
  document.querySelectorAll("video").forEach((v) => {
    const w = v.videoWidth || v.clientWidth, h = v.videoHeight || v.clientHeight;
    const poster = v.poster;
    if (poster) { addIf(v, poster, w, h, "video"); return; }
    try {
      const c = document.createElement("canvas");
      c.width = Math.min(1024, w); c.height = Math.round(c.width * (h / w));
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", 0.85);
      if (!images.some((i) => i.data === data)) images.push({ kind: "video", src: "", data, w, h, alt: "" });
    } catch (e) {}
  });

  return {
    url: location.href,
    fields: uniq(fields),
    loose: uniq(loose).slice(0, 4),
    images: images.slice(0, 8),
    selection: (window.getSelection && window.getSelection().toString()) || "",
  };
}

/* ---------------- fetch + auto-read ---------------- */
let lastSig = "", lastImgSig = "", busy = false;

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}
const isMeta = (url) => /^https:\/\/([a-z0-9-]+\.)*facebook\.com\//i.test(url || "");
const isRestricted = (url) => !url || /^(chrome|edge|about|chrome-extension|chrome-search):/.test(url);

async function readPage(tab) {
  const res = await chrome.scripting.executeScript({ target: { tabId: tab.id, allFrames: true }, func: extractFromPage });
  const merged = { fields: [], loose: [], images: [], selection: "" };
  const seenF = new Set(), seenI = new Set();
  for (const r of res || []) {
    const v = r && r.result; if (!v) continue;
    for (const f of v.fields) { const k = f.kind + "|" + f.text; if (!seenF.has(k)) { seenF.add(k); merged.fields.push(f); } }
    for (const f of v.loose) { const k = "L|" + f.text; if (!seenF.has(k)) { seenF.add(k); merged.loose.push(f); } }
    for (const i of v.images) { const k = i.src || i.data; if (!seenI.has(k)) { seenI.add(k); merged.images.push(i); } }
    if (v.selection && !merged.selection) merged.selection = v.selection;
  }
  return merged;
}

async function fetchFromPage({ auto = false } = {}) {
  if (busy) return;
  busy = true;
  try {
    const tab = await activeTab();
    if (!tab || isRestricted(tab.url)) { if (!auto) statusEl.textContent = "Can't read this page. Paste your copy instead."; return; }
    if (auto && !isMeta(tab.url)) return; // only auto-read on Meta pages
    const data = await readPage(tab);

    let text = "", what = "";
    if (data.fields.length) {
      text = data.fields.map((f) => `${f.kind}: ${f.text}`).join("\n\n");
      what = [...new Set(data.fields.map((f) => f.kind))].join(", ");
    } else if (data.selection.trim()) { text = data.selection; what = "your selection"; }
    else if (data.loose.length && !auto) { text = data.loose.map((f) => f.text).join("\n\n"); what = "text boxes on the page"; }

    const sig = text;
    if (text && sig !== lastSig && !(auto && document.activeElement === copy)) {
      lastSig = sig;
      setText(text, `Read ${what} from ${new URL(tab.url).hostname}.`);
    } else if (!text && !auto) {
      statusEl.textContent = isMeta(tab.url)
        ? "Couldn't find ad text fields. Open the ad editor, or select the text and click Fetch again."
        : "No ad text found. Select the text on the page and click Fetch again.";
    }

    const imgSig = data.images.map((i) => i.src || (i.data || "").slice(-40)).join("|");
    if (imgSig !== lastImgSig) { lastImgSig = imgSig; renderCreatives(data.images); }
    else if (!auto && !data.images.length) statusEl.textContent += " No creatives found.";
  } catch (e) {
    if (!auto) statusEl.textContent = "Couldn't read the page: " + (e.message || e);
  } finally { busy = false; }
}

/* ---------------- creatives ---------------- */
function findingHtml(f) {
  const sev = f.severity in SEV ? f.severity : "low";
  return `<div class="sub-finding ${sev}"><span class="tag ${sev}">${SEV[sev]}</span> <span class="t">${esc(f.title || f.category || "")}</span><br>
    <span class="w">${esc(f.why || "")}</span>${f.fix ? `<br><b>Fix:</b> ${esc(f.fix)}` : ""}</div>`;
}

const MODEL_NAMES = {
  "google/gemma-4-31b-it": "Gemma 4 31B", "google/gemma-4-26b-a4b-it": "Gemma 4 26B",
  "nvidia/nemotron-3.5-super-vl": "Nemotron 3.5 Super VL", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": "Nemotron 3 Nano Omni",
};
function modelLabel(id) { const k = String(id || "").replace(/:free$/, ""); return MODEL_NAMES[k] || k.split("/").pop(); }

const creativeState = new Map(); // idx -> {bitmap}

async function renderCreatives(images) {
  creativeState.clear();
  if (!images.length) { crvEl.innerHTML = '<p class="empty">No creatives found on this page.</p>'; return; }
  crvEl.innerHTML = "";
  images.forEach((im, idx) => {
    const card = document.createElement("div");
    card.className = "card finding";
    card.style.borderLeftColor = "var(--line)";
    card.innerHTML = `<div class="crv"><img class="thumb" alt="">
      <div class="body"><div><b>${im.kind === "video" ? "Video frame" : "Image"} ${idx + 1}</b></div>
      <div class="dims">${im.w}×${im.h}</div>
      <div class="row"><button class="deep">Deep check</button></div></div></div>
      <div class="results"><p class="meta">Analysing…</p></div>`;
    card.querySelector("img").src = im.data || im.src;
    crvEl.appendChild(card);
    const results = card.querySelector(".results");
    card.querySelector(".deep").onclick = () => deep(idx, im, results, card.querySelector(".deep"));
    analyseLocal(idx, im, results);
  });
}

async function analyseLocal(idx, im, results) {
  try {
    const blob = await Creative.toBlob(im);
    const bmp = await Creative.toBitmap(blob);
    creativeState.set(idx, { bmp });
    const f = Creative.localAnalysis(bmp);
    results.innerHTML = f.length
      ? f.map(findingHtml).join("") + `<p class="meta" style="margin-top:8px">Quick local checks only. They can't read text in the image.</p>`
      : `<p class="meta">No layout issues found by the quick local checks. They can't read text or judge content, so use Deep check for that.</p>`;
  } catch (e) {
    results.innerHTML = `<p class="meta">Couldn't read this image's pixels (${esc(e.message || e)}). Deep check needs them too.</p>`;
  }
}

async function getProvider() {
  try { return (await chrome.storage.local.get("provider")).provider || "gemma"; } catch (e) { return "gemma"; }
}
const keyName = (p) => (p === "claude" ? "apiKey" : "orKey");
async function getKey(p) {
  try { const n = keyName(p || (await getProvider())); return (await chrome.storage.local.get(n))[n] || ""; } catch (e) { return ""; }
}

async function deep(idx, im, results, btn) {
  const provider = await getProvider();
  const key = await getKey(provider);
  if (!key) { results.insertAdjacentHTML("afterbegin", `<p class="meta">Add your ${provider === "claude" ? "Anthropic" : "OpenRouter"} API key under “Deep check settings” first.</p>`); return; }
  const st = creativeState.get(idx);
  if (!st) { results.insertAdjacentHTML("afterbegin", `<p class="meta">This image's pixels couldn't be read, so it can't be sent.</p>`); return; }
  btn.disabled = true; btn.textContent = "Checking…";
  try {
    const r = provider === "claude" ? await Creative.deepCheck(st.bmp, key) : await Creative.deepCheckOpenRouter(st.bmp, key, provider);
    let html = `<div class="sub-finding low"><span class="t">Deep check</span> <span class="w">${r.model ? "· " + esc(modelLabel(r.model)) + (r.fellBack ? " (backup model)" : "") : ""}</span><br><span class="w">${esc(r.summary)}</span>${r.skipped ? `<details class="skipped"><summary>Why a backup model was used</summary>${esc(r.skipped.map((x) => x.replace(/:free(?=[:\s])/g, "")).join(" | ").replace(/https?:\/\/\S+/g, ""))}</details>` : ""}</div>`;
    html += r.incomplete ? `<div class="sub-finding medium"><span class="w">Visual risks were not assessed (incomplete answer). Run it again.</span></div>` : (r.risks.length ? r.risks.map(findingHtml).join("") : `<div class="sub-finding"><span class="w">No visual risks spotted.</span></div>`);
    if (r.text_in_image.trim()) {
      const tr = AdChecker.run(r.text_in_image);
      html += `<div class="readtext"><b>Text read from the image:</b>\n${esc(r.text_in_image)}</div>`;
      if (tr.findings.length) {
        html += `<div class="sub-finding high"><span class="t">Wording in the image</span> <span class="w">is checked against the same rules as your copy:</span></div>`;
        html += tr.findings.map((f) => findingHtml({ severity: f.severity, title: f.title, why: f.why + " Found: " + [...new Set(f.matches.map((m) => '"' + m.text + '"'))].slice(0, 3).join(", "), fix: f.fix })).join("");
      }
    }
    html += `<p class="meta" style="margin-top:8px">Advisory only. Not a guarantee of approval.</p>`;
    results.insertAdjacentHTML("afterbegin", `<div data-deep>${html}</div>`);
    btn.textContent = "Re-run deep check";
  } catch (e) {
    results.insertAdjacentHTML("afterbegin", `<p class="meta" style="white-space:pre-wrap">Deep check failed: ${esc(String(e.message || e).replace(/:free\b/g, ""))}</p>`);
    btn.textContent = "Deep check";
  } finally { btn.disabled = false; }
}

/* ---------------- buttons, settings, triggers ---------------- */
$("fetch").onclick = () => { lastSig = ""; lastImgSig = ""; fetchFromPage(); };

$("grab").onclick = async () => {
  try {
    const tab = await activeTab();
    if (!tab || isRestricted(tab.url)) { statusEl.textContent = "Can't read this page. Paste your copy instead."; return; }
    const d = await readPage(tab);
    if (d.selection.trim()) { lastSig = d.selection; setText(d.selection, "Grabbed your selection."); }
    else statusEl.textContent = "Select the text on the page first, then click Grab selection.";
  } catch (e) { statusEl.textContent = "Couldn't read the page. Paste your copy instead."; }
};
$("clear").onclick = () => { lastSig = ""; setText("", ""); copy.focus(); };
copy.addEventListener("input", () => { statusEl.textContent = ""; render(); });

async function refreshSettings() {
  const p = await getProvider();
  $("provider").value = p;
  $("keylbl").textContent = p === "claude" ? "Anthropic API key" : "OpenRouter API key";
  $("key").placeholder = p === "claude" ? "sk-ant-…" : "sk-or-…";
  $("keystate").textContent = (await getKey(p)) ? "Key saved" : "No key yet";
}
$("provider").onchange = async () => { await chrome.storage.local.set({ provider: $("provider").value }); refreshSettings(); };
$("savekey").onclick = async () => {
  const v = $("key").value.trim();
  if (!v) return;
  await chrome.storage.local.set({ [keyName(await getProvider())]: v });
  $("key").value = ""; refreshSettings();
};
$("delkey").onclick = async () => { await chrome.storage.local.remove(keyName(await getProvider())); refreshSettings(); };
refreshSettings();

// Right-click selection from the page.
async function takePending() {
  try {
    const { pending } = await chrome.storage.session.get("pending");
    if (pending && Date.now() - pending.at < 15000) {
      await chrome.storage.session.remove("pending");
      lastSig = pending.text; setText(pending.text, "From your selection.");
    }
  } catch (e) {}
}
try { chrome.storage.onChanged.addListener((c, area) => { if (area === "session" && c.pending) takePending(); }); } catch (e) {}

// Auto-read: on open, when the tab changes, and (if Live) every few seconds on Meta pages.
let debounce;
const soon = () => { clearTimeout(debounce); debounce = setTimeout(() => fetchFromPage({ auto: true }), 600); };
try {
  chrome.tabs.onActivated.addListener(() => { lastImgSig = ""; soon(); });
  chrome.tabs.onUpdated.addListener((id, info) => { if (info.status === "complete") { lastImgSig = ""; soon(); } });
} catch (e) {}
setInterval(() => { if ($("live").checked && !document.hidden) fetchFromPage({ auto: true }); }, 4000);

takePending().then(() => fetchFromPage({ auto: true }));
render();
