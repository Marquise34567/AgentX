/*
 * Postiz API client — talks to Postiz (open-source social media scheduler).
 *
 * Postiz is the open-source Buffer/Hypefury alternative that supports 27+
 * platforms (X, LinkedIn, Reddit, YouTube, TikTok, Instagram, etc).
 *
 * This module wraps the Postiz Public API:
 *   - List integrations (connected social accounts)
 *   - Create / schedule / draft posts
 *   - List posts
 *   - Delete posts
 *
 * Auth: API key from Postiz Settings, passed in Authorization header.
 *   POSTIZ_API_KEY env var or opts.apiKey
 *
 * Base URL: https://api.postiz.com/public/v1 (cloud) or self-hosted
 *   POSTIZ_BASE_URL env var or opts.baseUrl
 *
 * Rate limit: 30 requests/hour (be careful — autopilot batches count).
 *
 * Source: https://docs.postiz.com/public-api
 */

"use strict";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
function getConfig(opts = {}) {
  const apiKey = opts.apiKey || process.env.POSTIZ_API_KEY;
  const baseUrl = (opts.baseUrl || process.env.POSTIZ_BASE_URL || "https://api.postiz.com/public/v1").replace(/\/$/, "");
  return { apiKey, baseUrl };
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper
// ---------------------------------------------------------------------------
async function postizFetch(path, method = "GET", body = null, opts = {}) {
  const { apiKey, baseUrl } = getConfig(opts);
  if (!apiKey) throw new Error("No Postiz API key — set POSTIZ_API_KEY or pass opts.apiKey");

  const headers = {
    "Authorization": apiKey,
    "Content-Type": "application/json",
  };

  const fetchOpts = { method, headers };
  if (body) fetchOpts.body = JSON.stringify(body);

  const res = await fetch(baseUrl + path, fetchOpts);

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Postiz API error ${res.status}: ${errText}`);
  }

  // Some endpoints return empty body on success
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// ---------------------------------------------------------------------------
// Integrations — list connected social media accounts
// ---------------------------------------------------------------------------
async function listIntegrations(opts = {}) {
  return postizFetch("/integrations", "GET", null, opts);
}

// Find an integration by platform identifier (e.g., "x", "linkedin")
async function findIntegration(platform, opts = {}) {
  const integrations = await listIntegrations(opts);
  if (!Array.isArray(integrations)) return null;
  return integrations.find(
    (i) => i.identifier === platform && !i.disabled
  ) || null;
}

// ---------------------------------------------------------------------------
// Posts — create, list, delete
// ---------------------------------------------------------------------------

/**
 * Create a post on Postiz.
 *
 * @param {Object} params
 * @param {string} params.integrationId - The integration ID (from listIntegrations)
 * @param {string} params.content - The post text (first tweet in a thread)
 * @param {string[]} params.thread - Optional: additional tweets for a thread
 * @param {string} params.type - "now" | "schedule" | "draft" (default: "schedule")
 * @param {string} params.date - ISO 8601 date for scheduled posts (required if type=schedule)
 * @param {string} params.platform - Platform identifier: "x", "linkedin", etc (default: "x")
 * @param {Object} params.settings - Platform-specific settings (merged with defaults)
 * @param {string[]} params.mediaUrls - Optional media URLs to attach
 * @param {boolean} params.shortLink - Use short links (default: true)
 * @param {Object} opts - API options (apiKey, baseUrl)
 * @returns {Promise<Object>} The created post
 */
async function createPost(params, opts = {}) {
  const {
    integrationId,
    content,
    thread = [],
    type = "schedule",
    date,
    platform = "x",
    settings = {},
    mediaUrls = [],
    shortLink = true,
  } = params;

  if (!integrationId) throw new Error("integrationId is required");
  if (!content) throw new Error("content is required");
  if (type === "schedule" && !date) throw new Error("date is required for type=schedule (ISO 8601)");

  // Build the posts array — first content + thread replies
  const allContent = [content, ...thread];
  const posts = [{
    integration: { id: integrationId },
    value: allContent.map((c, i) => ({
      content: c,
      ...(mediaUrls[i] ? { media: [mediaUrls[i]] } : {}),
    })),
    settings: buildSettings(platform, settings),
  }];

  const body = {
    type,
    ...(type === "schedule" ? { date } : {}),
    shortLink,
    tags: [],
    posts,
  };

  return postizFetch("/posts", "POST", body, opts);
}

/**
 * List posts within a date range.
 */
async function listPosts(startDate, endDate, opts = {}) {
  const params = new URLSearchParams();
  if (startDate) params.append("start", startDate);
  if (endDate) params.append("end", endDate);
  const qs = params.toString();
  return postizFetch("/posts" + (qs ? "?" + qs : ""), "GET", null, opts);
}

/**
 * Delete a post by ID.
 */
async function deletePost(postId, opts = {}) {
  return postizFetch(`/posts/${postId}`, "DELETE", null, opts);
}

// ---------------------------------------------------------------------------
// Platform settings builder
// ---------------------------------------------------------------------------
function buildSettings(platform, custom = {}) {
  const defaults = {
    x: { __type: "x", who_can_reply_post: "everyone" },
    linkedin: { __type: "linkedin" },
    "linkedin-page": { __type: "linkedin-page" },
    facebook: { __type: "facebook" },
    instagram: { __type: "instagram", post_type: "post" },
    "instagram-standalone": { __type: "instagram-standalone", post_type: "post" },
    threads: { __type: "threads" },
    bluesky: { __type: "bluesky" },
    mastodon: { __type: "mastodon" },
    reddit: { __type: "reddit", subreddit: [] },
    discord: { __type: "discord", channel: "" },
    youtube: { __type: "youtube", title: "", type: "public" },
    tiktok: { __type: "tiktok", privacy_level: "PUBLIC_TO_EVERYONE", duet: true, stitch: true, comment: true, autoAddMusic: true, brand_content_toggle: false, brand_organic_toggle: false, content_posting_method: "DIRECT_POST" },
    telegram: { __type: "telegram" },
    medium: { __type: "medium", title: "", subtitle: "" },
    devto: { __type: "devto", title: "" },
    hashnode: { __type: "hashnode", title: "", tags: [] },
    wordpress: { __type: "wordpress", title: "", type: "post" },
  };

  const base = defaults[platform] || { __type: platform };
  return { ...base, ...custom };
}

// ---------------------------------------------------------------------------
// Best time to post calculator (from AgentX research)
// ---------------------------------------------------------------------------
const BEST_TIMES = {
  // Tue-Thu 8-11 AM ET, Wed 9 AM = peak
  // Lunch 12-1 PM, evenings 5-6 PM for threads
  // Worst: weekends, 6-11 PM
  peak: "Wed 09:00 ET",
  slots: [
    { day: 2, hour: 9, label: "Tue 9 AM ET", weight: 1.0 },    // Tuesday
    { day: 3, hour: 9, label: "Wed 9 AM ET", weight: 1.17 },   // Wednesday (peak, +17%)
    { day: 4, hour: 9, label: "Thu 9 AM ET", weight: 1.0 },    // Thursday
    { day: 2, hour: 10, label: "Tue 10 AM ET", weight: 0.95 },
    { day: 3, hour: 10, label: "Wed 10 AM ET", weight: 1.1 },
    { day: 4, hour: 10, label: "Thu 10 AM ET", weight: 0.95 },
    { day: 2, hour: 11, label: "Tue 11 AM ET", weight: 0.9 },
    { day: 3, hour: 11, label: "Wed 11 AM ET", weight: 1.05 },
    { day: 4, hour: 11, label: "Thu 11 AM ET", weight: 0.9 },
    { day: 2, hour: 12, label: "Tue 12 PM ET", weight: 0.85 }, // lunch
    { day: 3, hour: 12, label: "Wed 12 PM ET", weight: 0.9 },
    { day: 4, hour: 12, label: "Thu 12 PM ET", weight: 0.85 },
    { day: 2, hour: 17, label: "Tue 5 PM ET", weight: 0.75 },  // evening (threads)
    { day: 3, hour: 17, label: "Wed 5 PM ET", weight: 0.8 },
    { day: 4, hour: 17, label: "Thu 5 PM ET", weight: 0.75 },
  ],
};

/**
 * Calculate the next best posting time from now.
 * Returns an ISO 8601 string in UTC.
 *
 * @param {Date} from - Starting point (default: now)
 * @param {number} skipSlots - How many best slots to skip (for scheduling multiple posts)
 * @returns {{ iso: string, label: string, weight: number }}
 */
function nextBestTime(from = new Date(), skipSlots = 0) {
  // Convert from to ET (America/New_York) to figure out day/hour
  // ET is UTC-5 (EST) or UTC-4 (EDT). We'll use a simple approach:
  // get the ET hour by offsetting UTC
  const etOffset = getETOffset(from);
  const etHour = (from.getUTCHours() + 24 + etOffset) % 24;
  const etDay = getETDay(from, etOffset);

  // Sort slots by weight (best first), then find the next upcoming one
  const sortedSlots = [...BEST_TIMES.slots].sort((a, b) => b.weight - a.weight);

  // For each slot, calculate how many hours until it occurs
  const candidates = sortedSlots.map((slot) => {
    let dayDiff = (slot.day - etDay + 7) % 7;
    let hourDiff = slot.hour - etHour;
    if (dayDiff === 0 && hourDiff <= 0) dayDiff = 7; // next week if passed today
    const totalHours = dayDiff * 24 + hourDiff;
    return { ...slot, hoursUntil: totalHours };
  });

  // Sort by hoursUntil, then by weight
  candidates.sort((a, b) => {
    if (a.hoursUntil !== b.hoursUntil) return a.hoursUntil - b.hoursUntil;
    return b.weight - a.weight;
  });

  // Pick the slot at index skipSlots
  const chosen = candidates[Math.min(skipSlots, candidates.length - 1)];

  // Calculate the actual UTC time
  const result = new Date(from.getTime() + chosen.hoursUntil * 60 * 60 * 1000);
  // Round to the top of the hour
  result.setUTCMinutes(0, 0, 0);

  return {
    iso: result.toISOString(),
    label: chosen.label,
    weight: chosen.weight,
    hoursUntil: chosen.hoursUntil,
  };
}

function getETOffset(date) {
  // ET is UTC-5 (EST, Nov-Mar) or UTC-4 (EDT, Mar-Nov)
  // Simple approximation: EDT from second Sunday in March to first Sunday in November
  const month = date.getUTCMonth();
  if (month >= 2 && month <= 10) return -4; // EDT (Mar-Nov)
  return -5; // EST
}

function getETDay(date, etOffset) {
  // Calculate the day of week in ET
  const etMs = date.getTime() + etOffset * 60 * 60 * 1000;
  const etDate = new Date(etMs);
  // 0=Sun, 1=Mon, ..., 6=Sat — but our slots use 2=Tue, 3=Wed, 4=Thu
  return etDate.getUTCDay();
}

module.exports = {
  listIntegrations,
  findIntegration,
  createPost,
  listPosts,
  deletePost,
  buildSettings,
  nextBestTime,
  BEST_TIMES,
  getConfig,
};
