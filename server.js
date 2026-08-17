/*
 * AgentX server — zero-dependency Node HTTP server.
 *
 * Serves the chatbox webapp (public/index.html) and exposes:
 *   POST /api/chat   { message: string }  ->  { reply: {...} }
 *   GET  /api/health                       ->  { ok: true }
 *
 * Runs on PORT env var (Railway sets this) or 3000 locally.
 */

"use strict";

// ---------------------------------------------------------------------------
// Zero-dependency .env loader — reads .env file in project root if it exists
// (so you can set POSTIZ_API_KEY, POSTIZ_BASE_URL, etc. without system env vars)
// ---------------------------------------------------------------------------
(function loadEnv() {
  try {
    const fs = require("fs");
    const path = require("path");
    const envPath = path.join(__dirname, ".env");
    if (fs.existsSync(envPath)) {
      const lines = fs.readFileSync(envPath, "utf8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
      console.log("[env] loaded .env file");
    }
  } catch (e) {
    // Silent — .env is optional
  }
})();

const http = require("http");
const fs = require("fs");
const path = require("path");
const { route } = require("./chatRouter");
const { improveWithAI } = require("./aiRewriter");
const { extractProfile, serialize, deserialize } = require("./voiceProfile");
const { ingestCSV, getStats, trackPost, updateTrackedPost, clearData } = require("./analytics");
const { addFeedback, addBatchFeedback, getLearningState, startWorker } = require("./learningWorker");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

// In-memory voice profile store (persists for the session)
let _voiceProfile = null;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json",
};

function serveStatic(req, res) {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  // security: block path traversal
  const filePath = path.normalize(path.join(PUBLIC_DIR, urlPath));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) { req.destroy(); reject(new Error("body too large")); }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS (handy if frontend is served elsewhere during dev)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && req.url.split("?")[0] === "/api/health") {
    const postizConfigured = !!(process.env.POSTIZ_API_KEY);
    const postizUrl = process.env.POSTIZ_BASE_URL || "https://api.postiz.com/public/v1";
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      service: "agentx",
      ts: Date.now(),
      postiz: {
        configured: postizConfigured,
        url: postizConfigured ? postizUrl : null,
        selfHosted: !postizUrl.includes("api.postiz.com"),
      },
    }));
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/chat") {
    try {
      const raw = await readBody(req);
      let message = "";
      try { message = (JSON.parse(raw)).message || ""; } catch { message = raw; }
      const reply = await route(message);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ reply }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- AI rewrite (BYOK) ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/ai-rewrite") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { draft, apiKey, baseUrl, model, includeSelfReply } = body;
      if (!draft) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "draft is required" }));
        return;
      }
      const result = await improveWithAI(draft, {
        apiKey: apiKey || process.env.OPENAI_API_KEY || process.env.AGENTX_API_KEY,
        baseUrl,
        model,
        voiceProfile: _voiceProfile,
        includeSelfReply,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Voice profile ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/voice-profile") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { posts } = body;
      if (!posts || !Array.isArray(posts) || !posts.length) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "posts array is required" }));
        return;
      }
      _voiceProfile = extractProfile(posts);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ profile: _voiceProfile, description: _voiceProfile?.description }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.split("?")[0] === "/api/voice-profile") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ profile: _voiceProfile, description: _voiceProfile?.description || null }));
    return;
  }

  // --- Analytics ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/analytics/ingest") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { csv } = body;
      if (!csv) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "csv is required" }));
        return;
      }
      const result = ingestCSV(csv);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.split("?")[0] === "/api/analytics/stats") {
    try {
      const stats = getStats();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ stats }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/analytics/track") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { text, agentxScore, agentxGrade } = body;
      if (!text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "text is required" }));
        return;
      }
      const result = trackPost(text, agentxScore, agentxGrade);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/analytics/clear") {
    try {
      clearData();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ cleared: true }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Feedback / Learning ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/feedback") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { post, rating, metrics } = body;
      if (!post) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "post is required" }));
        return;
      }
      const result = addFeedback(post, rating, metrics);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "POST" && req.url.split("?")[0] === "/api/feedback/batch") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { posts } = body;
      if (!posts || !Array.isArray(posts)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "posts array is required" }));
        return;
      }
      const result = addBatchFeedback(posts);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET" && req.url.split("?")[0] === "/api/learning") {
    try {
      const state = getLearningState();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ state }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Sprinter (post generator) ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/sprint") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { topic, angle, count } = body;
      if (!topic) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "topic is required" }));
        return;
      }
      const { sprint } = require("./sprinter");
      const result = sprint({ topic, angle, count: count || 6 });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Autopilot (generate + polish + schedule via Postiz) ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/autopilot") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { topic, angle, count, platform, dryRun, includeSelfReply, samplePosts } = body;
      if (!topic) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "topic is required" }));
        return;
      }
      const { runAutopilot } = require("./autopilot");
      const result = await runAutopilot({
        topic,
        angle,
        count: count || 3,
        platform: platform || "x",
        voiceProfile: _voiceProfile,
        samplePosts: samplePosts || null,
        dryRun: dryRun !== false, // default to dry run for safety
        includeSelfReply: includeSelfReply !== false,
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ result }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Postiz: schedule a single post at the next best time ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/postiz/schedule") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { content, platform = "x", type = "schedule", date } = body;
      if (!content) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "content is required" }));
        return;
      }
      const { nextBestTime, findIntegration, createPost } = require("./postiz");
      const apiKey = process.env.POSTIZ_API_KEY;
      if (!apiKey) {
        // Dry run — return what would be scheduled
        const best = nextBestTime(new Date(), 0);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          scheduled: false,
          dryRun: true,
          reason: "no POSTIZ_API_KEY set",
          scheduledAt: best.iso,
          scheduledLabel: best.label,
        }));
        return;
      }
      const opts = { apiKey };
      const integration = await findIntegration(platform, opts);
      if (!integration) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          scheduled: false,
          reason: `no ${platform} integration found in Postiz`,
        }));
        return;
      }
      const scheduledDate = date || nextBestTime(new Date(), 0).iso;
      const result = await createPost({
        integrationId: integration.id,
        content,
        type,
        date: scheduledDate,
        platform,
      }, opts);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        scheduled: true,
        scheduledAt: scheduledDate,
        integration: { name: integration.name, profile: integration.profile, platform },
        postizResult: result,
      }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Postiz: list connected integrations ---
  if (req.method === "GET" && req.url.split("?")[0] === "/api/postiz/integrations") {
    try {
      const { listIntegrations } = require("./postiz");
      const apiKey = process.env.POSTIZ_API_KEY;
      if (!apiKey) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ integrations: [], reason: "no POSTIZ_API_KEY set" }));
        return;
      }
      const integrations = await listIntegrations({ apiKey });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ integrations }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // --- Marketing Agent (scrape website + generate marketing strategy) ---
  if (req.method === "POST" && req.url.split("?")[0] === "/api/market") {
    try {
      const raw = await readBody(req);
      const body = JSON.parse(raw);
      const { url } = body;
      if (!url) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "url is required" }));
        return;
      }
      const { analyze, formatStrategy } = require("./marketingAgent");
      const strategy = await analyze(url, { useBrowser: body.useBrowser || "auto" });
      if (strategy.error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: strategy.error }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ strategy, markdown: formatStrategy(strategy) }));
    } catch (e) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "method not allowed" }));
});

server.listen(PORT, () => {
  console.log(`AgentX running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Endpoints: /api/chat, /api/ai-rewrite, /api/sprint, /api/autopilot, /api/postiz/schedule, /api/postiz/integrations, /api/market, /api/voice-profile, /api/analytics/ingest, /api/analytics/stats, /api/analytics/track, /api/feedback, /api/learning`);
  if (process.env.POSTIZ_API_KEY) {
    const url = process.env.POSTIZ_BASE_URL || "https://api.postiz.com/public/v1";
    console.log(`Postiz: connected (${url})`);
  } else {
    console.log(`Postiz: not configured (create .env from .env.example)`);
  }

  // Start the learning worker (runs in the same process)
  // On Railway, this runs continuously and learns from real feedback
  if (process.env.DISABLE_WORKER !== "true") {
    startWorker({ intervalMs: 5000 });
  }
});

module.exports = server;
