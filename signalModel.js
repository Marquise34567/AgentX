/*
 * X / Twitter 22-signal prediction engine (2026 Phoenix algorithm).
 *
 * Models the full signal taxonomy from xai-org/x-algorithm's
 * weighted_scorer / ranking_scorer. Each signal gets a predicted
 * probability (0-1) derived from text heuristics, then contributes
 * weight × probability to the total algorithmic score.
 *
 * score = Σ weightᵢ × P(signalᵢ | post)
 *
 * This is the same formula X's Phoenix ranker uses — we're just
 * estimating the probabilities from text features instead of a
 * trained transformer. The relative ordering is what matters for
 * optimization; absolute values are illustrative.
 *
 * Signal weights are absolute (like = 0.5 baseline). Multipliers
 * vs a like are weight / 0.5.
 *
 * 2026 UPDATE — Real X algorithm benchmarks integrated:
 *   - Dwell: 2+ second scroll stop = positive dwell signal [INDEX:2.5.3]
 *   - Dwell: 2+ min in reply thread = +10 boost [INDEX:1.2.11]
 *   - Thread format: 4-7x dwell time vs single tweets [INDEX:1.3.10]
 *   - Replies: weighted 15-27x more than likes [INDEX:2.4.1, 2.4.2]
 *   - Bookmarks: weighted 2.5-10x more than likes [INDEX:2.4.5, 2.4.7]
 *   - Golden Hour: first 30-60 min velocity decides reach [INDEX:2.4.2, 2.4.3]
 *   - Engagement rate: 0.03% avg, 1-3% good, 6%+ excellent, 28.6% viral [INDEX:1.2.2, 1.3.11, 2.1.1]
 *   - Lifespan: 18-24h avg, days-weeks for viral [INDEX:2.4.9, 2.5.5]
 */

"use strict";

// ---------------------------------------------------------------------------
// REAL X algorithm signal weights — sourced directly from xai-org/x-algorithm
// open-source repo (home-mixer/params/param.rs, last sync 2026-08-12).
//
// These are the ACTUAL weights X's Phoenix ranker uses. Each weight
// multiplies the PREDICTED PROBABILITY of that action — NOT raw counts.
// (See xai-org/x-algorithm README: "it'd be incorrect to see that a report
// has 468 times higher weight than a like and conclude that 1 report
// cancels 468 likes.")
//
// Key insight: share_via_copy_link (20.0) is the HIGHEST positive signal —
// 40× a like. Profile clicks are worth ZERO. Dwell weight is ZERO (but
// cont_dwell_time has a tiny 0.004 weight). The real algorithm values
// off-platform sharing and replies far above everything else.
//
// Mute (-58.8) is worse than block (-31.2). Report is nuclear (-234).
// ---------------------------------------------------------------------------
const SIGNAL_WEIGHTS = {
  // === POSITIVE — real xai-org/x-algorithm weights ===
  // share_via_copy_link is the KING signal — 40× a like
  share_via_copy_link: 20.0,       // 40× — off-platform share (copied link) [OFFICIAL]
  reply: 5.0,                      // 10× — [OFFICIAL] ReplyWeight: 5.0
  share_via_dm: 5.0,               // 10× — [OFFICIAL] ShareViaDmWeight: 5.0
  quote: 5.0,                      // 10× — [OFFICIAL] QuoteWeight: 5.0
  follow_author: 4.0,              // 8× — [OFFICIAL] FollowAuthorWeight: 4.0
  share: 2.0,                      // 4× — [OFFICIAL] ShareWeight: 2.0
  retweet: 1.0,                    // 2× — [OFFICIAL] RetweetWeight: 1.0
  favorite: 0.5,                   // 1× — [OFFICIAL] FavoriteWeight: 0.5 (baseline)
  click: 0.4,                      // 0.8× — [OFFICIAL] ClickWeight: 0.4
  open_link: 0.2,                  // 0.4× — [OFFICIAL] OpenLinkWeight: 0.2
  photo_expand: 0.05,              // 0.1× — [OFFICIAL] PhotoExpandWeight: 0.05
  video_open: 0.05,                // 0.1× — [OFFICIAL] VideoOpenWeight: 0.05
  vqv: 0.05,                       // 0.1× — [OFFICIAL] VqvWeight: 0.05
  quoted_click: 0.05,              // 0.1× — [OFFICIAL] QuotedClickWeight: 0.05
  cont_dwell_time: 0.004,          // 0.008× — [OFFICIAL] ContDwellTimeWeight: 0.004
  // Zero-weight signals (still predicted but don't affect score directly)
  profile_click: 0.0,              // 0× — [OFFICIAL] ProfileClickWeight: 0.0
  dwell: 0.0,                      // 0× — [OFFICIAL] DwellWeight: 0.0
  quoted_vqv: 0.0,                 // 0× — [OFFICIAL] QuotedVqvWeight: 0.0
  cont_click_dwell_time: 0.0,      // 0× — [OFFICIAL] ContClickDwellTimeWeight: 0.0
  post_unexplored: 0.02,           // 0.04× — [OFFICIAL] PostUnexploredWeight: 0.02

  // Bidirectional follow boost — applied on top of reply when mutual follow
  bidirectional_follow_reply_boost: 15.0,  // [OFFICIAL] adds to reply weight for mutuals

  // === NEGATIVE — real xai-org/x-algorithm weights ===
  report: -234.0,                  // -468× — [OFFICIAL] ReportWeight: -234.0 (nuclear)
  mute_author: -58.8,              // -117.6× — [OFFICIAL] MuteAuthorWeight: -58.8 (worse than block!)
  not_interested: -43.2,           // -86.4× — [OFFICIAL] NotInterestedWeight: -43.2
  block_author: -31.2,             // -62.4× — [OFFICIAL] BlockAuthorWeight: -31.2
  not_dwelled: -0.02,              // -0.04× — [OFFICIAL] NotDwelledWeight: -0.02 (tiny)

  // === LEGACY aliases (kept for backward compat, mapped to real signals) ===
  // These map old signal names to their real-algorithm equivalents so
  // existing code that references them doesn't break.
  like: 0.5,                       // alias for favorite
  repost: 1.0,                     // alias for retweet
  bookmark: 5.0,                   // NOT in real algo — modeled as share_via_copy_link equivalent
  reply_author_reply_back: 20.0,   // reply (5.0) + bidirectional_follow_reply_boost (15.0)
  conversation_click: 0.4,         // alias for click
  dwell_2min: 0.004,               // alias for cont_dwell_time (dwell weight is 0)
  dwell_binary: 0.0,               // alias for dwell (weight is 0)
  scrolled_past: -0.02,            // alias for not_dwelled
  block: -31.2,                    // alias for block_author
  unfollow_after_view: 0.0,        // NOT in real algo — set to 0
  click_dwell_time: 0.0,           // alias for cont_click_dwell_time
};

// ---------------------------------------------------------------------------
// Real engagement rate benchmarks [INDEX:1.2.2, 1.3.11, 2.1.1]
// ---------------------------------------------------------------------------
const ENGAGEMENT_BENCHMARKS = {
  platformAverage: 0.0003,    // 0.03% — median across all industries [INDEX:1.2.2, 1.2.4]
  good: 0.01,                  // 1% — healthy for active accounts [INDEX:1.3.11]
  goodHigh: 0.03,              // 3% — upper end of "good" [INDEX:1.3.11]
  excellent: 0.06,             // 6%+ — viral-tier performance [INDEX:1.3.11]
  viral: 0.286,                // 28.6% — nano-influencer top 10% [INDEX:2.1.1]
};

// ---------------------------------------------------------------------------
// Dwell time benchmarks [INDEX:2.5.3, 1.2.11, 1.3.10]
// ---------------------------------------------------------------------------
const DWELL_BENCHMARKS = {
  scrollStop: 2.0,             // 2+ seconds = positive dwell signal [INDEX:2.5.3]
  averageDwell: 1.7,           // ~1.7 seconds average post dwell
  threadBoost: 2.0 * 60,      // 2+ minutes in reply thread = +10 boost [INDEX:1.2.11]
  threadMultiplier: 5.5,      // threads produce 4-7x dwell of single tweets [INDEX:1.3.10]
};

// ---------------------------------------------------------------------------
// Golden Hour benchmarks [INDEX:2.4.2, 2.4.3]
// ---------------------------------------------------------------------------
const GOLDEN_HOUR = {
  criticalWindow: 30,          // first 30 minutes — algorithm heavily weighs velocity
  extendedWindow: 60,          // first 60 minutes — decides broader audience push
  avgLifespan: 18,             // 18-24 hours average tweet lifespan [INDEX:2.4.9]
  viralLifespan: "days-weeks", // viral posts can be revived days later [INDEX:2.5.5]
};

// ---------------------------------------------------------------------------
// Text feature extraction (shared by signal predictors)
// ---------------------------------------------------------------------------
function hasMoney(s) { return /\$[\d,]+(\.\d+)?\s?(k|m|arr|mrr)?/i.test(s); }

function features(a) {
  const text = a.text;
  const f = {
    hasLink: a.hasExternalLink,
    hasBreaks: a.hasLineBreaks,
    endsQ: a.endsWithQuestion,
    capsRatio: a.allCapsRatio,
    charCount: a.charCount,
    wordCount: a.wordCount,
    firstLineWords: a.firstLineWords,
    firstLineChars: a.firstLineChars,
    hooks: a.detectedHooks,
    hasNumber: a.hasNumber,
    hasReplyInvite: a.hasReplyInvite,
    hasMedia: a.hasMediaMention,
    isThread: a.isThread,
    opener: a.opener,
  };

  // Additional features not in the base analysis
  // SEPARATED: bookmark cues vs DM cues vs copy-link cues
  // Writing "save this" makes people BOOKMARK, not copy-link off-platform.
  // Writing "send this" makes people DM, not copy-link.
  // share_via_copy_link is driven by CONTENT VALUE, not by asking people to share.
  f.hasListCue = /\b(\d+\.\s|-\s|\d+ (things|ways|tips|lessons|steps|rules))\b/i.test(text);
  f.hasBookmarkCue = /\b(save this|bookmark this|worth saving|screenshot this)\b/i.test(text);
  f.hasShareCue = /\b(send this to|share this with|tag someone|pass this to|who needs to (see|hear)|forward this)\b/i.test(text);
  f.hasFollowCue = /\b(follow (me|for)|i post (about|on)|for more (on|about)|if you (want|like) (more|this))\b/i.test(text);
  f.hasPersonalStory = /\b(i (was|used to|learned|realized|discovered|built|shipped|failed|tried|started)|my (first|last|biggest|worst|best))\b/i.test(text);
  f.hasVideoMention = /\b(video|watch|clip|youtube|mp4|live stream|recording)\b/i.test(text);
  f.hasImageMention = /\b(image|photo|picture|screenshot|chart|graph|diagram|infographic)\b/i.test(text);
  f.threadMarkers = (text.match(/\b\d+\/\d+\b/g) || []).length;
  f.lineCount = (text.match(/\n/g) || []).length + 1;
  f.paraCount = (text.match(/\n\n/g) || []).length + 1;
  f.hasQuestion = /\?/.test(text);
  f.questionCount = (text.match(/\?/g) || []).length;
  f.hasEngagementBait = /\b(like if|retweet if|rt if|comment .* win|first 10 to|drop a 🔥|smash that|hit that|subscribe|follow for follow|f4f)\b/i.test(text);
  f.isSelfPromo = /\b(buy my|check out my|use my (link|code|promo)|discount|promo code|affiliate|my course|my ebook|my newsletter signup)\b/i.test(text);

  // 2026 additions — new viral pattern features
  f.hasOpenLoop = /\b(here'?s (exactly|what|how|why)|what (happened|i (sold|did|built|used))|the (exact|real|actual) (method|way|secret|truth)|you won'?t believe|this is (how|what|why))\b/i.test(text);
  f.hasCuriosityGap = /\b(doesn'?t exist|no product|no inventory|no shipping|no code|no audience|no followers|zero (original|content|money|budget)|nobody (knows|talks about))\b/i.test(text);
  f.hasPatternInterrupt = /\b(waiting room|plastic chairs|bad coffee|3am|midnight|found a guy|stumbled|came across|not joking|not kidding|seriously though|i met (him|her|a guy|someone) at a)\b/i.test(text);
  f.hasGroundedSetting = /\b(waiting room|plastic chairs|bad coffee|coffee shop|airport|train|bus|hospital|doctor|garage|parking lot|gas station|diner|laundromat|barbershop|gym|elevator|subway|basement|attic|alley|car service|fluorescent|dingy)\b/i.test(text);
  f.hasTechHumor = /\b(codex|claude|gpt.?5|copilot|cursor|ai agent|debug|stack overflow|npm|docker|regex|css|javascript|python|react|typescript|vibe coding)\b/i.test(text);
  f.hasAbsurdOverreaction = /\b(rewrites|rebuilds|deletes|nukes|destroys|refactors|overwrites|wipes|restructures)\b/i.test(text);
  f.hasNicheShock = hasMoney(text) && /\b(absurd|insane|crazy|ridiculous|not joking|not kidding|seriously|actually|real|brainrot|degenerate|bullshit)\b/i.test(text);
  f.hasMetaRide = /\b(everyone'?s arguing|everyone'?s talking|hot take|unpopular opinion|the discourse|timeline)\b/i.test(text);
  f.hasZeroFrictionLayout = f.paraCount >= 3 && text.split(/\n\s*\n/).filter((p) => p.trim().length <= 80).length >= 3;
  f.hasAsteriskAction = /\*[^*]{3,40}\*/.test(text);
  // timeline skeleton features
  f.hasMundaneEncounter = /\b(i met (him|her|a guy|someone) at a|met him at a|car service|plastic chairs|fluorescent)\b/i.test(text);
  f.hasSensoryDetail = /\b(plastic chairs|fluorescent|bad coffee|buzzing|humming|neon|flickering|sticky|cracked|worn|dingy|smelled|sounded)\b/i.test(text);
  f.hasReverseEngineer = /\b(reverse.?engineer|already (working|winning)|what'?s already|deconstruct|tear down)\b/i.test(text);
  f.hasIndustryCallout = /\b(most (people|creators|founders|builders) (start|begin)|everyone starts|the default approach)\b/i.test(text);
  f.hasBrainrot = /\b(brainrot|degenerate|oversaturated|the kinda (bullshit|shit|stuff)|printing (you|money))\b/i.test(text);
  f.hasBulletMetrics = /[•\-*]\s.*[\$d]/.test(text) || /\b1\.\s.*\b2\.\s.*\b3\.\s/s.test(text);
  f.hasNumberedBlueprint = /\b1\.\s.*\b2\.\s.*\b3\.\s/s.test(text);
  f.hasBrevityCue = /\b(never been simpler|that'?s it|nothing else|no fluff|no bs|all i did was)\b/i.test(text);
  // timeline example features (Andi, Eade, David Ch, Ira, Jeremy, Jay)
  f.hasVulnerableMilestone = /\b(quit my job|last day|living off savings|wish me luck|betting on myself|all in|no safety net)\b/i.test(text);
  f.hasAbsurdJuxtaposition = /\b(embryo|nervous system|timelapse|evolution|dna|organism|big bang|galaxy)\b/i.test(text) && /\b(saas|b2b|sales|business|startup)\b/i.test(text);
  f.hasAIToolDrop = /\b(claude|gpt.?5|gpt.?4|copilot|cursor|codex|gemini|openai|anthropic)\b/i.test(text);
  f.hasAILossConfession = /\b(killed (our|my) startup|killed my business|destroyed (our|my)|ai killed|claude killed)\b/i.test(text);
  f.hasDMBait = /\b(like \+ reply|reply with .* dm|dm it to you|dm you .* free|comment .* dm)\b/i.test(text);
  f.hasUrgencyGiveaway = /\b(24 hours?|next 24|today only|limited time|giving it away|free for the next)\b/i.test(text);
  f.hasCredibilityLine = /\b(i'?ve done|i'?ve helped|i'?ve worked with|experience in|years? of|for 100\+|for \d+ startups)\b/i.test(text);
  f.hasCallout = /\b(@\w+|cc @|hat tip|via @)\b/i.test(text);
  f.readingMinutes = a.wordCount / 200; // ~200 wpm
  return f;
}

// ---------------------------------------------------------------------------
// Signal probability predictors (each returns 0..1)
// ---------------------------------------------------------------------------
function p_reply_author_reply_back(f) {
  // The +75 signal. Triggered when a post is structured to start a
  // conversation the author will participate in: opinionated take +
  // explicit reply invite + short enough to reply to quickly.
  // Niche shock + meta timeline ride also drive heavy reply chains (debate).
  let p = 0.05;
  const opinionated = ["contrarian", "confession", "bold_prediction", "you_dont_need"];
  if (f.hooks.length && f.hooks.some((h) => opinionated.includes(h))) p += 0.25;
  if (f.hasReplyInvite) p += 0.20;
  if (f.endsQ) p += 0.10;
  if (f.charCount <= 200) p += 0.10;
  if (f.hasPersonalStory) p += 0.08;
  if (f.hasNicheShock) p += 0.15; // "cat sudoku $6M/month" → debate → replies
  if (f.hasMetaRide) p += 0.12; // "everyone's arguing about X" → join the debate
  if (f.hasTechHumor) p += 0.10; // relatable coding humor → "this is so me" replies
  if (f.hasBrainrot) p += 0.15; // "the kinda bullshit printing $6M" → debate → replies
  if (f.hasIndustryCallout) p += 0.10; // "most creators start with X" → "no I do Y" replies
  if (f.hasVulnerableMilestone) p += 0.25; // "I quit my job" → massive support replies, author WILL reply back (+75!)
  if (f.hasAILossConfession) p += 0.20; // "AI killed my startup" → sympathy + debate replies
  if (f.hasDMBait) p += 0.30; // "like + reply for free DM" → high reply volume (but risky)
  if (f.hasUrgencyGiveaway) p += 0.25; // "24 hours free" → FOMO replies
  if (f.hasLink) p -= 0.15; // link posts kill reply chains
  if (f.hasEngagementBait && !f.hasDMBait && !f.hasUrgencyGiveaway) p -= 0.20;
  return clamp01(p);
}

function p_reply(f) {
  let p = 0.10;
  if (f.hasReplyInvite) p += 0.20;
  if (f.endsQ) p += 0.12;
  if (f.hooks.length) p += 0.10;
  if (f.hasPersonalStory) p += 0.08;
  if (f.charCount <= 200) p += 0.05;
  if (f.hasLink) p -= 0.10;
  return clamp01(p);
}

function p_profile_click(f) {
  let p = 0.05;
  if (f.hasPersonalStory) p += 0.20;
  if (f.hooks.includes("confession")) p += 0.15;
  if (f.hooks.includes("before_after")) p += 0.10;
  if (f.hasFollowCue) p += 0.10;
  if (f.charCount < 50) p -= 0.05; // too thin to care who wrote it
  return clamp01(p);
}

function p_conversation_click(f) {
  // Clicking into the reply thread — open loops + curiosity gaps drive Show More clicks
  let p = 0.05;
  if (f.hasReplyInvite) p += 0.18;
  if (f.endsQ) p += 0.12;
  if (f.hooks.includes("open_loop")) p += 0.15;
  if (f.hasOpenLoop) p += 0.20; // "here's exactly what I sold 👇" forces expansion
  if (f.hasCuriosityGap) p += 0.15; // "doesn't exist" / "zero original content" forces click
  if (f.hasBreaks) p += 0.05;
  return clamp01(p);
}

function p_dwell_2min(f) {
  // 2+ min in thread — needs depth (thread or long-form with breaks)
  // Open loops + curiosity gaps + micro-storytelling drive deep dwell
  let p = 0.02;
  if (f.isThread) p += 0.25;
  if (f.paraCount >= 3) p += 0.20;
  if (f.readingMinutes >= 1) p += 0.15;
  if (f.hasListCue) p += 0.10;
  if (f.hasBreaks) p += 0.08;
  if (f.hasOpenLoop) p += 0.15; // open loops keep people reading to the end
  if (f.hasGroundedSetting) p += 0.10; // micro-storytelling forces scene completion
  if (f.hasZeroFrictionLayout) p += 0.08; // bite-sized paragraphs = easy to keep reading
  if (f.hasMundaneEncounter) p += 0.15; // "i met him at a car service center" forces full scene read
  if (f.hasSensoryDetail) p += 0.08; // sensory grounding = immersive = longer dwell
  if (f.hasReverseEngineer) p += 0.10; // blueprint frameworks keep people reading the steps
  if (f.hasNumberedBlueprint) p += 0.10; // numbered steps = read all of them
  return clamp01(p);
}

function p_bookmark(f) {
  // Save-worthy: lists, actionable, reference material, explicit bookmark cues
  let p = 0.03;
  if (f.hasListCue) p += 0.30;
  if (f.hasBookmarkCue) p += 0.20; // "save this" / "bookmark this" → actually triggers bookmarks
  if (f.isThread) p += 0.15;
  if (f.hasNumber) p += 0.10;
  if (f.hooks.includes("n_things_i_learned")) p += 0.15;
  if (f.hooks.includes("if_i_had_to_start_over")) p += 0.10;
  if (f.paraCount >= 3) p += 0.08;
  if (f.hasNumberedBlueprint) p += 0.20; // "1. 2. 3." steps = save for later reference
  if (f.hasBulletMetrics) p += 0.12; // bullet metrics = save-worthy
  if (f.hasReverseEngineer) p += 0.10; // blueprint = save for reference
  if (f.hasBrevityCue) p += 0.08; // "it's never been simpler" = actionable = bookmark
  return clamp01(p);
}

function p_vqv(f) {
  // Video quality view (>50% watched)
  let p = 0.0;
  if (f.hasVideoMention) p = 0.35;
  return clamp01(p);
}

function p_follow_author(f) {
  let p = 0.02;
  if (f.hasFollowCue) p += 0.25;
  if (f.isThread) p += 0.10;
  if (f.hasPersonalStory) p += 0.08;
  if (f.hooks.includes("if_i_had_to_start_over")) p += 0.10;
  if (f.hasListCue) p += 0.05;
  return clamp01(p);
}

function p_quote(f) {
  let p = 0.03;
  if (f.hooks.includes("contrarian")) p += 0.15;
  if (f.hooks.includes("bold_prediction")) p += 0.12;
  if (f.hasPersonalStory) p += 0.08;
  if (f.hasNicheShock) p += 0.20; // "we are in a simulation" quote-tweets
  if (f.hasMetaRide) p += 0.15; // people quote-tweet to join the debate
  if (f.hasTechHumor) p += 0.12; // "this is literally me" quote-tweets
  if (f.hasCuriosityGap) p += 0.10; // quote-tweet with "is this real?"
  if (f.hasBrainrot) p += 0.18; // "the kinda bullshit printing $6M" → "we are cooked" quote-tweets
  if (f.hasIndustryCallout) p += 0.12; // "most creators start with X" → "I do Y" quote-tweets
  if (f.hasAbsurdJuxtaposition) p += 0.25; // "embryo building CNS to sell b2b SAAS" → hilarious quote-tweets
  if (f.hasAILossConfession) p += 0.20; // "AI killed my startup" → "this is the future" quote-tweets
  if (f.hasVulnerableMilestone) p += 0.10; // "I quit my job" → supportive quote-tweets
  // Jake-style absurd contrast: "Men used to go to war and now they sell b2b SaaS"
  // These get massive quote-tweet rates — people quote to add their own contrast.
  if (/\b(used to\b.+\bnow (they|we)\b|men used to|people used to)\b/i.test(f.text)) p += 0.20;
  // George Pu-style dialogue: "Founder: '...' Me: ..." — people quote to take a side
  if (/^\w+:\s*["'].*["']\s*\n\s*\n\s*Me:/i.test(f.text)) p += 0.15;
  return clamp01(p);
}

function p_share_via_dm(f) {
  let p = 0.02;
  if (f.hasShareCue) p += 0.25;
  if (f.hasListCue) p += 0.10;
  if (f.hooks.includes("you_dont_need")) p += 0.08;
  if (f.hasPersonalStory) p += 0.05;
  if (f.hasNicheShock) p += 0.20; // "you have to see this" → DM to friends
  if (f.hasTechHumor) p += 0.15; // relatable coding humor → DM to dev friends
  if (f.hasPatternInterrupt) p += 0.10; // absurd/grounded openers get shared
  return clamp01(p);
}

function p_dwell_binary(f) {
  // Any meaningful dwell (>3s) — pattern interrupts + open loops + zero-friction layout
  let p = 0.10;
  if (f.hasBreaks) p += 0.15;
  if (f.charCount >= 71) p += 0.10;
  if (f.paraCount >= 2) p += 0.10;
  if (f.hooks.length) p += 0.08;
  if (f.hasPatternInterrupt) p += 0.15; // grounded setting / "found a guy" stops the scroll
  if (f.hasOpenLoop) p += 0.12; // curiosity gap forces reading to the end
  if (f.hasZeroFrictionLayout) p += 0.10; // bite-sized = read half before realizing
  if (f.hasAsteriskAction) p += 0.05; // visual action pattern interrupts
  return clamp01(p);
}

function p_repost(f) {
  let p = 0.05;
  if (f.hooks.includes("contrarian")) p += 0.12;
  if (f.hooks.includes("bold_prediction")) p += 0.10;
  if (f.hasNumber) p += 0.05;
  if (f.hasLink) p -= 0.05;
  return clamp01(p);
}

function p_share_via_copy_link(f) {
  // share_via_copy_link is the KING signal (20.0 = 40x a like).
  // It's driven by CONTENT VALUE — people copy links to share off-platform
  // when the content is genuinely valuable, surprising, or useful.
  // Writing "save this" does NOT make people copy the link — it makes them bookmark.
  // Writing "send this" does NOT make people copy the link — it makes them DM.
  // So we do NOT reward share cues or bookmark cues here.
  let p = 0.02;
  // Real value drivers: lists, specific numbers, personal stories, surprising claims
  if (f.hasListCue) p += 0.08;  // numbered lists get copied off-platform
  if (f.hasNumber) p += 0.05;   // specific data gets shared
  if (f.hasPersonalStory) p += 0.05; // stories get shared
  if (f.hooks.includes("contrarian")) p += 0.06; // hot takes get shared
  if (f.hooks.includes("bold_prediction")) p += 0.05;
  if (f.hasTechHumor) p += 0.04; // insider humor gets shared within communities
  if (f.hasGroundedSetting) p += 0.03; // vivid settings make content memorable/shareable
  // FOUNDER STORIES with specific numbers get shared off-platform —
  // people copy the link to send to friends ("you need to read this")
  const hasFounderStory = /\b(bootstrapped|sold it for|raised \$|built.*in \d+|went from \$0|had \d+ paying|turned down \$|spent \$\d+k)/i.test(f.text);
  const hasSpecificRevenue = /\$[\dkm]+.*\b(mrr|arr|revenue|exit|acquired|sold|funding|profit|churn|customers|users|month)/i.test(f.text);
  if (hasFounderStory && hasSpecificRevenue) p += 0.12;
  // MRR/ARR milestones get shared — "I hit $10k MRR" is aspirational content
  if (/\$\d+k?\s*(mrr|arr)/i.test(f.text)) p += 0.08;
  return clamp01(p);
}

function p_photo_expand(f) {
  let p = 0.0;
  if (f.hasImageMention) p = 0.30;
  return clamp01(p);
}

function p_cont_dwell_time(f) {
  let p = 0.05;
  if (f.paraCount >= 3) p += 0.15;
  if (f.readingMinutes >= 0.5) p += 0.12;
  if (f.hasBreaks) p += 0.08;
  return clamp01(p);
}

function p_click_dwell_time(f) {
  let p = 0.02;
  if (f.hasLink) p += 0.10; // click then dwell — but link penalty dominates
  if (f.hasListCue) p += 0.05;
  return clamp01(p);
}

function p_like(f) {
  let p = 0.15;
  if (f.hooks.length) p += 0.15;
  if (f.hasNumber) p += 0.08;
  if (f.hasPersonalStory) p += 0.08;
  if (f.hasBreaks) p += 0.05;
  if (f.charCount >= 71 && f.charCount <= 200) p += 0.07;
  return clamp01(p);
}

function p_quoted_click(f) { return 0.02; }
function p_quoted_vqv(f) { return 0.01; }

// === NEW real-algorithm signal predictors ===

function p_share(f) {
  // ShareWeight: 2.0 — the "share to timeline" button (not DM, not copy link)
  let p = 0.03;
  if (f.hooks.includes("contrarian")) p += 0.10;
  if (f.hooks.includes("bold_prediction")) p += 0.08;
  if (f.hasPersonalStory) p += 0.06;
  if (f.hasNumber) p += 0.04;
  if (f.hasNicheShock) p += 0.12;
  if (f.hasMetaRide) p += 0.10;
  if (f.hasLink) p -= 0.05;
  return clamp01(p);
}

function p_open_link(f) {
  // OpenLinkWeight: 0.2 — clicking an external link
  let p = 0.0;
  if (f.hasLink) p = 0.25;
  return clamp01(p);
}

function p_video_open(f) {
  // VideoOpenWeight: 0.05 — opening a video
  let p = 0.0;
  if (f.hasVideoMention) p = 0.20;
  return clamp01(p);
}

function p_mute_author(f) {
  // MuteAuthorWeight: -58.8 — WORSE than block in the real algo!
  // Triggered by annoying/repetitive/spammy content
  let p = 0.01;
  if (f.hasEngagementBait) p += 0.15;
  if (f.isSelfPromo) p += 0.12;
  if (f.capsRatio > 0.4) p += 0.08;
  if (f.hasLink && f.isSelfPromo) p += 0.08;
  if (f.hasDMBait && !f.hasCredibilityLine) p += 0.06;
  return clamp01(p);
}

function p_not_dwelled(f) {
  // NotDwelledWeight: -0.02 — tiny penalty for not dwelling (inverse of dwell)
  // This is the real "scrolled past" signal — but with a tiny weight
  let p = 0.30;
  if (!f.hooks.length) p += 0.20;
  if (f.firstLineWords > 8) p += 0.10;
  if (!f.hasBreaks && f.charCount > 100) p += 0.10;
  if (f.hasEngagementBait) p += 0.15;
  if (f.hasPatternInterrupt) p -= 0.15;
  if (f.hasOpenLoop) p -= 0.12;
  if (f.hasNicheShock) p -= 0.10;
  if (f.hasMundaneEncounter) p -= 0.15;
  if (f.hasVulnerableMilestone) p -= 0.15;
  return clamp01(p);
}

function p_post_unexplored(f) {
  // PostUnexploredWeight: 0.02 — tiny boost for novel/unexplored content
  let p = 0.10;
  if (f.hasCuriosityGap) p += 0.15;
  if (f.hasNicheShock) p += 0.10;
  if (f.hasPatternInterrupt) p += 0.08;
  if (f.hasAbsurdJuxtaposition) p += 0.10;
  return clamp01(p);
}

// Negative signals
function p_scrolled_past(f) {
  // The -11× killer. High when the hook is weak, no breaks, generic opener,
  // wall of text, or engagement bait. This is the inverse of dwell_binary.
  let p = 0.20;
  if (!f.hooks.length) p += 0.25;
  if (f.firstLineWords > 8) p += 0.15;
  if (!f.hasBreaks && f.charCount > 100) p += 0.15;
  if (f.capsRatio > 0.3) p += 0.10;
  if (f.hasEngagementBait) p += 0.20;
  if (f.isSelfPromo) p += 0.15;
  if (f.charCount < 30) p += 0.10;
  // strong hook pulls it down
  if (f.hooks.includes("contrarian")) p -= 0.15;
  if (f.hooks.includes("specific_number")) p -= 0.12;
  if (f.firstLineWords >= 4 && f.firstLineWords <= 6) p -= 0.10;
  // 2026 patterns that stop the scroll
  if (f.hasPatternInterrupt) p -= 0.20; // grounded setting / "found a guy" = instant stop
  if (f.hasOpenLoop) p -= 0.15; // curiosity gap prevents scroll-past
  if (f.hasNicheShock) p -= 0.15; // absurd claim stops the scroll
  if (f.hasTechHumor) p -= 0.12; // relatable humor stops devs
  if (f.hasZeroFrictionLayout) p -= 0.10; // easy to read = less likely to skip
  if (f.hasAsteriskAction) p -= 0.08; // visual pattern interrupt
  if (f.hasMundaneEncounter) p -= 0.18; // "i met him at a car service center" = instant stop
  if (f.hasSensoryDetail) p -= 0.08; // sensory grounding = immersive = no scroll
  if (f.hasBrainrot) p -= 0.15; // "the kinda bullshit printing $6M" stops the scroll
  if (f.hasNumberedBlueprint) p -= 0.08; // numbered steps = easy to scan = less skip
  if (f.hasVulnerableMilestone) p -= 0.20; // "I quit my job" = raw vulnerability stops the scroll
  if (f.hasAbsurdJuxtaposition) p -= 0.15; // "embryo → b2b SAAS" = humor stops the scroll
  if (f.hasAILossConfession) p -= 0.15; // "AI killed my startup" = dramatic confession stops scroll
  if (f.hasAIToolDrop) p -= 0.08; // trending AI tool name = stops devs
  if (f.hasDMBait) p -= 0.10; // "free guide" offer stops the scroll (even if risky)
  if (f.hasUrgencyGiveaway) p -= 0.12; // "24 hours free" = FOMO stops the scroll
  if (f.hasCredibilityLine) p -= 0.05; // credibility = trust = less likely to scroll past
  return clamp01(p);
}

function p_not_interested(f) {
  let p = 0.02;
  if (f.hasEngagementBait) p += 0.30;
  if (f.isSelfPromo) p += 0.20;
  if (f.capsRatio > 0.45) p += 0.15;
  if (f.hasLink && f.isSelfPromo) p += 0.10;
  if (f.hasDMBait) p += 0.08; // "like + reply for DM" can annoy some users → not_interested
  if (f.hasUrgencyGiveaway) p += 0.05; // "24h free giveaway" can feel slightly spammy
  // But credibility line reduces the spam perception
  if (f.hasCredibilityLine && f.hasDMBait) p -= 0.05;
  return clamp01(p);
}

function p_report(f) {
  let p = 0.005;
  if (f.hasEngagementBait) p += 0.05;
  if (f.capsRatio > 0.6) p += 0.03;
  return clamp01(p);
}

function p_block(f) {
  let p = 0.001;
  if (f.hasEngagementBait && f.isSelfPromo) p += 0.02;
  return clamp01(p);
}

function p_unfollow_after_view(f) {
  let p = 0.002;
  if (f.isSelfPromo && f.hasLink) p += 0.03;
  if (f.hasEngagementBait) p += 0.02;
  return clamp01(p);
}

// ---------------------------------------------------------------------------
// Predictors table — maps to REAL xai-org/x-algorithm signals
// ---------------------------------------------------------------------------
const PREDICTORS = [
  // === REAL positive signals (ordered by weight, highest first) ===
  ["share_via_copy_link", p_share_via_copy_link],   // 20.0 — KING signal
  ["reply", p_reply],                                 // 5.0
  ["share_via_dm", p_share_via_dm],                   // 5.0
  ["quote", p_quote],                                 // 5.0
  ["follow_author", p_follow_author],                 // 4.0
  ["share", p_share],                                 // 2.0 — NEW real signal
  ["retweet", p_repost],                              // 1.0
  ["favorite", p_like],                               // 0.5
  ["click", p_conversation_click],                    // 0.4 — was conversation_click
  ["open_link", p_open_link],                         // 0.2 — NEW real signal
  ["photo_expand", p_photo_expand],                   // 0.05
  ["video_open", p_video_open],                       // 0.05 — NEW real signal
  ["vqv", p_vqv],                                     // 0.05
  ["quoted_click", p_quoted_click],                   // 0.05
  ["cont_dwell_time", p_cont_dwell_time],             // 0.004
  ["profile_click", p_profile_click],                 // 0.0 — zero weight!
  ["dwell", p_dwell_binary],                          // 0.0 — zero weight!
  ["quoted_vqv", p_quoted_vqv],                       // 0.0
  ["cont_click_dwell_time", p_click_dwell_time],      // 0.0
  ["post_unexplored", p_post_unexplored],             // 0.02 — NEW real signal

  // === REAL negative signals ===
  ["report", p_report],                               // -234.0 — nuclear
  ["mute_author", p_mute_author],                     // -58.8 — NEW, worse than block!
  ["not_interested", p_not_interested],               // -43.2
  ["block_author", p_block],                          // -31.2 — was "block"
  ["not_dwelled", p_not_dwelled],                     // -0.02 — NEW, tiny

  // === LEGACY predictors (kept for backward compat, mapped to real signals) ===
  ["reply_author_reply_back", p_reply_author_reply_back],  // legacy: reply + mutual boost
  ["bookmark", p_bookmark],                                // legacy: not in real algo
  ["dwell_2min", p_dwell_2min],                            // legacy: maps to cont_dwell_time
  ["dwell_binary", p_dwell_binary],                        // legacy: maps to dwell (0.0)
  ["scrolled_past", p_scrolled_past],                      // legacy: maps to not_dwelled
  ["unfollow_after_view", p_unfollow_after_view],          // legacy: not in real algo (0.0)
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clamp01(x) { return Math.max(0, Math.min(1, x)); }

// ---------------------------------------------------------------------------
// Main: predict all signals + compute weighted algorithmic score
// Uses REAL xai-org/x-algorithm weights and scoring formula
// ---------------------------------------------------------------------------
function predictSignals(analysis) {
  const f = features(analysis);
  const signals = [];
  let positiveSum = 0;
  let negativeSum = 0;

  // Track real vs legacy separately so we can compute both scores
  let realScore = 0;
  let legacyScore = 0;
  const realSignals = new Set([
    "share_via_copy_link", "reply", "share_via_dm", "quote", "follow_author",
    "share", "retweet", "favorite", "click", "open_link", "photo_expand",
    "video_open", "vqv", "quoted_click", "cont_dwell_time", "profile_click",
    "dwell", "quoted_vqv", "cont_click_dwell_time", "post_unexplored",
    "report", "mute_author", "not_interested", "block_author", "not_dwelled",
  ]);

  for (const [name, predictor] of PREDICTORS) {
    const prob = predictor(f);
    const weight = SIGNAL_WEIGHTS[name];
    const contribution = weight * prob;
    const isNegative = weight < 0;
    if (isNegative) negativeSum += contribution;
    else positiveSum += contribution;
    
    if (realSignals.has(name)) realScore += contribution;
    else legacyScore += contribution;

    signals.push({
      signal: name,
      probability: Math.round(prob * 1000) / 1000,
      weight,
      multiplier: weight / 0.5, // vs a favorite/like
      contribution: Math.round(contribution * 100) / 100,
      negative: isNegative,
      isRealAlgo: realSignals.has(name),
    });
  }

  // Sort by absolute contribution (most impactful first)
  signals.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

  const algoScore = realScore; // use only real-algorithm signals for the score
  // Normalize to 0-100 scale. With real weights, max positive is ~35-40
  // (share_via_copy_link 20.0 × 1.0 + reply 5.0 × 1.0 + etc).
  // A typical decent post ~5-15; a bad one goes negative.
  // Map: algoScore >= 20 → 100, <= -5 → 0, linear between.
  const normalized = clamp01((algoScore + 5) / 25) * 100;

  // Engagement rate prediction based on signal probabilities
  const pFav = signals.find(s => s.signal === "favorite")?.probability || 0;
  const pReply = signals.find(s => s.signal === "reply")?.probability || 0;
  const pShare = signals.find(s => s.signal === "share")?.probability || 0;
  const pRt = signals.find(s => s.signal === "retweet")?.probability || 0;
  const pQuote = signals.find(s => s.signal === "quote")?.probability || 0;
  const pDm = signals.find(s => s.signal === "share_via_dm")?.probability || 0;
  const pCopyLink = signals.find(s => s.signal === "share_via_copy_link")?.probability || 0;
  const pFollow = signals.find(s => s.signal === "follow_author")?.probability || 0;
  const pBookmark = signals.find(s => s.signal === "bookmark")?.probability || 0;
  // Predicted engagement rate = sum of action probabilities
  const predictedEngagementRate = pFav + pReply + pShare + pRt + pQuote + pDm + pCopyLink + pFollow + pBookmark;
  
  // Classify against real benchmarks
  let engagementTier = "below-average";
  if (predictedEngagementRate >= ENGAGEMENT_BENCHMARKS.viral) engagementTier = "viral";
  else if (predictedEngagementRate >= ENGAGEMENT_BENCHMARKS.excellent) engagementTier = "excellent";
  else if (predictedEngagementRate >= ENGAGEMENT_BENCHMARKS.good) engagementTier = "good";
  else if (predictedEngagementRate >= ENGAGEMENT_BENCHMARKS.platformAverage) engagementTier = "average";

  // Dwell time prediction (seconds)
  const pDwell2min = signals.find(s => s.signal === "dwell_2min")?.probability || 0;
  const pDwellBinary = signals.find(s => s.signal === "dwell_binary")?.probability || 0;
  const predictedDwellSeconds = Math.round(
    (pDwellBinary * 3 + pDwell2min * 120 * (f.isThread ? DWELL_BENCHMARKS.threadMultiplier : 1)) * 10
  ) / 10;

  return {
    signals,
    positiveSum: Math.round(positiveSum * 100) / 100,
    negativeSum: Math.round(negativeSum * 100) / 100,
    algoScore: Math.round(algoScore * 100) / 100,
    normalizedScore: Math.round(normalized * 10) / 10,
    realScore: Math.round(realScore * 100) / 100,
    legacyScore: Math.round(legacyScore * 100) / 100,
    topPositive: signals.filter((s) => !s.negative && s.isRealAlgo).slice(0, 5),
    topNegative: signals.filter((s) => s.negative && s.isRealAlgo).sort((a, b) => a.contribution - b.contribution).slice(0, 3),
    // Real-algorithm diagnostics
    predictedEngagementRate: Math.round(predictedEngagementRate * 10000) / 10000,
    engagementTier,
    engagementBenchmarks: ENGAGEMENT_BENCHMARKS,
    predictedDwellSeconds,
    isThreadRecommended: f.isThread || (pDwell2min > 0.3 && f.charCount > 280),
    goldenHour: GOLDEN_HOUR,
  };
}

module.exports = {
  predictSignals,
  SIGNAL_WEIGHTS,
  PREDICTORS,
  features,
  clamp01,
  ENGAGEMENT_BENCHMARKS,
  DWELL_BENCHMARKS,
  GOLDEN_HOUR,
};
