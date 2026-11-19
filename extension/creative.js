// Creative analysis: local pixel heuristics + optional Claude vision check.
(function (root) {
  async function toBlob(item) {
    const url = item.data || item.src;
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.blob();
  }

  async function toBitmap(blob) {
    return createImageBitmap(blob);
  }

  function drawScaled(bmp, maxSide) {
    const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return { c, ctx };
  }

  function gray(ctx, w, h) {
    const d = ctx.getImageData(0, 0, w, h).data;
    const g = new Float32Array(w * h);
    for (let i = 0, j = 0; i < d.length; i += 4, j++) g[j] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    return g;
  }

  const RATIOS = [
    ["1:1", 1, "Feed square"],
    ["4:5", 0.8, "Feed portrait"],
    ["9:16", 0.5625, "Stories / Reels"],
    ["1.91:1", 1.91, "Link / landscape"],
  ];

  // Returns [{severity,title,why,fix}] findings. These are indicative only.
  function localAnalysis(bmp) {
    const out = [];
    const ratio = bmp.width / bmp.height;
    const near = RATIOS.find(([, r]) => Math.abs(ratio - r) / r < 0.04);
    if (!near) {
      out.push({
        severity: "low", title: "Unusual aspect ratio",
        why: `This image is ${bmp.width}×${bmp.height} (${ratio.toFixed(2)}:1). Meta crops it differently per placement, so text or the product can get cut off.`,
        fix: "Use 1:1 or 4:5 for Feed and 9:16 for Stories/Reels, with key content in the centre.",
      });
    }
    if (Math.min(bmp.width, bmp.height) < 600) {
      out.push({
        severity: "medium", title: "Low resolution",
        why: `Smallest side is ${Math.min(bmp.width, bmp.height)}px. Low-quality creatives get less delivery and can look unprofessional. This may also just be the dashboard's thumbnail.`,
        fix: "Upload at least 1080 px on the short side.",
      });
    }

    const { ctx, c } = drawScaled(bmp, 256);
    const w = c.width, h = c.height;
    const g = gray(ctx, w, h);

    // Side-by-side split (possible before/after): strong, consistent seam near the centre.
    function seam(vertical) {
      const len = vertical ? w : h, span = vertical ? h : w;
      const at = (a, b) => (vertical ? g[b * w + a] : g[a * w + b]);
      const col = new Float32Array(len - 1);
      for (let a = 0; a < len - 1; a++) {
        let s = 0;
        for (let b = 0; b < span; b++) s += Math.abs(at(a, b) - at(a + 1, b));
        col[a] = s / span;
      }
      const mid = Math.floor(len / 2);
      let best = 0, bi = mid;
      for (let a = mid - Math.floor(len * 0.08); a <= mid + Math.floor(len * 0.08); a++) {
        if (col[a] > best) { best = col[a]; bi = a; }
      }
      const mean = col.reduce((x, y) => x + y, 0) / col.length;
      let m1 = 0, n1 = 0, m2 = 0, n2 = 0;
      for (let a = 0; a < len; a++) for (let b = 0; b < span; b++) {
        if (a < len / 2) { m1 += at(a, b); n1++; } else { m2 += at(a, b); n2++; }
      }
      return { strength: best / (mean + 1e-6), best, at: bi / len, halfDiff: Math.abs(m1 / n1 - m2 / n2) };
    }
    const v = seam(true), hz = seam(false);
    const strong = (s) => s.strength > 5 && s.best > 22 && Math.abs(s.at - 0.5) < 0.04 && s.halfDiff > 18;
    if (strong(v) || strong(hz)) {
      out.push({
        severity: "low", title: "Two-panel layout",
        why: "A hard divide near the centre with clearly different halves. Fine for testimonials or product comparisons, but Meta prohibits before/after body or weight-loss comparisons.",
        fix: "Ignore this if the panels are not comparing bodies or results. Otherwise use a product-in-use or neutral image.",
        low: true,
      });
    }

    // Text/graphic density: share of grid cells with dense edges.
    const gx = 8, gy = 8;
    let dense = 0, cells = 0;
    for (let cy = 0; cy < gy; cy++) for (let cx = 0; cx < gx; cx++) {
      let e = 0, n = 0;
      const x0 = Math.floor((cx * w) / gx), x1 = Math.floor(((cx + 1) * w) / gx);
      const y0 = Math.floor((cy * h) / gy), y1 = Math.floor(((cy + 1) * h) / gy);
      for (let y = y0 + 1; y < y1; y++) for (let x = x0 + 1; x < x1; x++) {
        const i = y * w + x;
        if (Math.abs(g[i] - g[i - 1]) + Math.abs(g[i] - g[i - w]) > 60) e++;
        n++;
      }
      cells++;
      if (n && e / n > 0.12) dense++;
    }
    if (dense / cells > 0.55) {
      out.push({
        severity: "low", title: "Busy or text-heavy image",
        why: "Many areas of the image have dense detail, which usually means a lot of overlay text or clutter. This is only a rough signal, and I can't read the text locally.",
        fix: "Use Deep check to have the image text read and checked against the same rules as your copy.",
        low: true,
      });
    }
    return out;
  }

  async function shrinkToJpegBase64(bmp, maxSide) {
    const { c } = drawScaled(bmp, maxSide);
    const url = c.toDataURL("image/jpeg", 0.85);
    return url.split(",")[1];
  }

  const PROMPT = `You review Meta (Facebook/Instagram) ad creatives for policy risk, for advertisers in India. Look only at what is visible in the image.
Return ONLY a JSON object, no other text, keep every field concise (under 60 words each):
{"text_in_image": "<all readable text in the image, line by line>",
 "summary": "<one sentence on what the creative shows>",
 "risks": [{"category": "<policy area>", "severity": "high|medium|low", "issue": "<what you see>", "why": "<why Meta or ASCI may object>", "fix": "<specific change>"}]}
Check for: before/after or side-by-side body or weight-loss comparisons; close-ups of body parts or pinched fat; text that implies the viewer's personal attributes (health, finances, age, religion, orientation); income or payout screenshots, cash, luxury cars; guaranteed-outcome, job or placement guarantee text; fake UI (fake play buttons, fake notifications or chat bubbles, fake close buttons); nudity or suggestive content; shocking or sensational imagery; misleading before/after of products; celebrity faces or logos that suggest unauthorised endorsement; prohibited or restricted products (payday loans, crypto, drugs, weapons).
Only report issues you can actually see. If nothing is risky, return "risks": []. This is advisory and is not a guarantee of approval.`;


  function parseModelJson(txt) {
    const s = String(txt || "");
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        const p = JSON.parse(m[0]);
        return {
          text_in_image: String(p.text_in_image || ""),
          summary: String(p.summary || ""),
          risks: Array.isArray(p.risks) ? p.risks : [],
        };
      } catch (e) { /* fall through to salvage */ }
    }
    // Salvage: the answer was cut off or malformed. Recover whatever text was read.
    const t = s.match(/"text_in_image"\s*:\s*"((?:[^"\\]|\\.)*)/);
    let text = "";
    if (t) { try { text = JSON.parse('"' + t[1] + '"'); } catch (e) { text = t[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'); } }
    return {
      text_in_image: text,
      summary: text ? "The model's answer was cut off, so only the text it read is shown. Visual risks were not assessed." : "The model's answer was empty or unusable. Try again.",
      risks: [],
      incomplete: true,
    };
  }

  // IDs checked against OpenRouter's public model list on 2026-11-19 (image input).
  const OR_CHAINS = {
    gemma: ["google/gemma-4-31b-it:free", "google/gemma-4-26b-a4b-it:free", "nvidia/nemotron-3.5-super-vl:free"],
    nemotron: ["nvidia/nemotron-3.5-super-vl:free", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free"],
  };

  async function openRouterOnce(bmp, key, model) {
    const b64 = await shrinkToJpegBase64(bmp, 1280);
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": "Bearer " + key,
        "x-title": "Ad Policy Pre-Checker",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        temperature: 0.2,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: PROMPT },
            { type: "image_url", image_url: { url: "data:image/jpeg;base64," + b64 } },
          ],
        }],
      }),
    });
    const bodyText = await res.text();
    let j = null; try { j = JSON.parse(bodyText); } catch (e) {}
    if (!res.ok || (j && j.error)) {
      let detail = (j && j.error && (j.error.message || JSON.stringify(j.error))) || "HTTP " + res.status;
      const md = j && j.error && j.error.metadata;
      if (md) {
        if (md.provider_name) detail += ` [provider: ${md.provider_name}]`;
        if (md.raw) detail += ` [raw: ${String(typeof md.raw === "string" ? md.raw : JSON.stringify(md.raw)).slice(0, 300)}]`;
      }
      const err = new Error(detail);
      err.status = res.status;
      throw err;
    }
    const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!txt) {
      const why = j && j.choices && j.choices[0] && j.choices[0].finish_reason;
      throw Object.assign(new Error("Empty answer from the model" + (why ? " (finish: " + why + ")" : "")), { status: 0 });
    }
    const out = parseModelJson(Array.isArray(txt) ? txt.map((p) => p.text || "").join("") : txt);
    out.model = model;
    return out;
  }

  // Tries each model in the chain. Auth and billing errors stop immediately (every model would fail the same way).
  async function deepCheckOpenRouter(bmp, key, provider) {
    const chain = OR_CHAINS[provider] || OR_CHAINS.gemma;
    const errors = [];
    for (const model of chain) {
      try {
        const r = await openRouterOnce(bmp, key, model);
        if (errors.length) { r.fellBack = true; r.skipped = errors; }
        return r;
      } catch (e) {
        if (e.status === 401 || e.status === 402 || e.status === 403) throw new Error(`OpenRouter rejected the key or account (${e.status}): ${e.message}`);
        errors.push(`${model.replace(/:free$/, "")}: ${e.message.replace(/:free\b/g, "")}`);
      }
    }
    throw new Error("All models failed.\n" + errors.join("\n"));
  }

  async function deepCheck(bmp, apiKey) {
    const b64 = await shrinkToJpegBase64(bmp, 1280);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1500,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: b64 } },
            { type: "text", text: PROMPT },
          ],
        }],
      }),
    });
    if (!res.ok) {
      let msg = "HTTP " + res.status;
      try { const j = await res.json(); if (j.error && j.error.message) msg += ": " + j.error.message; } catch (e) {}
      throw new Error(msg);
    }
    const j = await res.json();
    const txt = (j.content || []).map((p) => p.text || "").join("");
    return parseModelJson(txt);
  }

  root.Creative = { toBlob, toBitmap, localAnalysis, deepCheck, deepCheckOpenRouter };
})(window);
