// Cloudflare Worker: a tiny server that rewrites text with an AI provider you choose.
// It keeps your API key secret and only accepts requests from your own website.
//
// Variables to set in Cloudflare (Settings > Variables and Secrets):
//   BASE_URL        e.g. https://api.groq.com/openai/v1  (any OpenAI-compatible provider)
//   MODEL           a current model name from that provider's documentation
//   API_KEY         your provider key (add it as a Secret, not plain text)
//   ALLOWED_ORIGIN  https://dr-pr-anand25.github.io

const SYS = "You are a careful academic editor. Rewrite the text so it reads like a thoughtful human wrote it, not an AI. Work sentence by sentence: write one output sentenc" +
  "e for each input sentence, in the same order, and keep paragraph breaks and headings. In every sentence change the wording and the sentence structure (for examp" +
  "le turn a verb into a noun phrase or the reverse, move a clause to the front, or switch between active and passive), but keep every fact. Hard rules. (1) Never " +
  "change, round, approximate or hedge any number, percentage, date, statistic or equation, and never put about, around, roughly, nearly or approximately next to a" +
  " number. (2) Keep every technical term, model name, metric name, abbreviation and hyphenated compound exactly as written, for example rule-based, low-variance, " +
  "P&L, Sharpe, Calmar, NIFTY 50, bull put credit spread. Never replace a technical word with a different concept, for example never turn ablation into elimination" +
  ". (3) Keep the strength of every claim: do not add or remove words such as may, often, always, significantly, only. (4) Do not add claims, examples, filler or e" +
  "xplanations, and do not drop information. (5) Use plain direct wording, avoid stock AI phrases such as delve, tapestry, leverage, furthermore, moreover, in conc" +
  "lusion, pivotal, seamless, and do not use em dashes, lists or quotation marks. Output only the rewritten text.";

const STYLES = {
  casual: "casual and conversational, contractions allowed",
  creative: "creative, vivid, varied rhythm",
  academic: "academic, precise and measured, no contractions",
  formal: "formal and professional, no contractions"
};
const LENGTHS = {
  short: "about 25% shorter, cutting filler but no facts",
  std: "about the same length",
  long: "about 25% longer, adding natural connecting words but no new facts"
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
    const ok = allowed.length === 0 || allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": ok ? origin || "*" : "null",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!ok) return json({ error: "Origin not allowed" }, 403, cors);

    let b;
    try { b = await request.json(); } catch (_) { return json({ error: "Bad JSON" }, 400, cors); }
    const text = String(b.text || "").trim();
    if (!text) return json({ error: "No text" }, 400, cors);
    if (text.split(/\s+/).length > 300) return json({ error: "Passage too long (300 words max)" }, 413, cors);

    const base = String(env.BASE_URL || "").replace(/\/$/, "");
    if (!base || !env.MODEL || !env.API_KEY) return json({ error: "Server is missing BASE_URL, MODEL or API_KEY" }, 500, cors);

    const keep = Array.isArray(b.keep) ? b.keep.map(String).slice(0, 30) : [];
    const user =
      "Style: " + (STYLES[b.style] || STYLES.casual) + ".\n" +
      "Length: " + (LENGTHS[b.length] || LENGTHS.std) + ".\n" +
      (keep.length ? "Keep these terms exactly as written: " + keep.join(", ") + ".\n" : "") +
      (b.extra ? String(b.extra).slice(0, 600) + "\n" : "") +
      "\nText:\n" + text;
    let t = Number(b.temperature);
    if (!(t >= 0 && t <= 1.2)) t = 0.6;

    let r;
    try {
      r = await fetch(base + "/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + env.API_KEY },
        body: JSON.stringify({
          model: env.MODEL,
          messages: [{ role: "system", content: SYS }, { role: "user", content: user }],
          temperature: t,
          max_tokens: 1500
        })
      });
    } catch (e) {
      return json({ error: "Could not reach the AI provider" }, 502, cors);
    }
    if (!r.ok) {
      const msg = (await r.text()).slice(0, 200);
      return json({ error: "Provider " + r.status + ": " + msg }, 502, cors);
    }
    const j = await r.json();
    const out = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    return json({ text: out || "" }, 200, cors);
  }
};
