/*
 * Sprinter — the high-engagement X post generator.
 *
 * Give it a topic, angle, or rough idea, and it PRINTS posts designed to
 * scroll-stop, drive replies, get copied off-platform, and trigger the
 * highest-weight signals in the REAL xai-org/x-algorithm.
 *
 * The real algorithm's top signals are:
 *   1. share_via_copy_link (20.0 = 40x a like) — KING signal
 *   2. reply (5.0 = 10x) + bidirectional_follow_reply_boost (15.0) = up to 20.0
 *   3. share_via_dm (5.0 = 10x)
 *   4. quote (5.0 = 10x)
 *   5. follow_author (4.0 = 8x)
 *   6. share (2.0 = 4x)
 *   7. retweet (1.0 = 2x)
 *   8. favorite (0.5 = 1x)
 *
 * So the sprinter generates posts that maximize:
 *   - Copy-link-worthiness (insightful, referenceable, quotable)
 *   - Reply-triggering (opinionated, debate-worthy, asks a question)
 *   - DM-share-worthiness (relatable, "send this to someone who...")
 *   - Quote-tweet-worthiness (contrarian, hot take, controversial)
 *   - Follow-triggering (series-worthy, "I post about X")
 *
 * It generates from HOOK FRAMEWORKS, not templates — each post is unique
 * to the topic and angle provided.
 */

"use strict";

const { scorePost, analyze } = require("./engagementAlgo");
const { generateHooks, extractTopic, HOOK_LIBRARY } = require("./hookLibrary");
const { predictSignals, SIGNAL_WEIGHTS, ENGAGEMENT_BENCHMARKS } = require("./signalModel");

// ---------------------------------------------------------------------------
// Post archetypes — each targets different high-value algorithm signals
// ---------------------------------------------------------------------------
const ARCHETYPES = [
  {
    name: "contrarian_take",
    targetSignals: ["quote", "reply", "share_via_copy_link"],
    why: "Quote-tweets (5.0) + replies (5.0) + copy-link shares (20.0) — contrarian takes get all three",
    hookCategories: ["contrarian", "bold_claim", "negative_frame"],
    bodyBuilder: buildContrarianBody,
  },
  {
    name: "actionable_listicle",
    targetSignals: ["share_via_copy_link", "bookmark", "share_via_dm"],
    why: "Lists get copied off-platform (20.0) + bookmarked + DM'd to friends (5.0)",
    hookCategories: ["listicle", "curiosity", "secret"],
    bodyBuilder: buildListicleBody,
  },
  {
    name: "story_confession",
    targetSignals: ["reply", "follow_author", "share_via_dm"],
    why: "Stories drive replies (5.0) + follows (4.0) + DM shares (5.0)",
    hookCategories: ["confession", "transformation", "storytelling"],
    bodyBuilder: buildStoryBody,
  },
  {
    name: "pattern_interrupt",
    targetSignals: ["share_via_copy_link", "quote", "reply"],
    why: "Pattern interrupts stop the scroll + get copied + get quote-tweeted",
    hookCategories: ["pattern_interrupt", "curiosity", "bold_claim"],
    bodyBuilder: buildPatternInterruptBody,
  },
  {
    name: "proof_receipts",
    targetSignals: ["share_via_copy_link", "follow_author", "bookmark"],
    why: "Proof posts get saved (bookmark) + copied (20.0) + drive follows (4.0)",
    hookCategories: ["proof", "transformation", "stat"],
    bodyBuilder: buildProofBody,
  },
  {
    name: "debate_question",
    targetSignals: ["reply", "quote", "share_via_dm"],
    why: "Questions drive replies (5.0) + quote-tweets (5.0) + DM debates (5.0)",
    hookCategories: ["question", "audience_callout", "contrarian"],
    bodyBuilder: buildDebateBody,
  },
];

// ---------------------------------------------------------------------------
// Body builders — coherent: the body follows through on the hook's promise
// ---------------------------------------------------------------------------

function buildContrarianBody(topic, hook, angle) {
  // Body delivers the counter-argument — does NOT repeat the contrarian claim
  const bodies = [
    `the real leverage is in the boring part nobody talks about:\n\n-> the fundamentals\n-> the reps\n-> the consistency\n\nthat's it. that's the post.`,
    `none of the default advice addresses the actual bottleneck:\n\nyou don't have a ${topic} problem. you have a focus problem.\n\nfix that first.`,
    `you're polishing a leaky bucket.\n\nplug the hole first:\n\n1. nail the basics\n2. ship one thing\n3. repeat for 90 days\n\nthen optimize.`,
    `it's a tool, not the answer.\n\nthe answer is showing up every day when nobody's watching.\n\neveryone wants the hack. nobody wants the reps.\n\nbe the one who does the reps.`,
    `90% of people are consuming content about it instead of doing it.\n\nthe 10% who win? they're too busy building to read this.`,
  ];
  return pickVariation(bodies, hook);
}

function buildListicleBody(topic, hook, angle) {
  // The hook already promises a list — the body DELIVERS it without repeating the framing
  const bodies = [
    `1. start before you're ready — the first attempt is supposed to suck\n2. consistency > intensity — 20 minutes daily beats 5 hours weekly\n3. nobody is paying attention — they're too busy worrying about themselves\n\nsave this. you'll need it.`,
    `1. waiting for the "right time" — it doesn't exist\n2. copying gurus instead of testing what works for YOU\n3. quitting at week 3 — right before compounding kicks in\n\nwhich one are you guilty of?`,
    `1. the fundamentals beat every framework\n2. done > perfect — ship and iterate\n3. the boring work is the leverage\n\nreply with your biggest ${topic} lesson.`,
    `1. it's 80% psychology, 20% tactics\n2. your first 100 attempts are tuition, not failure\n3. momentum > motivation — just keep moving\n\nsend this to someone who needs it.`,
  ];
  return pickVariation(bodies, hook);
}

function buildStoryBody(topic, hook, angle) {
  // Body delivers the story — does NOT repeat the hook's opening
  const bodies = [
    `6 months ago I knew nothing.\n\ntoday it's the highest-leverage thing I do.\n\nhere's what changed:\n\nI stopped consuming and started doing.\nthat's it.\nthat's the whole secret.`,
    `for 2 years I did it the "right way" and got nowhere.\n\nthen I tried the opposite:\n\nless planning. more shipping.\nless advice. more testing.\nless perfect. more public.\n\nit worked.`,
    `I learned the hard way:\n\n-> the tutorials lie about how fast it takes\n-> the gurus skip the boring parts\n-> the real skill is consistency, not talent\n\nhere's what I wish someone told me on day 1:`,
    `3 months in. zero results. total burnout.\n\nthen I realized I was doing one thing wrong:\n\nI was optimizing for the outcome instead of the process.\n\nI fixed that. everything changed.`,
  ];
  return pickVariation(bodies, hook);
}

function buildPatternInterruptBody(topic, hook, angle) {
  const bodies = [
    `stop scrolling.\n\n${capFirst(topic)} is about to make sense.\n\nthe one thing nobody explains:\n\nit's not about the tactic. it's about the system.\n\nbuild the system. the results follow.`,
    `wait.\n\n${capFirst(topic)} isn't what you think.\n\neveryone focuses on the output.\nnobody talks about the input.\n\ngarbage in. garbage out.\n\nfix your inputs first.`,
    `read this twice.\n\n${capFirst(topic)} only works if you understand one thing:\n\nthe compound effect is real but invisible.\n\nyou won't see results for 90 days.\nthen you'll see all of them at once.\n\ndon't quit at day 89.`,
    `this sounds insane.\n\n${capFirst(topic)}? it's backwards.\n\nthe more you try to succeed, the harder it gets.\nthe more you try to be useful, the easier it gets.\n\nshift the goal. watch what happens.`,
  ];
  return pickVariation(bodies, hook);
}

function buildProofBody(topic, hook, angle) {
  // Body delivers the proof — does NOT repeat the hook
  const bodies = [
    `here's what happened:\n\n-> week 1-2: nothing. total silence.\n-> week 3-4: first small wins.\n-> week 5-12: compounding kicked in.\n\nthe lesson? the first month is tuition. don't quit during tuition.`,
    `I went from zero to real results in 60 days.\n\nno hacks. no shortcuts. no gurus.\n\njust:\n1. show up daily\n2. ship publicly\n3. iterate fast\n\nthat's the entire formula.`,
    `30 day results:\n\n- what I did: 20 minutes daily, no excuses\n- what happened: slow start, sudden acceleration week 3\n- what I'd do differently: start sooner, worry less\n\nsave this before you try it.`,
    `the data surprised me:\n\nthe best days weren't the longest sessions.\nthey were the consistent ones.\n\n20 minutes daily > 5 hours weekly.\nevery. single. time.`,
  ];
  return pickVariation(bodies, hook);
}

function buildDebateBody(topic, hook, angle) {
  // Body delivers the argument — does NOT repeat the "hot take" framing
  const bodies = [
    `everyone's chasing it. few need it.\n\nthe real skill? shipping consistently.\n\nagree or disagree?`,
    `the fundamentals haven't changed. the tools have.\n\ntools are temporary. fundamentals compound.\n\nchange my mind:`,
    `what matters more:\n-> showing up\n-> being consistent\n-> giving a shit\n\nthe rest is noise.`,
    `80% of the content about it is recycled fluff.\n20% is genuinely useful.\n\nthe skill is telling the difference.\n\nwhat's your take?`,
  ];
  return pickVariation(bodies, hook);
}

// ---------------------------------------------------------------------------
// Archetype-specific hook generators — always coherent with the body
// ---------------------------------------------------------------------------

function makeArchetypeHook(archetypeName, topic) {
  const t = topic.toLowerCase().trim();
  // Clean up verb-phrase topics for natural phrasing
  let ct = cleanTopicForHook(t);
  // Preserve capitalization of single-letter proper nouns like "X"
  ct = ct.replace(/\bx\b/g, "X");
  const hooks = {
    contrarian_take: [
      `${capFirst(ct)} is overrated.`,
      `stop doing ${ct}.`,
      `everyone is wrong about ${ct}.`,
      `${capFirst(ct)} won't save you.`,
      `the ${ct} advice is lying to you.`,
    ],
    actionable_listicle: [
      `3 things about ${ct} nobody tells you.`,
      `3 ${singularize(ct)} mistakes costing you time.`,
      `3 ${ct} lessons I wish I knew earlier.`,
      `3 things about ${ct} that feel illegal to know.`,
      `3 ${singularize(ct)} rules I live by now.`,
    ],
    story_confession: [
      `I almost quit ${ct}.`,
      `I was wrong about ${ct}.`,
      `6 months ago I knew nothing about ${ct}.`,
      `${capFirst(ct)} almost broke me.`,
      `nobody warned me about ${ct}.`,
    ],
    pattern_interrupt: [
      `stop scrolling.`,
      `wait.`,
      `read this twice.`,
      `this sounds insane.`,
      `you're doing ${ct} wrong.`,
    ],
    proof_receipts: [
      `I tested ${ct} for 90 days.`,
      `proof that ${ct} works.`,
      `${capFirst(ct)} — 30 day results.`,
      `I tracked every ${ct} session for 3 months.`,
      `${capFirst(ct)} changed everything. here's the data.`,
    ],
    debate_question: [
      `hot take: ${ct} is overrated.`,
      `is ${ct} actually worth it?`,
      `unpopular opinion: ${ct} is overrated.`,
      `${capFirst(ct)} — necessary or hype?`,
      `change my mind about ${ct}.`,
    ],
  };
  const list = hooks[archetypeName] || hooks.contrarian_take;
  return list[Math.floor(Math.random() * list.length)];
}

function cleanTopicForHook(topic) {
  const t = topic.toLowerCase().trim();
  if (/^starting a /.test(t)) {
    const noun = t.replace(/^starting a /, "");
    // "podcast" -> "podcasts" but don't double-pluralize
    if (noun.endsWith("s")) return noun;
    return noun + "s";
  }
  if (/^learning to /.test(t)) {
    const verb = t.replace(/^learning to /, "");
    // "code" -> "coding" (drop silent e), "write" -> "writing"
    if (/e$/.test(verb) && !/(ee|ie|oe|ye)$/.test(verb)) {
      return verb.slice(0, -1) + "ing";
    }
    return verb + "ing";
  }
  if (/^getting /.test(t)) {
    const word = t.replace(/^getting /, "");
    if (word === "fit") return "fitness";
    if (word === "strong") return "strength training";
    if (word === "rich") return "building wealth";
    return word;
  }
  if (/^building (a |an |the )?/.test(t)) {
    return t.replace(/^building (a |an |the )?/, "");
  }
  if (/^investing in /.test(t)) {
    return t.replace(/^investing in /, "") + " investing";
  }
  return t;
}

// ---------------------------------------------------------------------------

function pickCount(hook) {
  const numMatch = hook?.match(/\d+/);
  if (numMatch) return numMatch[0];
  return "3";
}

function pickVariation(bodies, hook) {
  // Use hook string hash for deterministic selection
  const hash = (hook || "").split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return bodies[hash % bodies.length];
}

function capFirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function singularize(s) {
  if (s.endsWith("ies")) return s.slice(0, -3) + "y";
  if (s.endsWith("ses")) return s.slice(0, -2);
  // Don't strip from acronyms/proper nouns like "saas", "news", "series"
  if (s.length <= 5 && /aas|oos|ees|iis|ews|ass$/.test(s)) return s;
  if (s.endsWith("s") && !s.endsWith("ss")) return s.slice(0, -1);
  return s;
}

function dedupeHooks(hooks) {
  const seen = new Set();
  const result = [];
  for (const h of hooks) {
    const key = h.hook.toLowerCase().trim();
    if (!seen.has(key) && h.passesTest !== false) {
      seen.add(key);
      result.push(h);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Sprinter: generate posts from a topic
// ---------------------------------------------------------------------------

async function sprint(input) {
  const { topic, angle, count = 6, useNeural = false } = typeof input === "string"
    ? { topic: input }
    : input;

  if (!topic || topic.length < 2) {
    return { error: "Provide a topic to sprint (e.g., 'building SaaS', 'AI tools for creators')" };
  }

  // --- PRIMARY: Neural generator (Qwen 2.5 0.5B, CPU, few-shot from viral corpus) ---
  if (useNeural) {
    try {
      const { generate: neuralGenerate } = require("./neuralGenerator");
      const neuralResult = await neuralGenerate(topic, { count });
      if (neuralResult && !neuralResult.error && neuralResult.posts && neuralResult.posts.length > 0) {
        const result = {
          topic,
          posts: neuralResult.posts.map(p => ({
            post: p.post,
            hook: p.post.split("\n")[0],
            archetype: p.archetype,
            archetypeWhy: p.archetypeWhy,
            score: p.score,
            grade: p.grade,
            realScore: p.realScore,
            engagementTier: p.engagementTier,
            predictedDwellSeconds: p.predictedDwellSeconds,
            topSignals: p.topSignals,
            threadRecommended: p.predictedDwellSeconds > 200,
            iterationCount: p.iterationCount || 0,
            converged: p.converged !== false,
            originalGrade: p.originalGrade || p.grade,
            originalScore: p.originalScore || p.score,
            problems: p.problems || [],
          })),
          bestPost: neuralResult.posts[0],
          algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
          method: neuralResult.method,
          modelInfo: neuralResult.modelInfo,
          niche: neuralResult.niche,
          goal: neuralResult.goal,
        };
        return result;
      }
      // If neural failed, fall through to content engine
    } catch (e) {
      // Fall through to content engine
    }
  }

  // --- FALLBACK 1: Content engine (senior copywriter with real insights) ---
  try {
    const { generate } = require("./contentEngine");
    const { suggestMissingDetails } = require("./honestFeedback");
    const startTime = Date.now();
    const enginePosts = generate(topic, { count });
    // Minimum 2.5s processing time so the "thinking" indicator is visible
    // and the user can see the system is actually working
    const elapsed = Date.now() - startTime;
    if (elapsed < 2500) {
      await new Promise(resolve => setTimeout(resolve, 2500 - elapsed));
    }
    if (enginePosts && enginePosts.length > 0) {
      const result = {
        topic,
        posts: enginePosts.map(p => ({
          post: p.post,
          hook: p.hook,
          archetype: p.angleType,
          archetypeWhy: p.angleReasoning,
          score: p.score,
          grade: p.grade,
          realScore: p.realScore,
          engagementTier: p.engagementTier,
          predictedDwellSeconds: p.predictedDwellSeconds,
          topSignals: p.topSignals,
          qualityScore: p.qualityScore,
          threadRecommended: p.predictedDwellSeconds > 200,
          suggestedTweaks: p.qualityIssues?.slice(0, 3) || [],
          // Iteration info
          iterationCount: p.iterationCount,
          converged: p.converged,
          originalGrade: p.originalGrade,
          originalScore: p.originalScore,
          assessment: p.assessment,
        })),
        bestPost: enginePosts[0],
        algorithm: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
        method: "content-engine (senior copywriter with real insights + quality checking)",
      };

      // If the best post is below B, suggest what details would help
      const best = result.posts[0];
      if (best && best.grade && !best.grade.startsWith("A") && !best.grade.startsWith("B")) {
        result.needsMoreDetails = suggestMissingDetails(topic, best.assessment);
      }

      return result;
    }
  } catch (e) {
    // Fall through to legacy generation
  }

  // --- FALLBACK: Legacy template-based generation ---
  // Extract a clean topic for hook generation, but keep the full topic for body context
  let cleanTopic = extractTopic(topic) || topic.toLowerCase().trim();
  // Preserve capitalization of single-letter proper nouns like "X"
  cleanTopic = cleanTopic.replace(/\bx\b/g, "X");
  const fullTopic = topic.toLowerCase().trim();

  // Generate hooks from the library
  const allHooks = generateHooks(cleanTopic);
  const validHooks = dedupeHooks(allHooks);

  // Group hooks by category for archetype matching
  const hooksByCategory = {};
  for (const h of validHooks) {
    if (!hooksByCategory[h.category]) hooksByCategory[h.category] = [];
    hooksByCategory[h.category].push(h);
  }

  // Generate candidates from each archetype
  const candidates = [];
  for (const archetype of ARCHETYPES) {
    // Always generate archetype-specific hooks (include topic, always coherent)
    const archHook1 = makeArchetypeHook(archetype.name, cleanTopic);
    const archHook2 = makeArchetypeHook(archetype.name, cleanTopic);
    let archetypeHooks = [
      { hook: archHook1, category: archetype.hookCategories[0], passesTest: true },
      { hook: archHook2, category: archetype.hookCategories[0], passesTest: true },
    ];

    // Also try library hooks that match this archetype's categories (as bonus candidates)
    for (const cat of archetype.hookCategories) {
      if (hooksByCategory[cat]) {
        archetypeHooks.push(...hooksByCategory[cat].slice(0, 1));
      }
    }

    for (const hookObj of archetypeHooks.slice(0, 2)) {
      // Use clean topic for body (natural phrasing), pass hook to avoid repetition
      const body = archetype.bodyBuilder(cleanTopic, hookObj.hook + archetypeHooks.indexOf(hookObj), angle);
      const post = `${hookObj.hook}\n\n${body}`;

      // Score the post
      const result = scorePost(post);
      const signals = result.signalModel;

      candidates.push({
        post,
        hook: hookObj.hook,
        hookCategory: hookObj.category,
        archetype: archetype.name,
        archetypeWhy: archetype.why,
        targetSignals: archetype.targetSignals,
        score: result.score,
        grade: result.grade,
        realScore: signals.realScore,
        engagementTier: signals.engagementTier,
        predictedEngagementRate: signals.predictedEngagementRate,
        predictedDwellSeconds: signals.predictedDwellSeconds,
        isThreadRecommended: signals.isThreadRecommended,
        topSignals: signals.topPositive.map(s => `${s.signal} (${s.contribution > 0 ? "+" : ""}${s.contribution})`),
        topProblems: result.problems.slice(0, 3),
        signalsToAdd: result.signalsToAdd.slice(0, 3),
        charCount: post.length,
      });
    }
  }

  // Sort by real algorithm score (not the legacy composite)
  candidates.sort((a, b) => b.realScore - a.realScore);

  // Take top N
  const top = candidates.slice(0, count);

  // Deduplicate by hook (no two posts with the same hook)
  const seenHooks = new Set();
  const deduped = [];
  for (const c of top) {
    const key = c.hook.toLowerCase().trim();
    if (!seenHooks.has(key)) {
      seenHooks.add(key);
      deduped.push(c);
    }
  }

  return {
    topic: cleanTopic,
    angle: angle || null,
    generatedCount: candidates.length,
    posts: deduped,
    bestPost: deduped[0] || null,
    // Real algorithm context
    algorithm: {
      source: "xai-org/x-algorithm (official open-source, sync 2026-08-12)",
      topSignals: [
        { signal: "share_via_copy_link", weight: 20.0, multiplier: "40x a like" },
        { signal: "reply + mutual boost", weight: 20.0, multiplier: "40x a like" },
        { signal: "share_via_dm", weight: 5.0, multiplier: "10x a like" },
        { signal: "quote", weight: 5.0, multiplier: "10x a like" },
        { signal: "follow_author", weight: 4.0, multiplier: "8x a like" },
      ],
      benchmarks: ENGAGEMENT_BENCHMARKS,
    },
  };
}

// ---------------------------------------------------------------------------
// Sprint summary — a human-readable printout of the best posts
// ---------------------------------------------------------------------------

async function sprintPrint(input) {
  const result = await sprint(input);
  if (result.error) return result.error;

  const lines = [];
  lines.push("=== AGENTX SPRINT ===");
  lines.push(`Topic: ${result.topic}`);
  lines.push(`Generated ${result.posts.length} posts`);
  lines.push(`Algorithm: ${typeof result.algorithm === "string" ? result.algorithm : result.algorithm?.source || "xai-org/x-algorithm"}`);
  lines.push(`Method: ${result.method || "content-engine"}`);
  lines.push("");

  result.posts.forEach((c, i) => {
    lines.push(`--- POST ${i + 1} [${c.grade}] Real Score: ${c.realScore} ---`);
    lines.push(`Archetype: ${c.archetype}`);
    if (c.archetypeWhy) lines.push(`Why: ${c.archetypeWhy}`);
    lines.push(`Engagement tier: ${c.engagementTier}`);
    lines.push(`Predicted dwell: ${c.predictedDwellSeconds}s | Thread recommended: ${c.threadRecommended ? "yes" : "no"}`);
    lines.push(`Top signals: ${c.topSignals.join(", ")}`);
    if (c.qualityScore) lines.push(`Quality score: ${c.qualityScore}/100`);
    lines.push("");
    lines.push(c.post);
    lines.push("");
    if (c.suggestedTweaks?.length) {
      lines.push(`Suggested tweaks: ${c.suggestedTweaks.join(" | ")}`);
    }
    lines.push("");
  });

  return lines.join("\n");
}

module.exports = {
  sprint,
  sprintPrint,
  ARCHETYPES,
};
