# AgentX

Autonomous X (Twitter) engagement engine. Grades posts A+→F on the 2026 X
algorithm and rewrites them until they hit an A grade. Features a 22-signal
Phoenix scoring model, self-reply engine, voice-calibrated AI rewrites, and
analytics closed-loop. Zero-dependency Node HTTP server + chatbox frontend.
Deployable to Railway as-is.

## Run
- `npm start` (or `node server.js`) → http://localhost:3000 (PORT env override)
- `npm test` → runs the sample-post smoke test
- Health: `GET /api/health` · Chat: `POST /api/chat { message }`

## API Endpoints
- `POST /api/chat { message }` — chat interface (score, improve, compare, self-reply, sprint, autopilot, analytics, FAQ)
- `POST /api/sprint { topic, angle?, count? }` — generate scroll-stopping posts from a topic (real X algorithm)
- `POST /api/autopilot { topic, angle?, count?, platform?, dryRun?, includeSelfReply? }` — generate + polish + schedule posts at best times via Postiz
- `POST /api/postiz/schedule { content, platform?, type?, date? }` — schedule a single post at the next best time via Postiz (dry run if no API key)
- `GET /api/postiz/integrations` — list connected Postiz integrations (X, LinkedIn, etc)
- `POST /api/ai-rewrite { draft, apiKey?, baseUrl?, model?, includeSelfReply? }` — voice-calibrated AI rewrite (BYOK)
- `POST /api/voice-profile { posts: [string] }` — upload sample posts to fingerprint your voice
- `GET /api/voice-profile` — get current voice profile
- `POST /api/analytics/ingest { csv }` — ingest X Analytics CSV for calibration
- `GET /api/analytics/stats` — get calibration stats + score→performance correlation
- `POST /api/analytics/track { text, agentxScore, agentxGrade }` — track a posted post
- `POST /api/analytics/clear` — clear analytics data
- `GET /api/health` — health check

## Chat Commands
- Paste a post → grade + auto-rewrite to A
- `sprint: <topic or idea>` → generate scroll-stopping posts from any input (topic, idea, question, story, draft)
- `market: <url>` → scrape a website and generate a full marketing strategy (outcomes, problems, audience, channels, post ideas)
- `autopilot: <topic>` → generate + polish + schedule posts at best times via Postiz (dry run by default)
- `score: <post>` / `grade: <post>` → score only
- `improve: <post>` → rewrite only
- `self-reply: <post>` → generate self-reply + reply-chain plan
- `analytics` / `calibrate` / `stats` → see calibration stats
- `compare A vs B` (or `---` between) → head-to-head
- Ask "what makes a post viral" / "best time to post" / "how does the algo work"

## Architecture
- `engagementAlgo.js` — scoring engine (10 weighted dimensions + 22-signal Phoenix model)
- `signalModel.js` — 22-signal prediction engine (xai-org/x-algorithm taxonomy)
- `improver.js` — rule-based iteration engine (rewrites until A grade, max 6 rounds)
- `selfReplyEngine.js` — self-reply generator + reply-chain planner (+75 signal capture)
- `voiceProfile.js` — voice fingerprinting from sample posts (style, hooks, punctuation, tone)
- `aiRewriter.js` — BYOK LLM rewriter with voice calibration (OpenAI-compatible, falls back to rule-based)
- `analytics.js` — X Analytics CSV ingest, calibration, score→performance tracking
- `viralTemplates.js` — proven viral format detection (2026 research)
- `postAnalyzer.js` — semantic analysis/classification layer (post DNA, tension, topic extraction)
- `smartRewriter.js` — content-specific rewrite generation using hook library + tension analysis
- `sprinter.js` — post generator (now powered by the content engine — real insights, not templates)
- `ideaParser.js` — understands any input (topic, full idea, question, story, rough draft) and extracts its core meaning
- `factExtractor.js` — pulls specific facts (numbers, tools, metrics, results) from user input and structures them into the proven viral format
- `contentEngine.js` — senior copywriter engine: angle finder + insight database + quality checking + iteration
- `iterationEngine.js` — real-time iteration loop: re-iterates low-rated posts until B/A grade, reverts if score decreases
- `honestFeedback.js` — tells you when a post won't perform and why, suggests what details to add
- `marketingAgent.js` — scrapes any website and generates a full marketing strategy (outcomes, problems, audience, channels, post ideas). Supports JS-heavy sites via structured data extraction (JSON-LD, Next.js __NEXT_DATA__) + Puppeteer headless browser fallback.
- `angleFinder.js` — finds the highest-engagement angle for a topic (contrarian, story, data, specific)
- `qualityChecker.js` — catches generic/slop writing and forces rewrites (100+ slop phrases detected)
- `copywriter.js` — voice-aware style transfer engine (stylometric profiling + n-gram phrase banks, NO LLMs)
- `postiz.js` — Postiz API client (open-source scheduler, 27+ platforms: X, LinkedIn, Reddit, etc)
- `autopilot.js` — senior copywriter agent: sprint → polish in voice → schedule at best times via Postiz
- `hookLibrary.js` — 100 proven viral hook frameworks from open-source projects (jakeolschewski/viral-hook-formulas, Blotato-Inc/blotato-skills, xai-org/x-algorithm)
- `chatRouter.js` — intent parser → score / improve / compare / self-reply / analytics / FAQ
- `topicAnalyzer.js` — deep topic understanding: extracts subject, audience, action, benefit, outcome, comparative from any input. Detects product announcements, product descriptions, milestones, opinions, predictions, confessions. Generates topic-specific hooks, outcome-focused bodies, and audience-aware closers. Uses context-clue engine to understand products it has never seen before.
- `audienceDatabase.js` — 29 X communities (founders, indie hackers, SaaS founders, software developers, build in public, video editors, YouTubers, podcasters, streamers, designers, writers, marketers, freelancers, agencies, fitness coaches, real estate agents, musicians, AI builders, no-code builders, investors, e-commerce owners, local business owners, course creators, crypto builders, sales pros, product managers, students, digital nomads, newsletter writers) with their vocabulary, pain points, goals, metrics, tools, hook/body/closer styles, and content types. 1000+ audience variations through alias matching.
- `contextClues.js` — context-clue engine that understands ANY product/tool by decomposing its name into morphemes (auto+editor, screen+recorder, ai+caption+generator) and inferring what it does, who it's for, and what benefit it provides. 90+ morphemes covering actions (edit, record, transcribe, caption, clip, compress, design, write, generate, deploy, etc.), modifiers (auto, ai, smart, quick, pro, easy, free, instant, batch, etc.), and media (video, audio, screen, image, text, code, music, podcast, stream, thumbnail, etc.).
- `viralFormats.js` — 19 viral post structures researched from real 2026 X data: Contrarian Hook+Story, Vulnerable Failure→Win, Short Story/Narrative Arc, Dialogue, Proof→Story→Lesson, Problem→Build→Result, Hot Take→Evidence→Invitation, I Was Wrong→What Changed, Build Log/Day X, Customer Pain Story, Public Teardown, I Changed One Thing, Revenue/Traction Reveal, Audience-in-the-Loop Decision, Behind-the-Scenes Data, Steal My System, AI Tool List, Launch Announcement, Screen Recording Demo. Each format has hook/body/closer templates and is mapped to the niches where it performs best.
- `server.js` — pure-Node HTTP server (no deps), serves `public/` + `/api/*`
- `public/index.html` — chatbox UI (markdown rendering, grade chips, signal predictions)
- `RESEARCH.md` — sources & signal weights
- `reference/` — original Python implementation (kept for reference)

## Environment Variables
- `PORT` — server port (default 3000, set by Railway)
- `OPENAI_API_KEY` or `AGENTX_API_KEY` — API key for AI rewrites (optional, BYOK)
- `OPENAI_BASE_URL` — custom OpenAI-compatible endpoint (optional)
- `AGENTX_MODEL` — model name (default gpt-4o)
- `POSTIZ_API_KEY` — Postiz API key for autopilot scheduling (optional, get from Postiz Settings)
- `POSTIZ_BASE_URL` — custom Postiz instance URL (optional, defaults to https://api.postiz.com/public/v1)

## Deploy to Railway
1. Push this folder to a GitHub repo
2. New Railway project → deploy from repo (auto-detects Node via `railway.json`)
3. Railway sets `PORT` automatically; healthcheck on `/api/health`
4. (Optional) Set `OPENAI_API_KEY` in Railway env vars for AI rewrites

## Key 2026 signals (see RESEARCH.md)
Real weights from xai-org/x-algorithm (official open-source, sync 2026-08-12):
- **share_via_copy_link: +20.0 (40× a like)** — KING signal. Make posts worth copying off-platform.
- **reply + mutual boost: +20.0 (40×)** — ReplyWeight (5.0) + BidirectionalFollowReplyWeightBoost (15.0).
- **share_via_dm: +5.0 (10×)** — Make posts people DM to friends.
- **quote: +5.0 (10×)** — Make contrarian/quotable posts.
- **follow_author: +4.0 (8×)** — Make series-worthy posts.
- **report: -234.0** — Nuclear. **mute_author: -58.8** — worse than block (-31.2).
- **profile_click: 0.0** — ZERO! Don't optimize for profile visits.
- **dwell: 0.0** — ZERO! (cont_dwell_time has tiny 0.004 weight)
External links in body, all-caps, and "Excited to share" openers get demoted.
Best post time: Tue–Thu 8–11 AM ET (Wed 9 AM = peak).

## The 22-signal Phoenix model (REAL official weights)
AgentX models the full xai-org/x-algorithm signal taxonomy with **real official
weights** from `param.rs` (sync 2026-08-12):
- **Positive (20):** share_via_copy_link (+20), reply (+5 + 15 mutual boost), share_via_dm (+5), quote (+5), follow_author (+4), share (+2), retweet (+1), favorite (+0.5), click (+0.4), open_link (+0.2), photo_expand (+0.05), video_open (+0.05), vqv (+0.05), quoted_click (+0.05), cont_dwell_time (+0.004), post_unexplored (+0.02), profile_click (0), dwell (0), quoted_vqv (0), cont_click_dwell_time (0)
- **Negative (5):** report (-234), mute_author (-58.8), not_interested (-43.2), block_author (-31.2), not_dwelled (-0.02)

Each signal gets a predicted probability (0-1) from text heuristics, then
contributes weight × probability to the total score — matching how Phoenix
actually ranks posts. See RESEARCH.md for full details.

## Autopilot (postiz.js + autopilot.js + copywriter.js)

The autopilot is the senior copywriter agent. Give it a topic and it:
1. **Learns your writing patterns** — builds an n-gram phrase bank from your sample posts
2. **Generates** multiple post candidates (sprinter.js — 6 archetypes)
3. **Polishes** them in YOUR voice (copywriter.js — stylometric profiling + n-gram phrase banks)
   — senior copywriter level, NO third-party LLMs needed
4. **Scores** each on the real X algorithm (signalModel.js)
5. **Picks the best time** to post (Postiz best-time research: Tue–Thu 8–11 AM ET)
6. **Schedules** them via Postiz (postiz.js — 27+ platforms)

### Setup
1. Get a Postiz API key from Postiz Settings → set `POSTIZ_API_KEY` env var
2. Connect your X account in Postiz (OAuth, no API keys to paste)
3. Upload sample posts via `POST /api/voice-profile` to calibrate your voice
4. No OpenAI key needed — the copywriter engine is 100% rule-based

### Usage
- Chat: `autopilot: <topic>` (dry run — shows what would be posted)
- API: `POST /api/autopilot { topic, dryRun: false }` (actually schedules)
- Without Postiz: still generates + polishes posts, just doesn't schedule
- Without voice profile: uses default copywriter style (still good, less voice-matched)

### Copywriter engine (copywriter.js)
The "senior copywriter" is a pure-rule style transfer engine — no LLMs, no APIs:
- **Stylometric profiling**: measures sentence length, punctuation, emoji, hooks, tone
- **N-gram phrase bank**: learns the author's word sequences (bigrams, trigrams, frames)
- **Voice transformation**: applies the author's style to generated posts
- **Algorithm optimization**: adds high-value X signals (reply triggers, share cues, quotability)

Inspired by: stylometric-transfer (ngpepin), unslop stylometry (mohamedabdallah-14),
PseudoWriter (KpihX), voice-layer (ymeiri).

### Postiz API
- Source: https://docs.postiz.com/public-api
- Rate limit: 30 requests/hour (autopilot batches count)
- Supports: X, LinkedIn, Reddit, YouTube, TikTok, Instagram, Threads, Bluesky, Mastodon, Discord, Slack, Telegram, and 14 more
- Self-hostable (AGPL) or cloud-hosted
