/*
 * Self-reply engine — captures the +75 reply-author-reply-back signal.
 *
 * The single dominant signal in the 2026 X algorithm is a reply that the
 * author replies back to (+75 = 150× a like). The most reliable way to
 * trigger it is to post, then immediately self-reply with a question or
 * contrarian addendum that invites the audience to reply — then reply
 * back to them. This engine generates that self-reply + plans the chain.
 *
 * Also generates a "reply chain plan" — a strategy for the first 30-60
 * minutes (the velocity window that decides broader distribution).
 */

"use strict";

const { scorePost, analyze } = require("./engagementAlgo");

// ---------------------------------------------------------------------------
// Self-reply generation
//
// A good self-reply does one of:
//   1. Asks a specific question that's easy to answer (low friction → reply)
//   2. Adds a contrarian addendum that provokes disagreement
//   3. Shares a specific data point or story detail that invites "how?"
//   4. Tags the conversation forward ("reply with yours and I'll share mine")
//
// It should NOT repeat the original post, link-drop, or be promotional.
// ---------------------------------------------------------------------------

function detectPostAngle(analysis) {
  const hooks = analysis.detectedHooks;
  const text = analysis.text.toLowerCase();

  if (hooks.includes("contrarian")) return "contrarian";
  if (hooks.includes("confession")) return "confession";
  if (hooks.includes("specific_number") || hooks.includes("cost_reveal")) return "data_reveal";
  if (hooks.includes("n_things_i_learned")) return "list";
  if (hooks.includes("if_i_had_to_start_over")) return "playbook";
  if (hooks.includes("bold_prediction")) return "prediction";
  if (hooks.includes("before_after")) return "transformation";
  if (hooks.includes("you_dont_need")) return "myth_bust";
  if (hooks.includes("open_loop")) return "open_loop";
  if (analysis.isThread) return "thread";
  return "general";
}

// Templates per angle. Each produces a self-reply that maximizes the
// probability of a reply the author can reply back to.
const SELF_REPLY_TEMPLATES = {
  contrarian: [
    (post) => `the part everyone gets wrong about this:\n\nthey think it's about ${extractTopic(post) || "the idea"}. it's not.\n\nwhat's the pushback you'd give me?`,
    (post) => `before you reply "that's not true" —\n\nI changed my mind on this ${pickTimeframe()}. used to believe the opposite.\n\nwhat would it take to change yours?`,
    (post) => `the strongest counter-argument to what I just said:\n\n${extractCounterPoint(post) || "maybe it works for most people and I'm the outlier."}\n\ndisagree? tell me where I'm wrong.`,
  ],
  confession: [
    (post) => `what I didn't say in that post:\n\nthe low point was worse than it sounds. almost quit ${pickTimeframe()}.\n\nhas anyone else been there?`,
    (post) => `the thing I'd do differently if I started over:\n\nI wouldn't wait so long to ${extractAction(post) || "ask for help"}.\n\nwhat's your "I wish I'd done it sooner"?`,
    (post) => `reply with the mistake you keep making.\n\nI'll go first: ${extractMistake(post) || "optimism about timelines"}.`,
  ],
  data_reveal: [
    (post) => `the number that surprised me most:\n\nit wasn't the headline figure. it was the ${pickSecondaryMetric()} that nobody talks about.\n\nwhat metric do you wish people tracked?`,
    (post) => `how I got there (the unsexy part):\n\nno hack. just ${pickGrindDetail()} for ${pickDuration()}.\n\nwhat's your unsexy grind?`,
    (post) => `breakdown of what actually moved the number:\n\nreply "breakdown" and I'll share the 3 things that mattered vs the 10 that didn't.`,
  ],
  list: [
    (post) => `the one I'd add if I wrote this today:\n\n${pickExtraLesson()}\n\nwhat's missing from the list?`,
    (post) => `the lesson that took me the longest to actually believe:\n\n#${pickLessonNumber()} — I "knew" it for years before I did it.\n\nwhich one are you still resisting?`,
    (post) => `reply with the lesson you'd put at #1.\n\nI'll share the one I think is most underrated.`,
  ],
  playbook: [
    (post) => `the step I'd skip if I had to do it in half the time:\n\n${pickSkippableStep()}\n\nwhat would you cut?`,
    (post) => `the thing I wasted the most time on starting out:\n\n${pickWaste()}. almost killed the whole thing.\n\nwhat was your biggest time sink?`,
    (post) => `reply "playbook" and I'll drop the full step-by-step.\n\n(or tell me where you're stuck and I'll go deeper on that part.)`,
  ],
  prediction: [
    (post) => `the part I'm least confident about:\n\n${pickUncertainty()}. could go either way.\n\nwhat's your probability?`,
    (post) => `if I'm wrong, it's because of one thing:\n\n${pickFailureMode()}. that's the scenario that breaks the thesis.\n\nwhat would change your mind?`,
    (post) => `put a date on your disagreement.\n\nI'll check back in ${pickDuration()} and admit it publicly if I was wrong. who's in?`,
  ],
  transformation: [
    (post) => `the thing that actually drove the change:\n\nit wasn't the ${pickSurfaceChange()}. it was the boring part nobody sees.\n\nwhat was your inflection point?`,
    (post) => `what I tried that DIDN'T work first:\n\n${pickFailedAttempt()}. wasted ${pickDuration()} on it.\n\nwhat did you try before it clicked?`,
    (post) => `reply with your before → after.\n\nI'll share the one habit that bridged the gap for me.`,
  ],
  myth_bust: [
    (post) => `the thing you DO need that nobody talks about:\n\n${pickHiddenRequirement()}. that's the real prerequisite.\n\nwhat did you discover you actually needed?`,
    (post) => `the exception where the myth is actually true:\n\n${pickException()}. in that case, you really do need it.\n\nhave you hit the exception?`,
    (post) => `reply with a myth you believed for way too long.\n\nI'll share the one that cost me the most.`,
  ],
  open_loop: [
    (post) => `the part I left out on purpose:\n\nthere's a second half to this. reply "more" and I'll share it.`,
    (post) => `here's what nobody told ME when I was learning this:\n\n${pickHiddenLesson()}. took ${pickDuration()} to figure out.\n\nwhat was your "nobody told me" moment?`,
    (post) => `reply with what you think the answer is.\n\nI'll share what actually worked — and it's probably not what you'd guess.`,
  ],
  thread: [
    (post) => `the tweet in this thread that got the most DMs:\n\nit wasn't the hook. it was the one about ${pickThreadHighlight() || "the middle part"}.\n\nwhat resonated most with you?`,
    (post) => `if you only read one tweet from this thread:\n\nit's the one about ${pickThreadHighlight() || "the core insight"}.\n\nreply with the one that hit hardest for you.`,
    (post) => `reply "save" and I'll send you the PDF version.\n\n(or tell me which part you want me to go deeper on.)`,
  ],
  general: [
    (post) => `genuinely curious — does this match your experience?\n\nreply with where you'd push back or agree.`,
    (post) => `the question I keep getting about this:\n\n"${pickCommonQuestion()}"\n\nI'll answer it in the replies. what else?`,
    (post) => `reply with your take.\n\nI'll reply to every response — want to actually talk through this one.`,
  ],
};

// ---------------------------------------------------------------------------
// Topic extraction helpers (lightweight, no NLP)
// ---------------------------------------------------------------------------
function extractTopic(text) {
  // Try to pull the core noun phrase from the first line
  const firstLine = text.split("\n")[0];
  // Remove common hook prefixes and filler
  const cleaned = firstLine
    .replace(/\b(most people|everyone|they say|nobody|you'?ve been told|you have been told|conventional)\b/gi, "")
    .replace(/\b(think|believe|say|assume|need|want)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  // Try to find a noun phrase — words after articles/possessives often mark the subject
  // e.g., "My SaaS, a form builder, was dying" → "SaaS" not "My SaaS a form"
  const nounMatch = cleaned.match(/\b(?:my|our|the|a|an|this|that)\s+([a-z]+(?:\s+[a-z]+)?)\b/i);
  if (nounMatch) return nounMatch[1].toLowerCase();
  // Fallback: take up to 3 meaningful words (skip short filler)
  const words = (cleaned.match(/[\w']+/g) || []).filter(w => w.length > 2);
  if (words.length >= 1) return words.slice(0, 3).join(" ").toLowerCase();
  return null;
}

function extractCounterPoint(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim());
  if (sentences.length > 1) {
    const last = sentences[sentences.length - 1].trim();
    const words = last.match(/[\w']+/g) || [];
    if (words.length >= 3) return words.slice(0, 8).join(" ") + "...";
  }
  return null;
}

function extractAction(text) {
  const m = text.match(/\b(start|build|ship|launch|try|test|ask|post|write|learn)\b\w*/i);
  return m ? m[0] : null;
}

function extractMistake(text) {
  const m = text.match(/\b(failed|hate|regret|wrong|mistake|ignored|underestimated|overestimated)\b\w*/i);
  return m ? m[0] : null;
}

// Lightweight random pickers for variety (deterministic per call is fine —
// the caller scores all candidates and picks the best)
function pickTimeframe() {
  return pick(["3 months ago", "6 months ago", "a year ago", "2 years ago", "18 months ago", "90 days ago", "a few weeks ago"]);
}
function pickDuration() {
  return pick(["3 months", "6 months", "a year", "2 years", "18 months", "90 days", "a few weeks"]);
}
function pickSecondaryMetric() {
  return pick(["conversion rate", "retention", "churn", "margin", "time-to-first-value", "reply rate"]);
}
function pickGrindDetail() {
  return pick(["showing up daily", "answering every DM", "writing 1000 words a day", "cold outreach", "shipping in public"]);
}
function pickExtraLesson() {
  return pick(["consistency beats intensity", "distribution > product (early on)", "charge sooner than you think", "boring works"]);
}
function pickLessonNumber() {
  return String(pick([1, 2, 3, 4, 5]));
}
function pickSkippableStep() {
  return pick(["the logo", "the website redesign", "the perfect plan", "waiting for confidence", "the second product"]);
}
function pickWaste() {
  return pick(["building features nobody asked for", "polishing the brand", "networking events", "the wrong channel"]);
}
function pickUncertainty() {
  return pick(["the timing", "the audience shift", "the second-order effects", "the adoption curve"]);
}
function pickFailureMode() {
  return pick(["regulation", "a faster competitor", "the market not being ready", "a platform shift"]);
}
function pickSurfaceChange() {
  return pick(["tactics", "tools", "strategy doc", "team", "framework", "system", "new software", " shiny tactic"]);
}
function pickFailedAttempt() {
  return pick(["copying the leaders", "paid ads too early", "building without talking to users", "the pivot"]);
}
function pickHiddenRequirement() {
  return pick(["distribution", "patience", "a specific skill", "an audience", "a network effect"]);
}
function pickException() {
  return pick(["regulated industries", "enterprise sales", "hardware", "two-sided markets"]);
}
function pickHiddenLesson() {
  return pick(["nobody optimizes for the reply", "the first 10 fans matter more than the next 10k", "consistency is a moat"]);
}
function pickThreadHighlight() {
  return pick(["the failure", "the specific number", "the counterintuitive part", "the 'what I'd do differently'"]);
}
function pickCommonQuestion() {
  return pick(["how long did that take?", "what would you do differently?", "does this still work in 2026?", "what tools did you use?"]);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------------------------------------------------------------------
// Generate self-reply candidates + score them
// ---------------------------------------------------------------------------
function generateSelfReplies(postText, opts = {}) {
  const analysis = analyze(postText);
  const angle = detectPostAngle(analysis);
  const templates = SELF_REPLY_TEMPLATES[angle] || SELF_REPLY_TEMPLATES.general;

  const candidates = templates.map((tpl) => {
    const text = tpl(postText);
    const score = scorePost(text);
    return {
      text,
      score: score.score,
      grade: score.grade,
      angle,
      strategy: classifyStrategy(text),
    };
  });

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return {
    angle,
    candidates,
    best: candidates[0],
  };
}

function classifyStrategy(text) {
  if (/reply with|reply ".*"/i.test(text)) return "direct_reply_invite";
  if (/what'?s your|what would|what did|what.*you/i.test(text)) return "question";
  if (/disagree|pushback|wrong|change your mind/i.test(text)) return "contrarian_provocation";
  if (/I'll (share|send|drop|answer|reply)/i.test(text)) return "value_for_reply";
  return "conversation_starter";
}

// ---------------------------------------------------------------------------
// Reply-chain planner — strategy for the first 30-60 min velocity window
// ---------------------------------------------------------------------------
function planReplyChain(postText, selfReply) {
  const analysis = analyze(postText);
  const angle = detectPostAngle(analysis);

  const plan = {
    window: "First 30-60 minutes — this is when the algo decides broader distribution.",
    steps: [
      {
        when: "0 min",
        action: "Post the original.",
        why: "Tue-Thu 8-11am ET. Wed 9am = peak.",
      },
      {
        when: "1-2 min",
        action: "Post the self-reply immediately.",
        why: "Self-reply seeds the reply chain. The +75 signal fires when someone replies to THIS and you reply back.",
        text: selfReply,
      },
      {
        when: "5-15 min",
        action: "Reply to every single reply. No exceptions.",
        why: "Each author-reply-back = +75 (150× a like). This is the dominant signal. Missing even one reply in the first 15 min kills velocity.",
      },
      {
        when: "15-30 min",
        action: "Reply with a follow-up question to anyone who engaged.",
        why: "Turn a like into a reply, a reply into a thread. Each additional reply-back compounds the +75 signal.",
      },
      {
        when: "30-60 min",
        action: "If velocity is good (10+ replies), post a follow-up addendum.",
        why: "Extends the thread. The algo rewards dwell_2min (+10) — longer threads keep people reading.",
        template: followUpTemplate(angle),
      },
      {
        when: "60+ min",
        action: "Quote-tweet your own post with a key insight from the replies.",
        why: "Quote (+1.5) + exposes the post to a new audience. Only do this if the thread has real engagement.",
      },
    ],
    dont: [
      "Don't link-drop in the first reply — it kills the reply chain.",
      "Don't reply with just 'thanks!' — add a question to keep the chain alive.",
      "Don't go silent for 20+ min in the first hour — velocity dies.",
      "Don't post and leave. The algo measures YOUR engagement too.",
    ],
  };

  return plan;
}

function followUpTemplate(angle) {
  const templates = {
    contrarian: "update: the replies are split ~60/40 on this.\n\nthe 40% who disagree are making one specific point I didn't address: ___",
    confession: "a few people DM'd me asking for the full story.\n\nhere's the part I left out: ___",
    data_reveal: "biggest question in the replies: 'how did you measure that?'\n\nhere's the exact setup: ___",
    list: "reply consensus so far: lesson #__ is the most controversial.\n\nhere's why I stand by it: ___",
    playbook: "someone asked: 'what would you do in the first 30 days?'\n\nhere's the day-by-day: ___",
    prediction: "early reactions: 70% agree, 30% think I'm too aggressive on timeline.\n\nthe case for being faster: ___",
    transformation: "the question I keep getting: 'what was the turning point?'\n\nit wasn't one moment. it was ___",
    myth_bust: "pushback in the replies: 'but you DO need ___ in some cases.'\n\nthey're right. here's the exception: ___",
    open_loop: "the second half of what I started earlier:\n\n___",
    thread: "the reply that surprised me most:\n\n___\n\ndidn't expect that take.",
    general: "appreciate the replies.\n\nthe pattern I'm seeing: ___\n\nwho else is seeing this?",
  };
  return templates[angle] || templates.general;
}

// ---------------------------------------------------------------------------
// Full self-reply package
// ---------------------------------------------------------------------------
function generateSelfReplyPackage(postText) {
  const postScore = scorePost(postText);
  const { angle, candidates, best } = generateSelfReplies(postText);
  const chain = planReplyChain(postText, best.text);

  return {
    postScore: postScore.score,
    postGrade: postScore.grade,
    angle,
    selfReply: best.text,
    selfReplyScore: best.score,
    selfReplyGrade: best.grade,
    selfReplyStrategy: best.strategy,
    alternatives: candidates.slice(1).map((c) => ({ text: c.text, score: c.score, strategy: c.strategy })),
    replyChainPlan: chain,
    signalNote: `This self-reply is engineered to trigger the +75 reply-author-reply-back signal (150× a like) — the dominant signal in the 2026 X algorithm. Reply to every reply in the first 30-60 min to maximize it.`,
  };
}

module.exports = {
  generateSelfReplyPackage,
  generateSelfReplies,
  planReplyChain,
  detectPostAngle,
};
