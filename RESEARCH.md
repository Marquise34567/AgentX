# AgentX — Research Basis (2026 X Algorithm)

Sources synthesized into the scoring engine. All weights/signals below are
reflected in `engagementAlgo.js` and `signalModel.js`.

## REAL X For-You ranking weights (xai-org/x-algorithm, official open-source)

**Source:** `xai-org/x-algorithm` GitHub repo, `home-mixer/params/param.rs`
(last sync 2026-08-12). These are the **actual weights** X's Phoenix ranker
uses, not estimates from secondary research.

> **Important caveat from xAI:** "Each weight multiplies the *predicted
> probability* of that action — they do NOT multiply raw engagement counts.
> It'd be incorrect to see that a report has 468× higher weight than a like
> and conclude that 1 report cancels 468 likes."

### Positive signals (ordered by weight)

| Signal | Weight | vs a Favorite | Source |
|---|---|---|---|
| share_via_copy_link | **+20.0** | **40×** | ShareViaCopyLinkWeight — KING signal |
| reply (+ mutual follow boost) | **+20.0** | **40×** | ReplyWeight (5.0) + BidirectionalFollowReplyWeightBoost (15.0) |
| reply | +5.0 | 10× | ReplyWeight |
| share_via_dm | +5.0 | 10× | ShareViaDmWeight |
| quote | +5.0 | 10× | QuoteWeight |
| follow_author | +4.0 | 8× | FollowAuthorWeight |
| share | +2.0 | 4× | ShareWeight |
| retweet | +1.0 | 2× | RetweetWeight |
| favorite | +0.5 | 1× | FavoriteWeight (baseline) |
| click | +0.4 | 0.8× | ClickWeight |
| open_link | +0.2 | 0.4× | OpenLinkWeight |
| photo_expand | +0.05 | 0.1× | PhotoExpandWeight |
| video_open | +0.05 | 0.1× | VideoOpenWeight |
| vqv | +0.05 | 0.1× | VqvWeight |
| quoted_click | +0.05 | 0.1× | QuotedClickWeight |
| cont_dwell_time | +0.004 | 0.008× | ContDwellTimeWeight |
| post_unexplored | +0.02 | 0.04× | PostUnexploredWeight |
| profile_click | **0.0** | **0×** | ProfileClickWeight — ZERO! |
| dwell | **0.0** | **0×** | DwellWeight — ZERO! |
| quoted_vqv | 0.0 | 0× | QuotedVqvWeight |
| cont_click_dwell_time | 0.0 | 0× | ContClickDwellTimeWeight |

### Negative signals (ordered by severity)

| Signal | Weight | vs a Favorite | Source |
|---|---|---|---|
| report | **-234.0** | **-468×** | ReportWeight — nuclear |
| mute_author | -58.8 | -117.6× | MuteAuthorWeight — worse than block! |
| not_interested | -43.2 | -86.4× | NotInterestedWeight |
| block_author | -31.2 | -62.4× | BlockAuthorWeight |
| not_dwelled | -0.02 | -0.04× | NotDwelledWeight — tiny |

### Key insights from the real weights

1. **share_via_copy_link is the KING signal** (20.0 = 40× a like). Getting
   people to copy your link and share it off-platform is the single most
   valuable action. Make posts that are referenceable, quotable, and
   worth sharing outside X.

2. **Replies + mutual follow boost = 20.0** (40× a like). When a mutual
   follow replies, the reply weight jumps from 5.0 to 20.0. Reply chains
   with mutuals are the second most valuable signal.

3. **Profile clicks are worth ZERO.** The algorithm does not reward
   driving people to your profile. Don't optimize for profile visits.

4. **Dwell weight is ZERO.** The algorithm doesn't directly reward dwell
   time — but `cont_dwell_time` has a tiny 0.004 weight, and `not_dwelled`
   has a tiny -0.02 penalty. Dwell matters indirectly through engagement.

5. **Mute is worse than block** (-58.8 vs -31.2). People muting you is
   more damaging to your reach than blocking. Avoid spammy/repetitive
   content that triggers mutes.

6. **Quote-tweets and DM shares are as valuable as replies** (all 5.0).
   Make posts that are quotable (contrarian, hot takes) and DM-worthy
   ("send this to someone who...").

## Engagement rate benchmarks (2026 research)

| Tier | Rate | Source |
|---|---|---|
| Platform average | 0.03% | median across all industries |
| Good | 1-3% | healthy for active accounts |
| Excellent | 6%+ | viral-tier performance |
| Top 10% nano-influencer | 28.6% | highest documented tier |

## Dwell time benchmarks

| Metric | Value | Source |
|---|---|---|
| Scroll-stop threshold | 2+ seconds | positive dwell signal |
| Average post dwell | ~1.7 seconds | platform median |
| Deep thread dwell | 2+ minutes | +10 score contribution |
| Thread vs single post | 4-7× dwell | threads produce much more dwell |

## Golden Hour (first 30-60 minutes)

- First 30 minutes: algorithm heavily weighs engagement velocity
- First 60 minutes: decides broader audience push
- Average post lifespan: 18-24 hours
- Viral posts: can be revived days or weeks later through ongoing dwell/comments

## Length (engagement data)
- 71–100 chars: engagement sweet spot
- 100–200 chars: highest engagement *rate* (1.09%)
- <50: too thin; 141–280: slides; 280+: only if every word earns space
- First line **4–6 words** = 1,279 avg likes vs 823 for 7–10 words
- First line <40 chars = +46% engagement

## Hooks (statements beat questions ~7×)
Contrarian claim · specific number · confession · "I did X without Y" ·
"you don't need X to Y" · open loop · bold prediction · before/after.

## Timing (Buffer 8.7M + Sprout 2B engagements)
- Best: **Tue–Thu 8–11 AM ET, Wed 9 AM ET = single best slot**
- Secondary: lunch 12–1 PM ET; evening 5–6 PM for threads
- Worst: weekends (Sat lowest, Sun ~−23%), evenings 6–11 PM
- **First 30–60 min engagement velocity decides broader distribution**

## Sources
- **xai-org/x-algorithm** (GitHub, Jan 2026) — official open-source X algorithm
  - `home-mixer/params/param.rs` — real signal weights
  - `home-mixer/scorers/ranking_scorer.rs` — scoring formula
  - `home-mixer/scorers/weighted_scorer.rs` — weighted scorer implementation
- twitter/the-algorithm (GitHub, Apr 2023)
- postory.io/blog/what-goes-viral-on-twitter
- clarigital.com/codex/social-media/twitter-x-algorithm
- terezatizkova.com/writing/x-algorithm
- buffer.com/resources/best-time-to-post-on-twitter-x
- sproutsocial.com/insights/best-times-to-post-on-twitter
- monolit.sh/blog/how-long-should-twitter-x-post-be-2026
- wildandfreetools.com/blog/how-long-should-a-tweet-be-2026
- quip.so/blog/twitter-hook-formulas
- tweetloft.com/blog/how-to-write-tweet-hooks-that-stop-the-scroll

## 22-signal Phoenix model (signalModel.js)

AgentX models the full signal taxonomy from xai-org/x-algorithm's
`weighted_scorer.rs` + `ranking_scorer.rs`. Each signal gets a predicted
probability (0-1) from text heuristics, then contributes `weight × P(signal)`
to the total — matching how Phoenix actually ranks posts.

**Weights are the REAL official values** from `param.rs` (sync 2026-08-12).
See the tables above for the complete list.

## Sprinter (sprinter.js)

The sprinter is a post generator that creates scroll-stopping posts from a
topic, optimized for the real X algorithm's highest-value signals:

1. **share_via_copy_link (20.0)** — make posts worth copying off-platform
2. **reply (5.0 + 15.0 mutual boost)** — make posts that trigger reply chains
3. **share_via_dm (5.0)** — make posts people DM to friends
4. **quote (5.0)** — make contrarian/quotable posts
5. **follow_author (4.0)** — make series-worthy posts that drive follows

It generates from 6 archetypes, each targeting different signal combinations:
- contrarian_take → quote + reply + copy_link
- actionable_listicle → copy_link + bookmark + dm
- story_confession → reply + follow + dm
- pattern_interrupt → copy_link + quote + reply
- proof_receipts → copy_link + follow + bookmark
- debate_question → reply + quote + dm

Usage: `sprint: <topic>` in chat, or `POST /api/sprint { topic }`

## Autopilot (autopilot.js + postiz.js)

The autopilot is the senior copywriter agent that posts for you at the best
times. It chains the sprinter → AI rewriter → Postiz scheduler.

### Postiz (open-source social media scheduler)

**Source:** https://github.com/gitroomhq/postiz-app (34.7k stars, AGPL)
**API docs:** https://docs.postiz.com/public-api
**Rate limit:** 30 requests/hour

Postiz supports 27+ platforms: X, LinkedIn, LinkedIn Page, Facebook,
Instagram, Threads, Bluesky, Mastodon, Warpcast, Nostr, VK, YouTube, TikTok,
Reddit, Lemmy, Discord, Slack, Telegram, Pinterest, Dribbble, Medium, Dev.to,
Hashnode, WordPress, Google My Business, Listmonk.

The Postiz Public API uses simple API-key auth (`Authorization: <key>` header).
Users get their API key from Postiz Settings. Postiz uses official OAuth flows
for each platform — it never collects or proxies API keys or access tokens.

### Autopilot pipeline

1. **Learn** — build an n-gram phrase bank from the author's sample posts
   (bigrams, trigrams, sentence frames, transition words)
2. **Generate** — sprint `count × 2` candidates from the topic (sprinter.js)
3. **Polish** — rewrite each in the user's voice (copywriter.js):
   - Stylometric profiling: sentence length, punctuation, emoji, hooks, tone
   - N-gram phrase bank: inject the author's actual word sequences
   - Voice transformation: adjust punctuation, pronouns, capitalization, emoji
   - Algorithm optimization: add reply triggers, share cues, quotable hooks
   - **NO third-party LLMs, NO APIs** — 100% rule-based style transfer
4. **Score** — rank by real X algorithm score (signalModel.js)
5. **Schedule** — pick best posting times (Postiz research):
   - Tue 9 AM ET (weight 1.0)
   - Wed 9 AM ET (weight 1.17 — peak, +17%)
   - Thu 9 AM ET (weight 1.0)
   - Tue–Thu 10–11 AM ET (weight 0.9–1.1)
   - Lunch 12 PM ET (weight 0.85–0.9)
   - Evening 5 PM ET for threads (weight 0.75–0.8)
6. **Post** — schedule via Postiz API (with self-reply as thread)

### Copywriter engine (no LLMs)

The "senior copywriter" is a pure-rule style transfer engine inspired by:
- **stylometric-transfer** (ngpepin) — explicit, inspectable style fingerprints
- **unslop stylometry** (mohamedabdallah-14) — deterministic style signal extraction
- **PseudoWriter** (KpihX) — n-gram Markov chain text generation
- **voice-layer** (ymeiri) — local-first voice profiles for writing

It measures 25+ style signals from the author's sample posts, builds an n-gram
phrase bank of their actual word sequences, and transforms generated posts to
match their voice — all without any LLM or third-party API.

### Best posting times (research basis)

From Buffer (8.7M posts) + Sprout Social (2B engagements):
- **Best: Tue–Thu 8–11 AM ET, Wed 9 AM = single best slot (+17%)**
- Secondary: lunch 12–1 PM ET, evening 5–6 PM for threads
- Worst: weekends (Sat lowest, Sun ~−23%), evenings 6–11 PM
- **First 30–60 min engagement velocity decides broader distribution**

Usage: `autopilot: <topic>` in chat (dry run), or `POST /api/autopilot { topic, dryRun: false }`

## Self-reply engine (selfReplyEngine.js)

The +75 reply-author-reply-back signal is the dominant one (150× a like).
The most reliable way to trigger it is to post, then immediately self-reply
with content that invites the audience to reply — then reply back to them.

The engine:
1. Detects the post's angle (contrarian, confession, data reveal, list, etc.)
2. Generates 3 self-reply candidates from angle-specific templates
3. Scores each candidate and picks the best
4. Produces a 6-step reply-chain plan for the first 30-60 min velocity window

## Voice profile (voiceProfile.js)

Fingerprints an author's writing style from sample posts:
- Length distribution (avg/median chars, first-line words)
- Formatting (line breaks, paragraph count)
- Punctuation habits (questions, exclamations, em-dashes, colons, ellipses)
- Hook frequency (which of the 11 hook formulas the author favors)
- Emoji usage and favorites
- Vocabulary richness (type-token ratio, avg word length)
- Tone markers (contrarian rate, confession rate, personal story rate)
- First-person vs second-person usage
- Signature phrases (recurring n-grams)

Produces a natural-language description consumed by the AI rewriter prompt.

## Analytics closed-loop (analytics.js)

Ingests X Analytics CSV exports and calibrates scoring to the user's actual
audience:
1. Parses CSV (handles X's varying column names)
2. Scores every post with the engine
3. Computes Pearson correlation between each scoring dimension and real engagement
4. Produces per-dimension weight adjustments (boost dimensions that correlate,
   reduce those that don't)
5. Identifies best-performing hooks and signals for this specific user
6. Tracks score→performance correlation over time

Storage: `analytics_data.json` (no database needed).
