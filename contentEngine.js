/*
 * Content engine — generates specific, concrete, opinionated posts.
 *
 * This is the "senior copywriter" engine. It combines:
 *   - angleFinder.js → finds the best angle for the topic
 *   - qualityChecker.js → catches and fixes generic slop
 *   - voiceProfile.js → matches the author's writing style
 *
 * The key difference from the old sprinter: this engine has ACTUAL INSIGHTS
 * about the topic. It doesn't apply templates — it takes a real, specific,
 * contrarian insight and crafts a post around it.
 *
 * Senior copywriter level means:
 *   - Every post has a specific point of view (not wishy-washy)
 *   - Every post contains concrete details (numbers, tools, timeframes)
 *   - Every hook creates tension (the reader's brain goes "wait, what?")
 *   - No generic filler ("fundamentals matter", "consistency is key")
 *   - Every word earns its place
 *
 * Zero dependencies. Pure JavaScript.
 */

"use strict";

const { findAngles, mapTopicToDomain, INSIGHT_DATABASE } = require("./angleFinder");
const { check, fixSlop } = require("./qualityChecker");
const { scorePost } = require("./engagementAlgo");
const { transformToVoice } = require("./copywriter");
const { parse: parseIdea, detectInputType } = require("./ideaParser");
const { iterate } = require("./iterationEngine");
const { assess } = require("./honestFeedback");
const { extractFacts, craftPost } = require("./factExtractor");
const { generateCasual } = require("./casualGenerator");
const { generateFounderStories, generateFounderStoryHooks } = require("./founderStoryGenerator");
const { generateStories } = require("./storyGenerator");
const { getInstance: getMLInstance } = require("./slotGenerator");

// ---------------------------------------------------------------------------
// Post builders — each takes an insight + topic and crafts a full post
// ---------------------------------------------------------------------------

/**
 * Build a post from an insight.
 * The insight IS the post — we just format it for maximum engagement.
 */
function buildPost(insight, topic, opts = {}) {
  const { voiceProfile, phraseBank } = opts;
  const text = insight.insight;

  // Generate MULTIPLE post formats and pick the best-scoring one.
  // Real viral posts on X use many different formats — not just one formula.
  // See: levelsio (cost-cutting with real numbers), Tibo (story thread hooks),
  // Todd Dailey (niche-specific product + price), Nero (resource lists), Eli (humor/novelty).
  const formats = [];

  // Format 1: The insight's natural format (story/data/contrarian/specific)
  if (insight.type === "story") {
    formats.push(buildStoryPost(text, topic));
  } else if (insight.type === "data") {
    formats.push(buildDataPost(text, topic));
  } else if (insight.type === "contrarian") {
    formats.push(buildContrarianPost(text, topic));
  } else if (insight.type === "casual") {
    // Casual tweets are already complete — don't add structure, CTAs, or share cues.
    // Just return the tweet as-is. The casual generator already wrote it.
    return text;
  } else {
    formats.push(buildSpecificPost(text, topic));
  }

  // Format 2: Thread hook — "Here's what happened 👇" style (like Tibo's post)
  formats.push(buildThreadHook(text, topic, insight.type));

  // Format 3: Pure value / resource list (like Nero's "Where I Find Design Inspiration")
  formats.push(buildValuePost(text, topic, insight.domain));

  // Format 4: Cost-cutting / results post (like levelsio's "$456,372/year in costs")
  formats.push(buildResultsPost(text, topic, insight.domain));

  // Format 5: Surprise/novelty post (like Eli's "Remember Niall from one direction?")
  formats.push(buildSurprisePost(text, topic, insight.domain));

  // Format 6: Casual one-liner — lowercase, no structure, like texting a friend
  // (like arra: "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time")
  formats.push(buildCasualOneLiner(text, topic, insight.domain, insight.type));

  // Format 7: Absurd/humor post — find the absurd angle, like Gambhir's jalebi comparison
  formats.push(buildHumorPost(text, topic, insight.domain, insight.type));

  // Format 8: Bold observation — no hook formula, just a strong statement
  // (like Lego Kingo: "insane detail here where Elon doesn't recognize the name of Figma...")
  formats.push(buildBoldObservation(text, topic, insight.domain, insight.type));

  // Format 9: Relatable frustration — like levelsio's "the most annoying part of running a business is collecting receipts"
  formats.push(buildRelatableFrustration(text, topic, insight.domain, insight.type));

  // Format 10: Dialogue/contrarian — like George Pu's "Founder: 'My company can be the next Uber.' Me: That era is over."
  formats.push(buildDialoguePost(text, topic, insight.domain, insight.type));

  // Format 11: Credibility + curiosity — like Dylan's "I'm 30. I built an AI startup to $4.3M ARR. Here's exactly what I'd do:"
  formats.push(buildCredibilityCuriosity(text, topic, insight.domain, insight.type));

  // If the post is a single short sentence, expand it with a follow-up
  // (but only for user ideas, not database insights)
  if (insight.reasoning?.includes("user's own")) {
    for (let i = 0; i < formats.length; i++) {
      if (formats[i].split(/\n/).filter(Boolean).length === 1) {
        formats[i] = expandShortIdea(formats[i], topic, insight.domain);
      }
    }
  }

  // Apply voice transformation if profile provided
  if (voiceProfile) {
    for (let i = 0; i < formats.length; i++) {
      formats[i] = transformToVoice(formats[i], voiceProfile, phraseBank);
    }
  }

  // Fix slop in all formats
  for (let i = 0; i < formats.length; i++) {
    formats[i] = fixSlop(formats[i]);
    const quality = check(formats[i]);
    if (quality.isSlop) {
      formats[i] = fixSlop(formats[i]);
      if (check(formats[i]).isSlop && insight.type !== "contrarian" && insight.type !== "specific") {
        formats[i] = addSpecificity(formats[i], topic, insight.type);
      }
    }
  }

  // Score ALL formats — some with CTA, some without, some with share cue, some without
  // Real viral posts often have NO CTA and NO share cue — the content speaks for itself.
  const allCandidates = [];
  for (const format of formats) {
    // Version with no CTA, no share cue (pure content — like levelsio, Todd Dailey)
    allCandidates.push(format);
    // Version with just a CTA (no share cue)
    allCandidates.push(addBestCTA(format, insight.type));
    // Version with just a share cue (no CTA)
    allCandidates.push(addBestShareCue(format));
    // Version with both CTA + share cue
    allCandidates.push(addBestReplyTriggerAndShareCue(format, insight.type));
  }

  // Score every candidate and pick the best
  // Use the COMPOSITE score (which includes authenticity penalty), NOT realScore
  // realScore is the raw signal model which rewards CTAs/share cues but ignores
  // whether the post sounds AI-generated. The composite score includes authenticity.
  let bestPost = allCandidates[0];
  let bestScore = scorePost(bestPost).score || 0;
  for (const candidate of allCandidates) {
    const score = scorePost(candidate).score || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidate;
    }
  }

  return bestPost;
}

// ---------------------------------------------------------------------------
// NEW VIRAL POST FORMATS — based on real X posts that go viral
// ---------------------------------------------------------------------------

// Thread hook — "Here's what happened 👇" style
// Like Tibo: "2 unemployed friends bootstrapped a SaaS & sold it for $10M+ in 18 months. This is my story 👇"
function buildThreadHook(text, topic, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // If the hook is already a complete story with numbers, add the thread marker
  if (/\b(\$|revenue|mrr|sold|raised|built|grew|gained|saved|cut|deleted|spent)\b/i.test(hook)) {
    return `${hook}\n\nHere's the full story 👇`;
  }

  // For contrarian takes, frame as "I used to think X. Here's what I learned 👇"
  if (insightType === "contrarian") {
    return `${hook}\n\nHere's why 👇`;
  }

  // Default: just add the thread marker
  return `${hook}\n\nHere's what I found 👇`;
}

// Pure value / resource list — like Nero's "Where I Find Design Inspiration"
function buildValuePost(text, topic, domain) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // If it's already a list-like post, format it as a value post
  if (/\b(\d|things|rules|lessons|ways|steps|resources|tools|find|where)\b/i.test(hook)) {
    return hook;
  }

  // DON'T force value-post format on casual jokes or opinions.
  // If the text is a casual observation (lowercase, humorous), leave it alone.
  if (sentences.length <= 2 && hook.length < 150 && /^(i |nobody |the thing |what'?s |every )/i.test(hook)) {
    return text;
  }

  // For domain-specific value posts, add a resource framing
  // But ONLY if the original text is actually about tools/resources
  const isAboutTools = /\b(tools?|resources?|apps?|software|extensions?|plugins?|templates?|checklist)\b/i.test(text);
  if (!isAboutTools) return text;

  const valueHooks = {
    saas: `The tools I use to run my SaaS solo:`,
    marketing: `The marketing tools that actually moved the needle:`,
    ai: `The AI tools I use every day (and what I stopped using):`,
    fitness: `What actually worked for me (after wasting 2 years on the wrong stuff):`,
    money: `How I manage my money (after tracking every dollar for 3 years):`,
    productivity: `My actual productivity system (not the generic advice):`,
    content: `The content tools that 10x'd my engagement:`,
    career: `The career moves that 3x'd my salary:`,
    coding: `The dev tools I can't live without:`,
    design: `Where I find design inspiration:`,
    general: `The tools and resources I actually use:`,
  };

  const valueHook = valueHooks[domain] || valueHooks.general;
  return `${valueHook}\n\n${hook}`;
}

// Results / cost-cutting post — like levelsio's "$456,372/year in costs"
function buildResultsPost(text, topic, domain) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // If the text has real numbers, lead with them
  const numMatch = text.match(/\$[\d,.]+|\b\d[\d,.]*\b/);
  if (numMatch && /\b(i |my |me |we )\b/i.test(text)) {
    // It's a personal story with numbers — format as a results post
    return `${hook}\n\nThe result: ${sentences.slice(1).join(" ")}`;
  }

  // For non-personal content, frame as "I tracked X for Y. Here's what I found."
  if (/\b(tracked|measured|analyzed|tested)\b/i.test(text)) {
    return text;
  }

  // Default: don't force it — return the original
  return text;
}

// Surprise / novelty post — like Eli's "Remember Niall from one direction? He's doing AI b2b SaaS now"
function buildSurprisePost(text, topic, domain) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // If the text has a surprise element (unexpected connection), lead with it
  if (/\b(remember|used to|turns out|nobody knows|little known|fun fact|did you know)\b/i.test(text)) {
    return text;
  }

  // For contrarian takes, add a surprise framing
  if (/\b(is |are |was |were )\b/i.test(hook) && sentences.length === 1) {
    // Don't force it — just return the original
    return text;
  }

  // Default: return original
  return text;
}

// ---------------------------------------------------------------------------
// HUMAN-VOICED FORMATS — based on real 10k+ viral tweets
// These sound like a person texting a friend, not a content machine.
// Key rules: lowercase, no CTA, no share cue, no forced structure.
// ---------------------------------------------------------------------------

// Casual one-liner — like arra's "i KNOW SaaS stands for software as a service but..."
// Lowercase, conversational, relatable, no structure, no CTA.
function buildCasualOneLiner(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only use this format for short, punchy insights (1-2 sentences)
  if (sentences.length > 2) return text;

  // Don't use for stories with real numbers — those need the full format
  if (/\b(i (spent|tried|built|shipped|launched|failed|quit|tracked|made|lost|gained))\b/i.test(text) && /\d/.test(text)) {
    return text;
  }

  // Convert to casual lowercase (but keep proper nouns and acronyms)
  const casual = toCasualLowercase(hook);

  // For contrarian takes, add a relatable frustration angle
  if (insightType === "contrarian") {
    // "X is overrated" → "i keep seeing people hype X and i just don't get it"
    const overratedMatch = hook.match(/^(.+?)\s+is\s+(overrated|underrated|bad|dead|a trap|a myth)/i);
    if (overratedMatch) {
      const subject = overratedMatch[1].trim();
      const adj = overratedMatch[2].toLowerCase();
      if (adj === "overrated") {
        return `i keep seeing people hype ${subject.toLowerCase()} and i just don't get it`;
      }
      if (adj === "underrated") {
        return `nobody talks about ${subject.toLowerCase()} and it's honestly the best one`;
      }
      if (adj === "dead") {
        return `people still pretending ${subject.toLowerCase()} isn't dead are coping`;
      }
    }

    // "AI is going to replace junior developers" → "every junior dev i talk to is scared about AI and they should be"
    const replaceMatch = hook.match(/^(.+?)\s+(is going to|will)\s+(replace|kill|destroy|end)\s+(.+)$/i);
    if (replaceMatch) {
      const subject = replaceMatch[1].trim().toLowerCase();
      const target = replaceMatch[4].trim().toLowerCase();
      return `every ${target} i talk to is scared about ${subject} and honestly they should be`;
    }
  }

  // For opinions, make it sound like a casual observation
  if (sentences.length === 1 && hook.length < 120) {
    // Already short and punchy — just lowercase it
    return casual;
  }

  return text;
}

// Absurd/humor post — find the absurd angle, like Gambhir's jalebi comparison
// This is the hardest format to generate, but it's the highest-engagement.
function buildHumorPost(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only attempt humor for contrarian/opinion posts (not stories with real data)
  if (insightType === "story" || insightType === "data") return text;
  if (sentences.length > 2) return text;

  // Domain-specific absurd comparisons
  const absurdAngles = {
    saas: [
      { trigger: /subscription|pricing|saas/i, line: "paying $50/month for a tool that does what a google sheet does" },
      { trigger: /feature|roadmap/i, line: "adding features nobody asked for while the core product is broken" },
    ],
    ai: [
      { trigger: /replace|replace jobs/i, line: "AI replacing jobs the same way calculators replaced mathematicians" },
      { trigger: /content|writing/i, line: "AI content that sounds exactly like AI content trying not to sound like AI content" },
      { trigger: /tool|tools/i, line: "another AI tool that's just chatgpt with a different landing page" },
    ],
    coding: [
      { trigger: /bug|debug/i, line: "spending 3 days debugging something that was a typo" },
      { trigger: /refactor|clean code/i, line: "rewriting code that worked fine because it 'looked ugly'" },
      { trigger: /typescript|types/i, line: "spending more time fighting the type system than writing actual code" },
    ],
    fitness: [
      { trigger: /advice|tips/i, line: "fitness advice from people who've been fit their whole life telling you to 'just be consistent'" },
      { trigger: /supplement|protein/i, line: "spending $200/month on supplements to avoid eating vegetables" },
    ],
    money: [
      { trigger: /invest|stock|crypto/i, line: "losing money on crypto to learn the same lesson your grandma could've told you" },
      { trigger: /save|saving/i, line: "saving $5 on coffee while paying $2000 in fees you didn't notice" },
    ],
    productivity: [
      { trigger: /productivity|system/i, line: "spending 4 hours setting up a productivity system to avoid 30 minutes of actual work" },
      { trigger: /notion|tools/i, line: "building a second brain in notion instead of just doing the thing" },
    ],
    career: [
      { trigger: /job|work|career/i, line: "working 60 hour weeks to get the same raise as the guy who leaves at 5" },
      { trigger: /resume|interview/i, line: "interviewing for a job you could already do by proving you can do interviews" },
    ],
    design: [
      { trigger: /design|ui|ux/i, line: "redesigning your landing page for the 15th time instead of talking to users" },
      { trigger: /trend|trends/i, line: "every saas landing page looking like every other saas landing page" },
    ],
    general: [],
  };

  const domainAngles = absurdAngles[domain] || absurdAngles.general;
  for (const angle of domainAngles) {
    if (angle.trigger.test(text)) {
      // Frame it as a relatable frustration — lowercase, casual
      return toCasualLowercase(angle.line);
    }
  }

  // Generic absurd angle: "X is like Y" where Y is unexpected
  // Only for contrarian takes
  if (insightType === "contrarian" && sentences.length === 1) {
    const isMatch = hook.match(/^(.+?)\s+is\s+(.+)$/i);
    if (isMatch) {
      const subject = isMatch[1].trim().toLowerCase();
      const claim = isMatch[2].trim().toLowerCase();
      // "X is overrated" → "X is like that restaurant everyone says is great but the food is mid"
      if (/overrated/.test(claim)) {
        return `${subject} is like that restaurant everyone says is great but the food is mid`;
      }
      // "X is a trap" → "X is like a credit card with a great sign-up bonus and a 30% interest rate"
      if (/trap/.test(claim)) {
        return `${subject} is like a credit card with a great sign-up bonus and a 30% interest rate`;
      }
    }
  }

  return text;
}

// Bold observation — like Lego Kingo's Elon/Figma tweet
// No hook formula, just a strong statement with specificity.
function buildBoldObservation(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only for short, punchy insights
  if (sentences.length > 2) return text;

  // Don't use for stories — they need the full format
  if (insightType === "story") return text;

  // If the insight is already a bold observation, just clean it up
  // and make it sound more conversational
  if (insightType === "contrarian" || insightType === "specific") {
    // "X is overrated" → "the thing nobody wants to admit about X is that it's overrated"
    // FIX: properly reconstruct the sentence, don't just splice
    const isMatch = hook.match(/^(.+?)\s+(is|are|was|were)\s+(.+)$/i);
    if (isMatch && hook.length < 100) {
      const subject = isMatch[1].trim();
      const verb = isMatch[2].toLowerCase();
      const claim = isMatch[3].trim().toLowerCase();
      // Only do this for short, punchy claims
      if (claim.length < 40) {
        // Proper grammar: "the thing nobody wants to admit about Notion is that it's overrated"
        const pronoun = (verb === "is" || verb === "was") ? "it's" : "they're";
        return `the thing nobody wants to admit about ${subject} ${verb} that ${pronoun} ${claim}`;
      }
    }

    // "X is going to replace Y" → "every Y I talk to is scared about X and honestly they should be"
    const replaceMatch = hook.match(/^(.+?)\s+(is going to|will)\s+(replace|kill|destroy|end)\s+(.+)$/i);
    if (replaceMatch) {
      const subject = replaceMatch[1].trim().toLowerCase();
      const target = replaceMatch[4].trim().toLowerCase();
      return `every ${target} i talk to is scared about ${subject} and honestly they should be`;
    }

    // "the problem with most startups is they dont talk to users enough"
    // → just return it as-is, it's already a bold observation
    if (/the problem with/i.test(hook) && hook.length < 120) {
      return hook;
    }
  }

  return text;
}

// ---------------------------------------------------------------------------
// SAAS COMMUNITY VIRAL FORMATS — based on real popular SaaS tweets
// ---------------------------------------------------------------------------

// Relatable frustration — like levelsio's "the most annoying part of running a business is collecting receipts"
// This is JUST the frustration, no CTA, no share cue. People reply because they relate.
function buildRelatableFrustration(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only for short insights (1-2 sentences)
  if (sentences.length > 2) return text;

  // Don't use for stories with real numbers
  if (insightType === "story" && /\d/.test(text)) return text;

  // Domain-specific relatable frustrations
  const frustrations = {
    saas: [
      "the most annoying part of running a SaaS isn't the code, it's chasing overdue invoices",
      "nothing kills your momentum faster than a churned customer you thought was happy",
      "the worst part of SaaS isn't building it, it's explaining what you do to your parents",
    ],
    coding: [
      "the most annoying part of coding isn't the bugs, it's the dependency updates that break everything",
      "nothing kills your momentum faster than a merge conflict on Friday afternoon",
      "the worst part of dev work isn't the debugging, it's the standup meetings about the debugging",
    ],
    ai: [
      "the most annoying part of building AI tools isn't the model, it's the prompt engineering that breaks every update",
      "nothing kills your momentum faster than an API change that silently breaks your whole pipeline",
    ],
    marketing: [
      "the most annoying part of marketing isn't the content, it's proving to your boss that it worked",
      "nothing kills your momentum faster than a client who wants to 'go viral' but won't share anything",
    ],
    general: [],
  };

  const domainFrustrations = frustrations[domain] || frustrations.general;

  // If the input is already a frustration, just clean it up
  if (/\b(annoying|worst part|hate|frustrating|kills me|biggest pain)\b/i.test(text)) {
    return text;
  }

  // For contrarian takes about a domain, use a relatable frustration
  if (insightType === "contrarian" && domainFrustrations.length > 0) {
    // Pick the first one (deterministic, no random)
    return domainFrustrations[0];
  }

  return text;
}

// Dialogue/contrarian — like George Pu's "Founder: 'My company can be the next Uber.' Me: That era is over."
// Uses a dialogue format to make contrarian takes more engaging.
function buildDialoguePost(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only for contrarian/opinion posts
  if (insightType !== "contrarian") return text;
  if (sentences.length > 2) return text;

  // "X is overrated" → "Me: X is overrated. Everyone else: but what about..."
  // "AI is going to replace junior developers" → "Founder: 'AI won't replace developers.' Me: Have you used AI lately?"
  // "Remote work is bad for your career" → "Remote worker: 'I'm so productive at home.' Me: Your career says otherwise."

  const isMatch = hook.match(/^(.+?)\s+(is|are|was|were)\s+(.+)$/i);
  if (isMatch) {
    const subject = isMatch[1].trim();
    const claim = isMatch[3].trim().toLowerCase();

    // Build a dialogue where someone says the popular opinion, then we counter
    if (/overrated/.test(claim)) {
      return `Everyone: "${subject} changed my life"\n\nMe: ${subject.toLowerCase()} is overrated and I'll die on that hill`;
    }
    if (/bad/.test(claim)) {
      return `People who love ${subject.toLowerCase()}: "it's the best thing ever"\n\nMe: it's ${claim}. change my mind`;
    }
    if (/dead/.test(claim)) {
      return `"${subject} is the future"\n\nNo it's not. ${subject.toLowerCase()} is dead. Here's why:`;
    }
  }

  // "AI is going to replace junior developers" → dialogue
  const replaceMatch = hook.match(/^(.+?)\s+(is going to|will)\s+(replace|kill|destroy|end)\s+(.+)$/i);
  if (replaceMatch) {
    const subject = replaceMatch[1].trim();
    const target = replaceMatch[4].trim();
    return `"${subject} won't ${replaceMatch[3].toLowerCase()} ${target.toLowerCase()}"\n\nMe: have you actually used ${subject.toLowerCase()} lately?`;
  }

  // "the problem with most startups is they dont talk to users enough"
  if (/problem with|don'?t talk to users/i.test(text)) {
    return `Founders: "we need to build more features"\n\nThe actual problem: you don't talk to users enough`;
  }

  return text;
}

// Credibility + curiosity — like Dylan's "I'm 30. I built an AI startup to $4.3M ARR. Here's exactly what I'd do:"
// Lead with credibility (numbers, achievements), then create a curiosity gap.
function buildCredibilityCuriosity(text, topic, domain, insightType) {
  const sentences = splitSentences(text);
  const hook = sentences[0].trim();

  // Only for stories with real numbers
  if (insightType !== "story") return text;
  if (!/\d/.test(text)) return text;

  // If the text already has credibility markers ($X MRR, X months, etc.), format it
  const hasMRR = /\b\$\d[\dkm]*\s*(mrr|arr|revenue)/i.test(text);
  const hasTimeframe = /\b\d+\s+(months?|years?|days?|weeks?)\b/i.test(text);
  const hasResult = /\b(went up|grew|gained|saved|cut|deleted|increased|doubled|tripled)\b/i.test(text);

  if (hasMRR || (hasTimeframe && hasResult)) {
    // Format: "I [did X]. [Result with numbers]. Here's exactly what I'd do:"
    // Keep the original text as the credibility line, add curiosity gap
    const cleaned = text.replace(/\.$/, "").trim();
    return `${cleaned}\n\nHere's exactly what I'd do 👇`;
  }

  // For AutoEditor-style stories: "AutoEditor saves me 4 hours per video. Watchtime went up 2x."
  if (/\b(saves?|saved|hours?|minutes?)\b/i.test(text) && /\b(watchtime|watch time|views?|engagement)\b/i.test(text)) {
    const cleaned = text.replace(/\.$/, "").trim();
    return `${cleaned}\n\nHere's the workflow 👇`;
  }

  return text;
}
function toCasualLowercase(text) {
  // Don't lowercase: acronyms (2+ uppercase letters), proper nouns after common prepositions
  // Simple approach: lowercase everything, then restore known acronyms and capitalized words
  // that are likely proper nouns (followed by lowercase or at sentence start after a known brand)

  const knownAcronyms = ["AI", "SaaS", "API", "UI", "UX", "CSS", "HTML", "JS", "TS", "SQL", "MRR", "CTA", "SEO"];
  const knownBrands = ["Notion", "Figma", "Stripe", "Vercel", "Linear", "AutoEditor", "React", "Next.js", "TypeScript", "JavaScript", "Python", "GitHub", "Twitter", "YouTube", "Reddit"];

  let result = text.charAt(0).toLowerCase() + text.slice(1);

  // Restore acronyms
  for (const acr of knownAcronyms) {
    result = result.replace(new RegExp(`\\b${acr.toLowerCase()}\\b`, "g"), acr);
  }

  // Restore brands
  for (const brand of knownBrands) {
    result = result.replace(new RegExp(`\\b${brand.toLowerCase()}\\b`, "g"), brand);
  }

  // Remove trailing period for casual feel (only if it's a single sentence)
  if (!result.includes("\n") && result.endsWith(".")) {
    result = result.slice(0, -1);
  }

  return result;
}

// Add ONLY a CTA (no share cue) — try all CTAs, pick best
function addBestCTA(post, insightType) {
  const allCTAs = getAllCTAs(post, insightType);
  let bestPost = post;
  let bestScore = scorePost(post).score || 0;

  for (const cta of allCTAs) {
    if (!cta) continue;
    const lines = post.split("\n").filter(Boolean);
    lines.push(cta);
    const candidate = lines.join("\n");
    const score = scorePost(candidate).score || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidate;
    }
  }

  return bestPost;
}

// Add ONLY a share cue (no CTA) — try all cues, pick best
function addBestShareCue(post) {
  const allShareCues = getAllShareCues(post);
  const needsShareCue = !/(save|send|share|bookmark|screenshot|pass this)/i.test(post);

  if (!needsShareCue) return post;

  let bestPost = post;
  let bestScore = scorePost(post).score || 0;

  for (const cue of allShareCues) {
    if (!cue) continue;
    const lines = post.split("\n").filter(Boolean);
    const lastIdx = lines.length - 1;
    if (/\?/.test(lines[lastIdx])) {
      lines.splice(lastIdx, 0, cue);
    } else {
      lines.push(cue);
    }
    const candidate = lines.join("\n");
    const score = scorePost(candidate).score || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidate;
    }
  }

  return bestPost;
}

/**
 * Try ALL CTA + share cue combinations and pick the best-scoring one.
 * This replaces random selection with deterministic optimization.
 */
function addBestReplyTriggerAndShareCue(post, insightType) {
  const allCTAs = getAllCTAs(post, insightType);
  const allShareCues = getAllShareCues(post);
  const needsShareCue = /\b(\d|things|rules|lessons|ways|steps)\b/i.test(post) && !/(save|send|share|bookmark)/i.test(post);

  let bestPost = post;
  let bestScore = scorePost(post).score || 0;

  // Try every CTA × every share cue combination
  for (const cta of allCTAs) {
    for (const cue of needsShareCue ? allShareCues : [null]) {
      let candidate = post;
      // Add share cue before CTA
      if (cue) {
        const lines = candidate.split("\n").filter(Boolean);
        const lastIdx = lines.length - 1;
        if (/\?/.test(lines[lastIdx])) {
          lines.splice(lastIdx, 0, cue);
        } else {
          lines.push(cue);
        }
        candidate = lines.join("\n");
      }
      // Add CTA
      if (cta) {
        const lines = candidate.split("\n").filter(Boolean);
        lines.push(cta);
        candidate = lines.join("\n");
      }
      // Score this combination
      const score = scorePost(candidate);
      const realScore = score.score || 0;
      if (realScore > bestScore) {
        bestScore = realScore;
        bestPost = candidate;
      }
    }
  }

  return bestPost;
}

function getAllCTAs(post, insightType) {
  const text = post.toLowerCase();
  const wordCount = post.split(/\s+/).length;

  const isProductClaim = /\b(changing|revolutionizing|disrupting|killing|replacing|better than|the future of|the best|game.?changer)\b/i.test(post) && !/\b(i |my |me )\b/i.test(post.split("\n")[0]);
  const isOpinion = /\b(is bad|is good|is overrated|is underrated|is wrong|is right|is a myth|is a lie|is a trap|is dead|is killing)\b/i.test(post);
  const isActionable = /\b(try|do|stop|start|fix|cut|delete|remove|replace|build|ship|launch|track|measure)\b/i.test(post);
  const isPersonalStory = /\b(i (spent|tried|tested|built|shipped|launched|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained))\b/i.test(post);

  const ctas = [];

  if (isProductClaim) {
    ctas.push("this is the hill I'll die on.", "nobody can convince me otherwise.", "fight me on this.", "prove me wrong.", "screenshot this in 6 months.");
  } else if (isOpinion && !isActionable) {
    ctas.push("where am I wrong?", "what's the part you disagree with?", "change my mind.", "this is the hill I'll die on.", "nobody can convince me otherwise.");
  } else if (isActionable) {
    ctas.push("try this for a week and report back.", "screenshot this in 30 days and tell me I was right.", "I dare you to try this.", "what's your version of this?", "what would you add to this?");
  } else if (isPersonalStory) {
    ctas.push("what's your version of this?", "has this happened to you?", "what would you have done differently?", "does this match your experience?");
  } else {
    ctas.push("what's the part you disagree with?", "where am I wrong?", "what would you add to this?", "does this match your experience?", "what's your version of this?");
  }

  // Sometimes NO CTA — short punchy posts are quotable as-is
  if (wordCount < 40 && (insightType === "contrarian" || isProductClaim || isOpinion)) {
    ctas.push(null);
  }

  // If the post already has a question or reply invitation, don't add CTA
  if (/\?/.test(post) || /\b(reply|comment|dm me|tell me|share your|what's your|your take|your experience)\b/i.test(post)) {
    return [null];
  }

  return ctas;
}

function getAllShareCues(post) {
  return [
    "save this.",
    "send this to someone who needs it.",
    "bookmark this.",
    "screenshot this for later.",
    "pass this to someone building something.",
    "if this was useful, send it to one person.",
    null, // no share cue
  ];
}

// ---------------------------------------------------------------------------
// Format-specific builders
// ---------------------------------------------------------------------------

function buildStoryPost(text, topic) {
  // Story posts: hook → setup → pivot → result → lesson
  // The insight is usually already a story ("I spent X... then Y...")
  // Don't add filler — the story IS the post.

  // If the story already has line breaks (like founder stories from the generator),
  // it's already formatted — return it as-is.
  if (text.includes("\n")) {
    return text;
  }

  // Split the insight into natural beats
  const sentences = splitSentences(text);

  if (sentences.length >= 2) {
    // First sentence = hook, rest = body
    const hook = sentences[0].trim();
    const body = sentences.slice(1).join("\n\n");
    return `${hook}\n\n${body}`;
  }

  // Single sentence story — it's already complete. Don't add filler.
  return text;
}

function buildDataPost(text, topic) {
  // Data posts: specific claim → the data → what it means
  // Don't add generic interpretation — the data IS the point.
  const sentences = splitSentences(text);

  if (sentences.length >= 2) {
    return sentences.join("\n\n");
  }

  // Single sentence with data — it's already complete. Don't add filler.
  return text;
}

function buildContrarianPost(text, topic) {
  // Contrarian posts: the claim → why it's true → what to do instead
  // But DON'T add generic filler — if the insight is already a complete thought,
  // just format it well.
  const sentences = splitSentences(text);

  if (sentences.length >= 2) {
    const hook = sentences[0].trim();
    const body = sentences.slice(1).join("\n\n");
    return `${hook}\n\n${body}`;
  }

  // Single sentence contrarian — it's already punchy. Don't add filler.
  // Just return it as-is. The reply trigger + share cue get added later.
  return text;
}

function buildSpecificPost(text, topic) {
  // Specific posts: just format the insight well
  const sentences = splitSentences(text);

  if (sentences.length >= 2) {
    return sentences.join("\n\n");
  }

  return text;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function splitSentences(text) {
  // Split on sentence boundaries but keep the punctuation.
  // Don't split on decimal numbers like "$4.3M" or "67.5%".
  // Use a negative lookbehind for digits before the period.
  return text.match(/(?:\d+\.\d+|[^.!?])+[.!?]*/g)?.map(s => s.trim()).filter(Boolean) || [text];
}

function addReplyTrigger(post, insightType) {
  // A senior copywriter doesn't end every post with "agree or disagree?"
  // They vary the CTA based on the post's content and tone.
  // Sometimes it's a question, sometimes a challenge, sometimes a bold claim,
  // sometimes nothing — the post speaks for itself.

  const lines = post.split("\n").filter(Boolean);
  const lastLine = lines[lines.length - 1]?.toLowerCase() || "";
  const postText = post.toLowerCase();

  // 1. If the post already has a question, don't add another
  if (/\?/.test(post)) return post;

  // 2. If the post already has a reply invitation, don't add another
  if (/\b(reply|comment|dm me|tell me|share your|what's your|your take|your experience)\b/i.test(post)) return post;

  // 3. Build a content-specific CTA based on what the post is about
  const cta = pickContextualCTA(post, insightType);
  if (!cta) return post; // sometimes no CTA is the right choice

  lines.push(cta);
  return lines.join("\n");
}

function pickContextualCTA(post, insightType) {
  const text = post.toLowerCase();
  const lines = post.split("\n").filter(Boolean);
  const wordCount = post.split(/\s+/).length;

  // Detect what kind of post this is — the CTA must match the content
  const isProductClaim = /\b(changing|revolutionizing|disrupting|killing|replacing|better than|the future of|the best|game.?changer)\b/i.test(post) && !/\b(i |my |me )\b/i.test(post.split("\n")[0]);
  const isOpinion = /\b(is bad|is good|is overrated|is underrated|is wrong|is right|is a myth|is a lie|is a trap|is dead|is killing)\b/i.test(post);
  const isActionable = /\b(try|do|stop|start|fix|cut|delete|remove|replace|build|ship|launch|track|measure)\b/i.test(post);
  const isPersonalStory = /\b(i (spent|tried|tested|built|shipped|launched|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained))\b/i.test(post);

  // Build the CTA pool based on post type
  const ctaPool = [];

  if (isProductClaim) {
    // Product claims work best with bold statements and challenges
    ctaPool.push(
      () => "this is the hill I'll die on.",
      () => "nobody can convince me otherwise.",
      () => "fight me on this.",
      () => "prove me wrong.",
      () => "screenshot this in 6 months.",
    );
  } else if (isOpinion && !isActionable) {
    // Pure opinions work best with "where am I wrong" style questions
    ctaPool.push(
      () => "where am I wrong?",
      () => "what's the part you disagree with?",
      () => "change my mind.",
      () => "this is the hill I'll die on.",
      () => "nobody can convince me otherwise.",
    );
  } else if (isActionable) {
    // Actionable posts work best with challenges
    ctaPool.push(
      () => "try this for a week and report back.",
      () => "screenshot this in 30 days and tell me I was right.",
      () => "I dare you to try this.",
      () => "what's your version of this?",
      () => "what would you add to this?",
    );
  } else if (isPersonalStory) {
    // Personal stories work best with "what's your version" questions
    ctaPool.push(
      () => "what's your version of this?",
      () => "has this happened to you?",
      () => "what would you have done differently?",
      () => "does this match your experience?",
    );
  } else {
    // Default: varied questions
    ctaPool.push(
      () => "what's the part you disagree with?",
      () => "where am I wrong?",
      () => "what would you add to this?",
      () => "does this match your experience?",
      () => "what's your version of this?",
    );
  }

  // Sometimes NO CTA — short punchy posts are quotable as-is
  if (wordCount < 40 && (insightType === "contrarian" || isProductClaim || isOpinion)) {
    ctaPool.push(() => null);
    ctaPool.push(() => null);
  }

  const pick = ctaPool[Math.floor(Math.random() * ctaPool.length)];
  return typeof pick === "function" ? pick() : null;
}

function addShareCue(post) {
  // Vary the share cue — don't always say "save this" or "bookmark this"
  const cues = [
    "save this.",
    "send this to someone who needs it.",
    "bookmark this.",
    "screenshot this for later.",
    "pass this to someone building something.",
    "if this was useful, send it to one person.",
  ];
  const cue = cues[Math.floor(Math.random() * cues.length)];

  const lines = post.split("\n").filter(Boolean);
  // Insert before the reply trigger (if last line is a question)
  const lastIdx = lines.length - 1;
  if (/\?/.test(lines[lastIdx]) || /\.$/.test(lines[lastIdx])) {
    lines.splice(lastIdx, 0, cue);
  } else {
    lines.push(cue);
  }
  return lines.join("\n");
}

function addSpecificity(post, topic, insightType) {
  // Only add specificity if the post is genuinely too vague.
  // The injected line MUST connect to the post's actual topic.
  // NEVER inject mid-post — it breaks the flow. Only append at the end.
  const quality = check(post);
  if (quality.specificityScore >= 15) return post; // already specific enough

  // Don't add specificity to contrarian or specific posts — they work by being
  // bold and complete. Adding a random "this cost me $X" line makes them feel
  // disjointed and AI-generated.
  if (insightType === "contrarian" || insightType === "specific") return post;

  // Only add to story/data posts that are genuinely too vague
  const lines = post.split("\n").filter(Boolean);
  if (lines.length <= 3 && quality.slopCount === 0) return post; // short and clean — leave it

  const specifics = {
    saas: ["this cost me $12k in lost MRR.", "my churn dropped 40% after I fixed this.", "I tracked this for 90 days."],
    marketing: ["I A/B tested this across 10k visitors.", "this doubled my CTR in 2 weeks.", "I spent $5k to learn this."],
    ai: ["this cut my workflow from 3 hours to 20 minutes.", "I tested this across 100 prompts.", "I use this every day. it saves me 2 hours."],
    fitness: ["I tracked this for 6 months.", "this added 8lbs of muscle in 12 weeks.", "my recovery time dropped 50%."],
    money: ["this saved me $400/month.", "this was a $50k mistake.", "I tracked every dollar for a year to learn this."],
    productivity: ["I tracked my time for 30 days to learn this.", "this saved me 3 hours a day.", "my output went up 2x when I fixed this."],
    content: ["I tested this across 200 posts.", "this thread got 10x the engagement.", "my follower growth went up 3x after this."],
    career: ["this was a $50k mistake.", "my salary went up 120% using this.", "I learned this the hard way."],
    coding: ["this saved me 2 weeks of debugging.", "this bug cost me 3 days.", "I refactored this and performance went up 5x."],
    design: ["this doubled my conversion rate.", "I A/B tested this across 5k visitors.", "this cut my bounce rate by 30%."],
    general: ["I learned this the hard way.", "this took me 3 years to figure out.", "I wish I'd known this 5 years ago."],
  };

  const { domain } = mapTopicToDomain(topic);
  const list = specifics[domain] || specifics.general;
  const specific = list[Math.floor(Math.random() * list.length)];

  // Append at the END, before the reply trigger if present
  const out = post.split("\n").filter(Boolean);
  const lastIdx = out.length - 1;
  if (/\?/.test(out[lastIdx])) {
    out.splice(lastIdx, 0, specific);
  } else {
    out.push(specific);
  }
  return out.join("\n");
}

// ---------------------------------------------------------------------------
// Problem-list post generator — takes a list of pain points and generates
// tweets that reference specific problems, with [screen recording] placeholders
// where a demo would go. Each tweet is distinct and grounded in the actual list.
// ---------------------------------------------------------------------------

function generateProblemListPosts(parsed, count = 5) {
  const problems = parsed.problems || [];
  if (problems.length === 0) return [];

  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const pickN = (arr, n) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  };
  const pool = [];

  // Shorten a problem line to a punchy phrase
  const punchy = (p) => {
    let s = p.replace(/^(spending|having|needing|wanting|paying|delaying|turning|manually|not knowing)\s+/i, (m) => m.toLowerCase());
    // Capitalize first letter
    s = s.charAt(0).toUpperCase() + s.slice(1);
    // Remove trailing period
    s = s.replace(/\.$/, "");
    return s;
  };

  // --- Screen recording placeholders only go on SOME posts ---
  // Not every tweet needs a screen recording. Only posts that show a
  // visual transformation (before/after, demo, workflow) get one.
  // Contrarian takes, relatable frustrations, and debate posts don't need them.
  const screenRecordingClosers = [
    "[screen recording: before → after]\n\nthat's the whole pitch.",
    "[screen recording: raw footage → clean cut]\n\nno manual trimming.",
    "[screen recording: 2-hour timeline → 15-minute edit]\n\nthe gap is insane.",
    "[screen recording here]\n\nwatch the whole thing get cut automatically.",
    "[screen recording: dropping in raw footage, hitting one button]\n\nthat's it.",
    "[screen recording: the dead air getting removed in real time]\n\nno scrubbing. no manual cuts.",
    "[screen recording: 3 hours of footage → ready-to-post edit]\n\nthis used to take all day.",
    "[screen recording here — watch the first pass happen in seconds]\n\nthis is the part that blows people's minds.",
    "[screen recording: before = 4 hours of manual work. after = one click.]\n\nthe time savings compound.",
    "[screen recording: raw podcast → 5 short-form clips, automatically]\n\none recording, five posts.",
  ];
  // Closers WITHOUT screen recordings — for posts that don't need a visual demo
  const noDemoClosers = [
    "which one are you guilty of?",
    "if you edit videos, you know exactly how painful this is.",
    "there's a better way.",
    "you don't have to do this anymore.",
    "stop doing this manually.",
    "change my mind.",
    "agree or disagree?",
    "who else deals with this?",
    "the tools exist. you're just not using them.",
    "your competition isn't better than you. they're just faster.",
  ];

  // --- TYPE 1: "Here's what X fixes" list posts (high share_via_copy_link) ---
  // Only SOME list posts get screen recordings — the rest end with a question or callout
  const listHooks = [
    "editors waste hours on this.",
    "nobody talks about this part of editing.",
    "the boring part of editing nobody shows you.",
    "this is why your edits take forever.",
    "the part of editing that nobody enjoys.",
    "everyone complains about this. nobody fixes it.",
    "the unsexy side of content creation.",
    "this is what kills your editing speed.",
    "the real bottleneck in your workflow.",
    "what's actually slowing you down.",
  ];

  for (let i = 0; i < 15; i++) {
    const hook = pick(listHooks);
    const selected = pickN(problems, Math.min(3 + (i % 2), problems.length));
    const items = selected.map((p, idx) => `${idx + 1}. ${punchy(p)}`);
    // Only ~40% of list posts get a screen recording
    const useDemo = Math.random() < 0.4;
    const closer = useDemo ? pick(screenRecordingClosers) : pick(noDemoClosers);
    pool.push({
      text: `${hook}\n\n${items.join("\n")}\n\n${closer}`,
      type: "proof_receipts",
      hasDemo: useDemo,
      reasoning: useDemo
        ? "list of real problems + screen recording placeholder → high share_via_copy_link"
        : "list of real problems + reply trigger → high reply + share_via_copy_link",
    });
  }

  // --- TYPE 2: Single-problem spotlight posts (high reply/quote) ---
  // These are relatable frustration posts — NO screen recording needed
  const spotlightHooks = [
    (p) => `${punchy(p)}.\n\nif you edit videos, you know exactly how painful this is.`,
    (p) => `${punchy(p)}.\n\nevery editor deals with this. nobody talks about it.`,
    (p) => `${punchy(p)}.\n\nthis is the part of editing that makes you want to quit.`,
    (p) => `${punchy(p)}.\n\nthe most soul-crushing part of the workflow.`,
    (p) => `${punchy(p)}.\n\nand it's the reason your edits take 3x longer than they should.`,
    (p) => `${punchy(p)}.\n\nyou're not slow. your workflow is.`,
    (p) => `${punchy(p)}.\n\nthis is what separates people who ship from people who don't.`,
    (p) => `${punchy(p)}.\n\nthe difference between posting weekly and posting monthly.`,
    (p) => `${punchy(p)}.\n\nnobody became a great editor by doing this manually.`,
    (p) => `${punchy(p)}.\n\nthis is where your creative energy goes to die.`,
    (p) => `${punchy(p)}.\n\nimagine spending 4 hours on something that takes 4 seconds.`,
    (p) => `${punchy(p)}.\n\nthis is the bottleneck. not your skills. not your ideas. this.`,
    (p) => `${punchy(p)}.\n\nevery minute you spend on this is a minute you're not creating.`,
    (p) => `${punchy(p)}.\n\nthe worst part? you don't even have to do it.`,
    (p) => `${punchy(p)}.\n\nyou just accept it as "part of the process." it doesn't have to be.`,
  ];
  const spotlightClosers = [
    "there's a better way.",
    "you don't have to do this anymore.",
    "stop doing this manually.",
    "who else deals with this?",
    "change my mind.",
    "agree or disagree?",
    "the tools exist. you're just not using them.",
    "your competition isn't better than you. they're just faster.",
  ];

  for (const problem of problems.slice(0, 10)) {
    const hook = pick(spotlightHooks)(problem);
    const closer = pick(spotlightClosers);
    pool.push({
      text: `${hook}\n\n${closer}`,
      type: "relatable_frustration",
      hasDemo: false,
      reasoning: "single problem spotlight + reply trigger → high reply + share_via_dm",
    });
  }

  // --- TYPE 3: "Before/after" transformation posts (high follow_author) ---
  // These ALWAYS get screen recordings — they're visual by nature
  const beforeAfterHooks = [
    "before: 4 hours of manual editing.\nafter: 15 minutes.",
    "before: scrubbing through raw footage for hours.\nafter: one click.",
    "before: dead air, filler, false starts everywhere.\nafter: clean, tight edit.",
    "before: dreading the edit.\nafter: actually enjoying it.",
    "before: one recording, one video.\nafter: one recording, five clips.",
    "before: captions as a separate step.\nafter: captions built in.",
    "before: paying someone for basic cleanup.\nafter: doing it yourself in seconds.",
    "before: recorded but never edited folder growing.\nafter: posted the same day.",
  ];
  const beforeAfterBodies = [
    "the workflow changed. the results didn't suffer. they got better.",
    "same footage. same quality. 1/10th the time.",
    "the boring part is gone. the creative part is all that's left.",
    "you still have final say. you just skip the mechanical part.",
    "this is what editing looks like when the busywork disappears.",
    "the gap between filming and posting just collapsed.",
    "your creative energy goes where it should: story, visuals, brand.",
    "this isn't AI replacing you. it's AI doing the part you hate.",
  ];
  const beforeAfterDemoClosers = [
    "[screen recording here]",
    "[screen recording: the full before → after]\n\nwatch this.",
    "[screen recording here — you'll want to see this]",
    "[screen recording: 4 hours → 15 minutes, same output]\n\nthe math speaks for itself.",
  ];

  for (let i = 0; i < 10; i++) {
    const hook = pick(beforeAfterHooks);
    const body = pick(beforeAfterBodies);
    const closer = pick(beforeAfterDemoClosers);
    pool.push({
      text: `${hook}\n\n${body}\n\n${closer}`,
      type: "proof_receipts",
      hasDemo: true,
      reasoning: "before/after transformation + screen recording → high follow_author + share_via_copy_link",
    });
  }

  // --- TYPE 4: Contrarian / hot take posts (high quote) ---
  // NO screen recording — these are opinion posts, not demos
  const contrarianHooks = [
    "manual editing isn't noble. it's just slow.",
    "the 'hard way' isn't dedication. it's stubbornness.",
    "if you're still doing first-pass cleanup manually, you're losing.",
    "spending hours on rough cuts doesn't make you a better editor.\nit makes you a slower one.",
    "the best editors don't do the boring parts. they skip them.",
    "nobody cares how long your edit took. they care if it's good.",
    "romanticizing manual editing is why you post once a month.",
    "the tools exist. you're just not using them.",
    "your competition isn't better than you. they're just faster.",
    "the editors who ship weekly aren't working harder. they're working smarter.",
  ];
  const contrarianClosers = [
    "change my mind.",
    "agree or disagree?",
    "who disagrees?",
    "the people who adopt early have a massive head start.",
    "refusing to use this isn't dedication. it's self-sabotage.",
  ];

  for (let i = 0; i < 10; i++) {
    const hook = pick(contrarianHooks);
    const closer = pick(contrarianClosers);
    pool.push({
      text: `${hook}\n\n${closer}`,
      type: "contrarian",
      hasDemo: false,
      reasoning: "contrarian take on manual editing → high quote (no demo needed)",
    });
  }

  // --- TYPE 5: "Send this to someone who..." posts (high share_via_dm) ---
  // NO screen recording — these are share bait, not demos
  const dmShareHooks = [
    "send this to someone who still edits manually.",
    "send this to the editor who's always behind on deadlines.",
    "send this to someone with a folder of 'recorded but never edited' footage.",
    "send this to the creator who posts once a month because editing takes too long.",
    "send this to someone paying an editor for basic cleanup.",
    "send this to the podcaster who doesn't have time to make clips.",
    "send this to someone who thinks AI editing means losing creative control.",
    "send this to the person who spends more time editing than creating.",
  ];
  const dmShareBodies = problems.slice(0, 4).map(p => `• ${punchy(p)}`);
  const dmShareClosers = [
    "this fixes all of it.",
    "there's a better way.",
    "they'll thank you later.",
    "tag them below.",
  ];

  for (let i = 0; i < 8; i++) {
    const hook = pick(dmShareHooks);
    const items = pickN(dmShareBodies, Math.min(3, dmShareBodies.length));
    const closer = pick(dmShareClosers);
    pool.push({
      text: `${hook}\n\n${items.join("\n")}\n\n${closer}`,
      type: "relatable_frustration",
      hasDemo: false,
      reasoning: "DM-share bait + problem list → high share_via_dm (no demo needed)",
    });
  }

  // --- Score and select the best ---
  const scored = pool.map(p => {
    const s = scorePost(p.text);
    const q = check(p.text);
    const realScore = s.signalModel?.realScore || 0;
    const composite = s.score + realScore * 5 + (q.score || 0) * 0.1;
    return { ...p, score: s.score, grade: s.grade, realScore, quality: q, composite, signals: s.signals };
  });

  scored.sort((a, b) => b.composite - a.composite);

  // Deduplicate and ensure type diversity — don't return 5 list posts when
  // we have spotlight, before/after, contrarian, and DM-share types available
  const seen = new Set();
  const unique = [];
  const typesUsed = new Set();
  // First pass: take the best of each type
  for (const p of scored) {
    const key = p.text.toLowerCase().slice(0, 80);
    if (!seen.has(key) && !typesUsed.has(p.type)) {
      seen.add(key);
      typesUsed.add(p.type);
      unique.push(p);
    }
  }
  // Second pass: fill remaining slots with best remaining posts of any type
  for (const p of scored) {
    if (unique.length >= count) break;
    const key = p.text.toLowerCase().slice(0, 80);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  }

  return unique.slice(0, count).map(p => ({
    text: p.text,
    type: p.type,
    reasoning: p.reasoning,
  }));
}

// ---------------------------------------------------------------------------
// Topic-based post generator — generates multiple distinct tweets directly
// from the user's topic/idea, without relying on a generic database.
// ---------------------------------------------------------------------------

function generateTopicPosts(parsed, count = 5) {
  const topic = parsed.insight || parsed.topic || parsed.originalInput;
  const lower = topic.toLowerCase();
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // --- Detect topic TYPE so we can use appropriate templates ---
  // Types: "milestone_building", "milestone_consuming", "milestone_habit", "milestone_career",
  //        "milestone_content", "milestone_general", "confession", "product", "opinion",
  //        "prediction", "statement"
  let topicType = "statement";

  // Personal milestone/announcement: "I just started X", "I launched X", "I hit $X", "I quit my job"
  if (/\b(i|i'm|i've|i just|i finally|i officially)\b/i.test(lower)
    && /\b(started|launched|hit|reached|quit|built|shipped|moved|got|made|crossed|hit|grew|scaled|opened|released|published|posted|created|finished|completed|began)\b/i.test(lower)) {

    // Sub-classify the milestone — WHAT did you start/do?
    // Content creation — check BEFORE building since "youtube channel" is content, not SaaS
    if (/\b(youtube|tiktok|instagram|channel|content|posting|streaming|twitter|x account|page|account|podcast|newsletter|blog|vlog|twitch)\b/i.test(lower)) {
      topicType = "milestone_content";
    }
    // Personal habit/lifestyle — check before local business so "going to the gym" is habit, not a gym business
    else if (/\b(gym|workout|running|meditating|journaling|diet|keto|vegan|walking|yoga|sleeping|waking up|reading habit|cold shower|fasting|sober|dry month|running streak)\b/i.test(lower)) {
      topicType = "milestone_habit";
    }
    // Local/physical business — restaurant, cafe, studio, etc. (no "gym" here — that's a habit above)
    else if (/\b(restaurant|cafe|coffee shop|bakery|food truck|bar|pub|diner|kitchen|catering|studio|clinic|salon|barber|spa|fitness studio|yoga studio|gallery|boutique|pop.up|food stall|bodega|pizzeria|taqueria|brewery|winery|distillery|roastery|ice cream|juice bar|smoothie|sandwich shop|deli|grocery|market\b)\b/i.test(lower)) {
      topicType = "milestone_localbusiness";
    }
    // Consuming/entertainment — watching, reading, listening
    else if (/\b(show|series|movie|anime|netflix|book|novel|audiobook|album|game|show yesterday|binge|watching|reading|listening|playing|season)\b/i.test(lower)) {
      topicType = "milestone_consuming";
    }
    // Building/creating a product or business (software/digital) — check BEFORE career
    // so "I quit my job to build my startup" is building, not career
    else if (/\b(saas|startup|business|company|app|product|tool|agency|side hustle|side project|course|book|store|shop|brand|freelance|label|collective|team|group|project|venture|platform|service|marketplace|ecommerce|dropshipping|etsy|amazon|fba|revenue|mrr|arr|customers?|users?|subscribers?|launch|funding|investors?|profitable|bootstrapped)\b/i.test(lower)) {
      topicType = "milestone_building";
    }
    // Career — check after building so "quit my job to build a startup" is building
    else if (/\b(job|work|position|role|career|promotion|new role|internship|offer|hired|fired|laid off|resigned|quit my job)\b/i.test(lower)) {
      topicType = "milestone_career";
    }
    else {
      topicType = "milestone_general";
    }
  }
  // Confession/vulnerability: "I failed at X", "I made $0", "I was wrong about X", "I wasted time on X"
  else if (/\b(i|i'm|i've)\b/i.test(lower)
    && /\b(failed|lost|wasted|was wrong|made \$?0|made zero|had \$?0|had zero|struggled|gave up|regret|mistake|embarrassing|hated|feared|scared|nervous|imposter|fraud|screwed up|messed up|blew it)\b/i.test(lower)) {
    topicType = "confession";
  }
  // Product/tool description: "X gives you Y", "X helps you Z", "a SaaS that does Y"
  else if (/\b(gives|helps|lets|makes|does|automates|creates|builds|generates|turns|transforms|a saas that|an app that|a tool that)\b/i.test(lower)) {
    topicType = "product";
  }
  // Opinion/comparison: "X is better than Y", "X is the greatest", "X is overrated", "X has the best Y"
  else if (/\b(is|are|was|were)\s+(better|worse|greater|the greatest|the best|the worst|overrated|underrated|the goat|the king|the most|destroying|killing|ruining|saving|changing|revolutionizing|dead|dying|the problem|the reason|the worst thing|the best thing)\b/i.test(lower)
    || /\b(has|have)\s+the\s+(best|worst|greatest)\b/i.test(lower)
    || /\b(overrated|underrated|destroying|killing|ruining|overhyped|game changer|waste of)\b/i.test(lower)) {
    topicType = "opinion";
  }
  // Prediction: "X will Y", "X is going to Y"
  else if (/\b(will|going to|gonna)\b/i.test(lower)) {
    topicType = "prediction";
  }
  // Statement with "is": "X is Y"
  else if (/\bis\b/i.test(lower) && lower.split(/\s+/).length >= 4) {
    topicType = "statement";
  }

  // --- Extract entity and action based on topic type ---
  let entity = topic;
  let action = topic;

  if (topicType === "product") {
    const entityMatch = topic.match(/^([a-z]+(?:\s+[a-z]+)?)\s+(?:gives|is|helps|lets|makes|does|automates|creates|builds|generates|turns|transforms)/i);
    if (entityMatch) entity = entityMatch[1].trim();
    // Handle "a SaaS that..." pattern
    const saasMatch = topic.match(/^(?:a|an)\s+(saas|app|tool|platform|service)\s+that\s+(.+)/i);
    if (saasMatch) {
      entity = saasMatch[1];
      action = saasMatch[2];
    }
    const actionMatch = topic.match(/(?:gives|helps|lets|makes|does|automates|creates|builds|generates|turns|transforms)\s+(?:you\s+)?(.+)/i);
    if (actionMatch) action = actionMatch[1].trim();
  } else if (topicType === "opinion") {
    // Extract the subject and object of comparison
    const opinionMatch = topic.match(/^(.+?)\s+(?:is|are|was|were)\s+(better than|worse than|greater than|the greatest|the best|the worst|overrated|underrated|the goat|the king|the most)\s*(.*)/i);
    if (opinionMatch) {
      entity = opinionMatch[1].trim();
      action = opinionMatch[2] + (opinionMatch[3] ? " " + opinionMatch[3] : "");
    }
  }

  let actionClean = action.replace(/^(the best|the fastest|the easiest|a better|the perfect|a good)\s+/i, "");

  // --- STAGE 1: Generate candidates using the compositional template bank ---
  // The template bank has 1,257,298 unique combinations across 10 context types.
  // Each call uses a random seed so the same topic never produces the same posts.
  const { generateCompositional } = require("./templateBank");
  const pool = generateCompositional(topic, topicType, count, Date.now() + Math.floor(Math.random() * 1000000));

  // --- STAGE 1b: Generate topic-aware candidates using the topic analyzer ---
  // The topic analyzer extracts the MEANING of the topic (audience, action,
  // benefit, outcome) and generates hooks/bodies/closers that are actually
  // about the topic — not generic templates.
  try {
    const { analyzeTopic, generateTopicHooks, generateOutcomeBodies, generateTopicClosers } = require("./topicAnalyzer");
    const analysis = analyzeTopic(topic);
    if (analysis) {
      const topicHooks = generateTopicHooks(analysis);
      const topicBodies = generateOutcomeBodies(analysis);
      const topicClosers = generateTopicClosers(analysis);
      // Combine hooks × bodies × closers into posts
      // Also include the original topic as a line in some posts (like the template bank does)
      for (let h = 0; h < Math.min(topicHooks.length, 10); h++) {
        const hook = topicHooks[h];
        for (let b = 0; b < Math.min(topicBodies.length, 5); b++) {
          const body = topicBodies[b];
          // Pick a closer (cycle through them)
          const closer = topicClosers[(h + b) % topicClosers.length] || "";
          // Format 1: hook + body + closer
          const text1 = closer ? `${hook}\n\n${body}\n\n${closer}` : `${hook}\n\n${body}`;
          pool.push({ text: text1, type: "topic_analyzer", reasoning: `topic-aware: ${analysis.type} for ${analysis.audience || "general audience"}` });
          // Format 2: topic line + hook + body (includes the topic verbatim like template bank)
          const text2 = closer ? `${topic}\n\n${hook}\n\n${body}\n\n${closer}` : `${topic}\n\n${hook}\n\n${body}`;
          pool.push({ text: text2, type: "topic_analyzer", reasoning: `topic-aware (with topic line): ${analysis.type} for ${analysis.audience || "general audience"}` });
        }
      }
    }
  } catch (e) {
    // Topic analyzer is optional — fall through to template bank only
  }

  // --- STAGE 2: Score every candidate ---
  // Topic analyzer posts get a bonus because they're more specific to the topic
  const scored = pool.map(p => {
    const s = scorePost(p.text);
    const q = check(p.text);
    const topicBonus = p.type === "topic_analyzer" ? 25 : 0; // boost topic-aware posts
    return {
      ...p,
      grade: s.grade,
      score: s.score,
      realScore: s.signalModel?.realScore || 0,
      qualityScore: q.score,
      isSlop: q.isSlop,
      issues: q.issues || [],
      composite: s.score + (s.signalModel?.realScore || 0) * 5 + q.score * 0.1 + topicBonus,
    };
  });

  // --- STAGE 3: Filter out low-quality posts ---
  // Note: we don't filter by isSlop here because the quality checker
  // penalizes opinion/statement posts for "lack of specificity" when they
  // don't have numbers — but opinion posts don't need numbers.
  // We only filter by engagement score.
  let filtered = scored.filter(p => p.score >= 65);
  if (filtered.length < count) {
    filtered = scored.filter(p => p.score >= 50);
  }
  if (filtered.length < count) {
    filtered = scored;
  }

  // --- STAGE 4: Sort by composite score ---
  filtered.sort((a, b) => b.composite - a.composite);

  // --- STAGE 5: Deduplicate by full content similarity (not just first line) ---
  const seen = new Set();
  const unique = [];
  for (const p of filtered) {
    const lines = p.text.split("\n").filter(l => l.trim());
    const key = (lines[0] + " " + (lines[1] || "")).toLowerCase().slice(0, 60);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
    if (unique.length >= count * 3) break;
  }

  // --- STAGE 6: Multi-round refinement ---
  // Context-aware closers for personal posts — no "prove me wrong" on a binge-watching post
  const isPersonal = topicType.startsWith("milestone") || topicType === "confession";
  const isEntertainment = topicType === "milestone_consuming";
  const isLocalBusiness = topicType === "milestone_localbusiness";

  const refined = unique.slice(0, count * 2).map(p => {
    const isTopicAnalyzer = p.type === "topic_analyzer";
    let current = { text: p.text, score: p.score, grade: p.grade, realScore: p.realScore };

    for (let round = 0; round < 3; round++) {
      const variations = [current.text];
      const hasCloser = /(screenshot|change my mind|agree|disagree|what|who|where|fight me|hill|prove me|nobody can convince|thoughts|said what I said|mark my words|on the record|here we go|let's build|hold each other|send help|wish me luck|pray for|regret nothing|day 1|let's go|onward|your turn|watch me|follow along|stay tuned|see you|trust me|bookmark|remember where)/i.test(current.text);

      if (!isPersonal && !/\?/.test(current.text) && !hasCloser) {
        const triggers = ["agree or disagree?", "what's your take?", "change my mind.", "who's with me?", "where am I wrong?", "thoughts?"];
        variations.push(current.text + "\n\n" + pick(triggers));
      }

      if (!isPersonal && !hasCloser) {
        const closers = ["screenshot this in 6 months.", "this is the hill I'll die on.", "prove me wrong.", "fight me on this.", "nobody can convince me otherwise."];
        variations.push(current.text + "\n\n" + pick(closers));
      }

      // For personal posts, add context-appropriate soft closers
      if (isPersonal && !hasCloser && !/\?/.test(current.text)) {
        let personalClosers;
        if (topicType === "confession") {
          personalClosers = ["if this helps one person, worth it.", "the process is the point.", "on to the next one.", "lesson learned."];
        } else if (isEntertainment) {
          personalClosers = ["send help.", "and snacks.", "I'll surface in a few days.", "don't wait up.", "pray for my sleep schedule.", "I regret nothing."];
        } else if (isLocalBusiness) {
          personalClosers = ["come say hi.", "first one's on me.", "we're open.", "come hungry.", "see you soon.", "stop by."];
        } else if (topicType === "milestone_habit") {
          personalClosers = ["day 1 of many.", "the streak starts now.", "1% better.", "consistency is the only secret."];
        } else if (topicType === "milestone_career") {
          personalClosers = ["let's get to work.", "the real work starts now.", "onward.", "grateful. hungry. ready."];
        } else if (topicType === "milestone_content") {
          personalClosers = ["post #1 of many.", "follow along.", "watch me figure this out.", "the journey starts now."];
        } else {
          // milestone_building or milestone_general
          personalClosers = ["wish me luck.", "here we go.", "let's see what happens.", "day 1 of many.", "let's build."];
        }
        variations.push(current.text + "\n\n" + pick(personalClosers));
      }

      // Restructure hook — but NOT for personal posts (reordering reads wrong)
      const lines = current.text.split("\n").filter(l => l.trim());
      if (!isPersonal && lines.length > 2) {
        const specificIdx = lines.findIndex(l => /\d|best|worst|nobody|insane|replace|hot take|unpopular|greatest|better|overrated/.test(l));
        if (specificIdx > 0) {
          const reordered = [lines[specificIdx], ...lines.filter((_, i) => i !== specificIdx)];
          variations.push(reordered.join("\n\n"));
        }
      }

      // Tighten — remove last line if post is too long
      if (lines.length > 5) {
        const tightened = lines.slice(0, -1);
        variations.push(tightened.join("\n\n"));
      }

      let bestThisRound = current;
      for (const v of variations) {
        const s = scorePost(v);
        const q = check(v);
        // Keep the topic analyzer bonus during refinement so topic-aware posts stay competitive
        const taBonus = isTopicAnalyzer ? 25 : 0;
        const composite = s.score + (s.signalModel?.realScore || 0) * 5 + q.score * 0.1 + taBonus;
        const bestComposite = bestThisRound.score + (bestThisRound.realScore || 0) * 5 + taBonus;
        if (composite > bestComposite && !q.isSlop) {
          bestThisRound = { text: v, score: s.score, grade: s.grade, realScore: s.signalModel?.realScore || 0 };
        }
      }

      if (bestThisRound.text === current.text) break;
      current = bestThisRound;
    }

    return {
      text: current.text,
      type: p.type,
      grade: current.grade,
      score: current.score,
      realScore: current.realScore,
      isTopicAnalyzer,
      reasoning: `${p.type} — refined to ${current.grade} over multiple rounds`,
    };
  });

  // Final sort — include topic analyzer bonus so topic-aware posts rank higher
  refined.sort((a, b) => {
    const aBonus = a.isTopicAnalyzer ? 25 : 0;
    const bBonus = b.isTopicAnalyzer ? 25 : 0;
    return (b.score + b.realScore * 5 + bBonus) - (a.score + a.realScore * 5 + aBonus);
  });

  const finalSeen = new Set();
  const finalPosts = [];
  for (const p of refined) {
    const lines = p.text.split("\n").filter(l => l.trim());
    const key = (lines[0] + " " + (lines[1] || "")).toLowerCase().slice(0, 60);
    if (!finalSeen.has(key)) {
      finalSeen.add(key);
      finalPosts.push(p);
    }
    if (finalPosts.length >= count) break;
  }

  return finalPosts;
}

// ---------------------------------------------------------------------------
// Outreach post generator — generates tweets that attract the target audience
// to an offer/partnership deal. NOT the outreach message itself.
// ---------------------------------------------------------------------------

function generateOutreachPosts(parsed, count = 5) {
  const { audience, product, mechanics, incentive, domain } = parsed;

  // If we don't have enough structured data, fall back to generic outreach posts
  const hasAudience = audience && audience.length > 0;
  const hasProduct = product && product.length > 0;
  const hasIncentive = incentive && incentive.length > 0;

  const posts = [];

  // Template 1: The "show don't tell" approach
  if (hasAudience && hasProduct) {
    posts.push({
      text: `every ${audience} I reach out to says the same thing:\n\n"I don't need software, I have my workflow."\n\nThen I show them what ${product} does to their raw footage.\n\nThey change their mind in 30 seconds.\n\nShow, don't tell.`,
      type: "insider_observation",
      reasoning: `targets ${audience} resistance + demonstrates value — drives replies + copy-link shares`,
    });
  }

  // Template 2: The results/proof approach
  if (hasAudience && mechanics.length >= 2) {
    posts.push({
      text: `I offered 5 ${audience}s a deal:\n\n${mechanics.map(m => m).join("\n")}\n${hasIncentive ? `\nIn return: ${incentive}` : ""}\n\n3 said yes in 48 hours.\n\nHere's the exact pitch 👇`,
      type: "actionable_plan",
      reasoning: `specific numbers + clear deal structure — drives copy-link shares + bookmarks`,
    });
  }

  // Template 3: The contrarian/value angle
  if (hasAudience && hasProduct) {
    posts.push({
      text: `the best ${audience}s don't use fancy tools.\n\nthey use ${product} and let the results speak.\n\neveryone else is polishing frames by hand.\n\nthe ones who automate the boring part win.`,
      type: "contrarian",
      reasoning: `contrarian take on ${audience} workflow — drives quote tweets + replies`,
    });
  }

  // Template 4: The curiosity/results angle
  if (hasProduct) {
    posts.push({
      text: `I ran a pro editor's raw footage through ${product}.\n\nThe result was so good they watched it 3 times.\n\nThen they asked how I did it.\n\nHere's what the software actually does 👇`,
      type: "founder_story",
      reasoning: `story format with curiosity hook — drives replies + follows`,
    });
  }

  // Template 5: The relatable frustration angle
  if (hasAudience) {
    posts.push({
      text: `nobody talks about how ${audience}s spend 80% of their time on the boring part of the edit and 20% on the creative part\n\n${hasProduct ? `${product} flips that ratio.` : "the right tool flips that ratio."}\n\neveryone wants to be creative. nobody wants to do the repetitive work.\n\nautomate the boring part.`,
      type: "relatable_frustration",
      reasoning: `relatable pain point for ${audience}s — drives DM shares + replies`,
    });
  }

  // Template 6: The "remove the risk" sales angle
  if (hasAudience && hasIncentive) {
    posts.push({
      text: `I offered a ${audience} a deal.\n\nThey said: "I don't promote things I haven't used."\n\nI said: "That's why I'm giving it to you for free first."\n\nThey signed up in 10 minutes.\n\nRemove the risk. The deal closes itself.`,
      type: "founder_story",
      reasoning: `sales insight wrapped in a story — drives replies + copy-link shares`,
    });
  }

  // Template 7: The "what I learned" angle
  if (hasAudience) {
    posts.push({
      text: `I reached out to 50 ${audience}s with a partnership offer.\n\n48 ignored me.\n2 said yes.\n\nThose 2 made me more money than the other 48 combined would have.\n\nStop counting the no's. Start counting the yes's.`,
      type: "proof_receipts",
      reasoning: `specific numbers + counterintuitive lesson — drives copy-link shares + bookmarks`,
    });
  }

  // Template 8: The "before/after" angle
  if (hasProduct && hasAudience) {
    posts.push({
      text: `before ${product}: ${audience}s spend 6 hours on a video\n\nafter: 90 minutes\n\nthe edit quality is the same.\nthe retention is higher.\nthe ${audience} is happier.\n\ntime is the only thing you can't make more of.`,
      type: "proof_receipts",
      reasoning: `before/after comparison with specific numbers — drives copy-link shares`,
    });
  }

  // Shuffle and take the requested count
  const shuffled = posts.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.max(count, 5));
}

// ---------------------------------------------------------------------------
// Main: generate posts from a topic
// ---------------------------------------------------------------------------

/**
 * Generate high-quality posts about a topic.
 *
 * @param {string} topic - What to post about
 * @param {Object} [opts] - { count, voiceProfile, phraseBank }
 * @returns {Array} Array of { post, hook, angle, insight, score, grade, realScore, quality, topSignals }
 */
function generate(topic, opts = {}) {
  const { count = 5, voiceProfile = null, phraseBank = null } = opts;
  if (!topic) return [];

  // 0. Parse the input — understand what the user actually means
  const parsed = parseIdea(topic);
  const inputType = parsed.type;

  // Build the list of angles (insights) to use
  let angles = [];

  if (inputType === "outreach") {
    // User is describing an outreach/partnership/offer deal.
    // Generate tweets that attract the target audience to the offer —
    // NOT the outreach message itself.
    const outreachPosts = generateOutreachPosts(parsed, count);
    for (const post of outreachPosts) {
      angles.push({
        insight: post.text,
        type: post.type,
        specificity: scoreSpecificity(post.text),
        domain: parsed.domain || "editing",
        reasoning: post.reasoning,
      });
    }
  } else if (inputType === "story_request") {
    // User is asking for a founder story — generate novel stories using:
    // 1. ML n-gram model (learns from viral tweets + generated examples)
    // 2. Combinatorial generator (combines story elements)
    // 3. Reference stories (proven viral patterns)
    const storyDomain = parsed.domain || mapTopicToDomain(topic).domain;
    
    // 1. ML-GENERATED tweets — novel output from the slot model
    try {
      const ml = getMLInstance();
      ml.train();
      const mlTweets = ml.generate(storyDomain, 8);
      for (const tweet of mlTweets) {
        angles.push({
          insight: tweet,
          type: "story",
          specificity: scoreSpecificity(tweet),
          domain: storyDomain,
          reasoning: `ML-generated tweet — sampled from n-gram model trained on viral tweets`,
        });
      }
    } catch (e) {
      // ML model might fail — fall through to combinatorial generator
    }

    // 2. Combinatorial generator — combines story elements
    const generatedStories = generateStories(storyDomain, 8);
    for (const story of generatedStories) {
      angles.push({
        insight: story,
        type: "story",
        specificity: scoreSpecificity(story),
        domain: storyDomain,
        reasoning: `combinatorially generated founder story — unique combination of story elements`,
      });
    }

    // 3. Reference stories (hardcoded proven viral patterns)
    const refStories = generateFounderStories(storyDomain);
    for (const story of refStories.slice(0, 3)) {
      const storyKey = story.slice(0, 50).toLowerCase();
      const isDuplicate = angles.some(a => a.insight.slice(0, 50).toLowerCase() === storyKey);
      if (!isDuplicate) {
        angles.push({
          insight: story,
          type: "story",
          specificity: scoreSpecificity(story),
          domain: storyDomain,
          reasoning: `reference founder story — proven viral pattern`,
        });
      }
    }

    // DO NOT add database angles for story requests — they produce contrarian
    // and casual posts that are NOT founder stories. The user asked for stories.
  } else if (inputType === "problem_list") {
    // User pasted a multi-line list of problems/pain points/features.
    // Generate tweets that reference specific problems, with screen recording placeholders.
    const problemPosts = generateProblemListPosts(parsed, count);
    for (const post of problemPosts) {
      angles.push({
        insight: post.text,
        type: post.type,
        specificity: scoreSpecificity(post.text),
        domain: parsed.domain || mapTopicToDomain(topic).domain,
        reasoning: post.reasoning,
      });
    }
  } else if (inputType === "idea") {
    // User gave a topic/idea/phrase — generate multiple distinct tweets FROM it,
    // not from a generic database that might not know about this topic.
    const topicPosts = generateTopicPosts(parsed, count);
    for (const post of topicPosts) {
      angles.push({
        insight: post.text,
        type: post.type,
        specificity: scoreSpecificity(post.text),
        domain: parsed.domain || mapTopicToDomain(topic).domain,
        reasoning: post.reasoning,
      });
    }
  } else if (parsed.insight && inputType !== "topic" && inputType !== "idea") {
    // The user gave us a real idea/story/draft — use IT as the primary insight
    const facts = extractFacts(parsed.insight);

    let primaryInsight;
    let primaryType;

    // RULE: If the user gave a STORY (starts with "I", has numbers), use it directly.
    // Don't extract and rebuild — that mangles it. The story IS the post.
    if (inputType === "story") {
      primaryInsight = parsed.insight;
      primaryType = "story";
    } else if (facts.hasFacts && inputType !== "story") {
      // Check if the original input is already a well-formed narrative.
      // If it's a complete sentence with numbers AND a narrative arc, use it directly.
      // Only rebuild if the input is rough/incomplete (e.g., "autoeditor 2x watchtime").
      const hasNarrativeArc = /\b(built|shipped|launched|sold|grew|gained|lost|made|cut|deleted|spent|tracked|tried|started|quit|failed|raised|bootstrapped|saved|improved|increased|doubled|tripled|hit|reached|crossed|scaled|went from|turned|generated|earned|pulled|brought)\b/i.test(parsed.insight);
      const wordCount = parsed.insight.split(/\s+/).length;
      // A well-formed narrative has: 8+ words, a narrative verb, and a number
      // Don't require capitalization or trailing punctuation — real tweets often don't have them
      const isWellFormed = hasNarrativeArc && wordCount >= 8 && wordCount <= 50 && /\d/.test(parsed.insight);

      if (isWellFormed) {
        // The input is already a well-formed story — use it directly
        primaryInsight = parsed.insight;
        primaryType = "story";
      } else {
        // The user gave us specific facts (numbers, tools, metrics) but NOT a full story
        // Craft a compelling post from those facts
        primaryInsight = craftPost(facts, parsed.insight);
        primaryType = "story";
      }
    } else {
      // No specific facts — use the cleaned insight directly
      primaryInsight = parsed.insight;
      primaryType = inputType === "question" ? "contrarian" : "contrarian";
    }

    angles.push({
      insight: primaryInsight,
      type: primaryType,
      specificity: scoreSpecificity(primaryInsight),
      domain: parsed.domain,
      reasoning: `user's own ${inputType} → authentic voice drives replies + follows`,
    });

    // Also pull domain-specific insights from the database as additional candidates
    const dbAngles = findAngles(parsed.topic || topic, count * 2);
    for (const a of dbAngles) {
      // Skip if too similar to the user's insight
      if (!isSimilar(a.insight, parsed.insight)) {
        angles.push(a);
      }
    }
  } else {
    // Short topic — use the database directly
    angles = findAngles(topic, count * 2);

    // Also generate topic-aware angles using the topic analyzer
    // This is what makes "autoeditor" generate posts about video editing,
    // not random AI product tweets
    try {
      const { analyzeTopic, generateTopicHooks, generateOutcomeBodies, generateTopicClosers } = require("./topicAnalyzer");
      const analysis = analyzeTopic(topic);
      if (analysis && (analysis.type === "product_mention" || analysis.type === "product_announcement" || analysis.audienceProfile)) {
        const topicHooks = generateTopicHooks(analysis);
        const topicBodies = generateOutcomeBodies(analysis);
        const topicClosers = generateTopicClosers(analysis);
        for (let h = 0; h < Math.min(topicHooks.length, 6); h++) {
          for (let b = 0; b < Math.min(topicBodies.length, 3); b++) {
            const closer = topicClosers[(h + b) % topicClosers.length] || "";
            const text = closer ? `${topicHooks[h]}\n\n${topicBodies[b]}\n\n${closer}` : `${topicHooks[h]}\n\n${topicBodies[b]}`;
            angles.push({
              insight: text,
              type: "topic_analyzer",
              specificity: scoreSpecificity(text),
              domain: analysis.audienceProfile?.id || parsed.domain || "general",
              reasoning: `topic-aware: ${analysis.type} for ${analysis.audience || "general audience"}`,
            });
          }
        }

        // Also generate posts using the viral format database
        // These use the actual viral structures from 2026 research
        try {
          const { getFormatsForNiche, generateFromFormat } = require("./viralFormats");
          const nicheId = analysis.audienceProfile?.id;
          if (nicheId) {
            const formats = getFormatsForNiche(nicheId);
            for (const format of formats) {
              for (let i = 0; i < 2; i++) {
                const generated = generateFromFormat(format.id, analysis);
                if (generated && generated.text) {
                  angles.push({
                    insight: generated.text,
                    type: "viral_format",
                    specificity: scoreSpecificity(generated.text),
                    domain: nicheId,
                    reasoning: `viral format: ${generated.formatName} — ${format.description}`,
                  });
                }
              }
            }
          }
        } catch (e) {
          // Viral formats are optional
        }
      }
    } catch (e) {
      // Topic analyzer is optional
    }
  }

  if (!angles.length) return [];

  // 1.5. Generate casual candidates from the casual generator.
  // Skip for story_request, outreach, AND idea-type topic descriptions.
  // For "idea" type inputs that are short topic descriptions (like "building a fitness app"),
  // the ML/casual generators produce off-topic SaaS posts. Only use them for actual
  // opinions/stories/drafts where the user's content is the primary focus.
  // ALSO skip when we have topic analyzer angles — those are more specific.
  const isShortTopicDescription = inputType === "idea" && topic.split(/\s+/).length <= 12;
  const hasTopicAnalyzerAngles = angles.some(a => a.type === "topic_analyzer" || a.type === "viral_format");
  if (inputType !== "story_request" && inputType !== "outreach" && inputType !== "problem_list" && !isShortTopicDescription && !hasTopicAnalyzerAngles) {
    const casualDomain = parsed.domain || mapTopicToDomain(topic).domain;
    const casualCandidates = generateCasual(parsed.topic || topic, casualDomain);
    for (const casual of casualCandidates) {
      angles.push({
        insight: casual,
        type: "casual",
        specificity: scoreSpecificity(casual),
        domain: casualDomain,
        reasoning: `casual generated tweet — human-sounding, no CTA, no share cue`,
      });
    }

    // 1.6. ML-GENERATED tweets — novel output from the slot model.
    // The ML model learns from viral tweets + generated examples and produces
    // novel tweets that aren't just recombined templates.
    try {
      const ml = getMLInstance();
      ml.train();
      const mlTweets = ml.generate(casualDomain, 6);
      for (const tweet of mlTweets) {
        angles.push({
          insight: tweet,
          type: "ml",
          specificity: scoreSpecificity(tweet),
          domain: casualDomain,
          reasoning: `ML-generated tweet — sampled from n-gram model trained on viral tweets`,
        });
      }
    } catch (e) {
      // ML model might fail — fall through to other generators
    }
  }

  // 2. Build a post for each angle, then run it through the iteration engine
  const candidates = angles.map(angle => {
    // For story_request, casual, ml, and outreach types, skip buildPost entirely —
    // buildPost adds CTAs, share cues, and structure that destroys the
    // already-complete posts.
    let draftPost;
    if (angle.type === "casual" || angle.type === "ml" || angle.type === "topic_analyzer" || angle.type === "viral_format" || (angle.type === "story" && inputType === "story_request") || inputType === "outreach" || inputType === "idea" || inputType === "problem_list") {
      draftPost = angle.insight;
    } else {
      draftPost = buildPost(angle, parsed.topic || topic, { voiceProfile, phraseBank });
    }

    // Casual tweets, founder stories, outreach posts, idea-type posts, and problem-list posts
    // are already complete — skip the iteration engine. The iteration engine adds formulaic lines
    // ("nobody wants to hear this", "most people get this wrong", CTAs, share cues)
    // that destroy the already-complete posts.
    let iterated;
    if (angle.type === "casual" || angle.type === "ml" || angle.type === "topic_analyzer" || angle.type === "viral_format" || (angle.type === "story" && inputType === "story_request") || inputType === "outreach" || inputType === "idea" || inputType === "problem_list") {
      const score = scorePost(draftPost);
      iterated = {
        final: draftPost,
        finalScore: score.score,
        finalGrade: score.grade,
        iterationCount: 0,
        converged: true,
        originalGrade: score.grade,
        originalScore: score.score,
        iterations: [],
        assessment: angle.type === "casual" ? "casual generated tweet — no iteration needed" : "founder story — no iteration needed (already complete)",
      };
    } else {
      iterated = iterate(draftPost, parsed.topic || topic, { voiceProfile, phraseBank });
    }

    const post = iterated.final;
    const score = scorePost(post);
    const quality = check(post);

    return {
      post,
      hook: post.split("\n")[0],
      angle: angle.insight,
      angleType: angle.type,
      angleReasoning: angle.reasoning,
      domain: angle.domain,
      specificity: angle.specificity,
      score: score.score,
      grade: score.grade,
      realScore: score.signalModel?.realScore || 0,
      engagementTier: score.signalModel?.engagementTier,
      predictedDwellSeconds: score.signalModel?.predictedDwellSeconds,
      topSignals: score.signalModel?.topPositive?.map(s => `${s.signal} (+${s.contribution})`) || [],
      qualityScore: quality.score,
      qualityIssues: quality.issues,
      qualityGoodParts: quality.goodParts,
      isSlop: quality.isSlop,
      isUserIdea: angle.reasoning?.includes("user's own"),
      // Iteration info
      iterationCount: iterated.iterationCount,
      converged: iterated.converged,
      originalGrade: iterated.originalGrade,
      originalScore: iterated.originalScore,
      iterationHistory: iterated.iterations,
      assessment: iterated.assessment,
    };
  });

  // 3. Sort by composite score (includes authenticity penalty)
  // The user's own idea always gets priority (it's authentic to them)
  candidates.sort((a, b) => {
    // User's own idea always gets priority
    if (a.isUserIdea && !b.isUserIdea) return -1;
    if (!a.isUserIdea && b.isUserIdea) return 1;
    // Penalize slop heavily
    if (a.isSlop && !b.isSlop) return 1;
    if (!a.isSlop && b.isSlop) return -1;
    // Topic analyzer posts get a bonus — they're more specific to the topic
    const aTopicBonus = a.angleType === "topic_analyzer" || a.angleType === "viral_format" ? 25 : 0;
    const bTopicBonus = b.angleType === "topic_analyzer" || b.angleType === "viral_format" ? 25 : 0;
    // Domain bonus: prefer domain-specific insights over general
    const aDomainBonus = a.domain && a.domain !== "general" ? 3 : 0;
    const bDomainBonus = b.domain && b.domain !== "general" ? 3 : 0;
    // Combined score: composite (includes authenticity) + quality + domain + topic bonus
    const aScore = a.score + a.qualityScore * 0.05 + aDomainBonus + a.specificity * 0.3 + aTopicBonus;
    const bScore = b.score + b.qualityScore * 0.05 + bDomainBonus + b.specificity * 0.3 + bTopicBonus;
    return bScore - aScore;
  });

  // 4. Deduplicate by hook (use first 2 lines to distinguish posts with same opener)
  const seen = new Set();
  const unique = candidates.filter(c => {
    const lines = c.post.split("\n").filter(l => l.trim());
    const key = (lines[0] + " " + (lines[1] || "")).toLowerCase().slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 5. Best-of-N: for each candidate, try generating it N times with different
  // random CTAs/tensions and keep the best-scoring version.
  // This makes the system deterministic — we always pick the best variation.
  // BUT: skip this for casual and story_request types — their posts are already
  // complete and buildPost would add formulaic CTAs/share cues.
  const improved = unique.slice(0, count).map(c => {
    // Generate 3 variations of this post and pick the best
    const variations = [c];
    
    // Skip best-of-N for casual, ML, story_request, outreach, idea, and problem_list types
    if (c.angleType !== "casual" && c.angleType !== "ml" && c.angleType !== "topic_analyzer" && c.angleType !== "viral_format" && !(c.angleType === "story" && inputType === "story_request") && inputType !== "outreach" && inputType !== "idea" && inputType !== "problem_list") {
      for (let i = 0; i < 3; i++) {
        const angle = { insight: c.angle, type: c.angleType, specificity: c.specificity, domain: c.domain, reasoning: c.angleReasoning };
        const vPost = buildPost(angle, parsed.topic || topic, { voiceProfile, phraseBank });
        const vScore = scorePost(vPost);
        const vQuality = check(vPost);
        variations.push({
          post: vPost,
          hook: vPost.split("\n")[0],
          angle: c.angle,
          angleType: c.angleType,
          angleReasoning: c.angleReasoning,
          domain: c.domain,
          specificity: c.specificity,
          score: vScore.score,
          grade: vScore.grade,
          realScore: vScore.signalModel?.realScore || 0,
          engagementTier: vScore.signalModel?.engagementTier,
        predictedDwellSeconds: vScore.signalModel?.predictedDwellSeconds,
        topSignals: vScore.signalModel?.topPositive?.map(s => `${s.signal} (+${s.contribution})`) || [],
        qualityScore: vQuality.score,
        qualityIssues: vQuality.issues,
        qualityGoodParts: vQuality.goodParts,
        isSlop: vQuality.isSlop,
        isUserIdea: c.isUserIdea,
        iterationCount: 0,
        converged: true,
        originalGrade: c.grade,
        originalScore: c.score,
        assessment: c.assessment,
      });
      }
    }
    // Pick the best variation (use composite score, not realScore)
    variations.sort((a, b) => (b.score + b.qualityScore * 0.05) - (a.score + a.qualityScore * 0.05));
    return variations[0];
  });

  return improved;
}

// ---------------------------------------------------------------------------
// Print format — for CLI/debugging
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Expand a short single-sentence idea into a fuller post
// ---------------------------------------------------------------------------

function expandShortIdea(post, topic, domain) {
  // Only expand if the post is genuinely too short (1 line).
  // The follow-up MUST connect to the actual content — not just the domain.
  // If we can't find a good follow-up, DON'T add one. A short punchy post
  // is better than a post with a disjointed second line.

  const postLower = post.toLowerCase();
  const lines = post.split("\n").filter(Boolean);
  if (lines.length > 1) return post; // already has multiple lines

  // Detect what kind of post this is — the follow-up must match
  const isProductClaim = /\b(changing|revolutionizing|disrupting|killing|replacing|better than|the future of|the best|game.?changer)\b/i.test(post) && !/\b(i |my |me )\b/i.test(post.split("\n")[0]);
  const isOpinion = /\b(is bad|is good|is overrated|is underrated|is wrong|is right|is a myth|is a lie|is a trap|is dead|is killing)\b/i.test(post);
  const isPersonalStory = /\b(i (spent|tried|tested|built|shipped|launched|failed|quit|started|learned|realized|tracked|replaced|deleted|raised|made|lost|gained))\b/i.test(post);

  // For product claims, don't add "I learned this the hard way" — it doesn't fit.
  // Instead, add a line that strengthens the claim without promising an explanation.
  // NEVER use "here's why:" — it promises an explanation the system can't deliver.
  if (isProductClaim) {
    const productFollowUps = [
      "and most people haven't noticed yet.",
      "the old way is dead.",
      "the gap is widening every month.",
      "this isn't incremental. it's a category shift.",
    ];
    return pickBestFollowUp(post, productFollowUps);
  }

  // For pure opinions, add a line that strengthens the claim
  if (isOpinion && !isPersonalStory) {
    const opinionFollowUps = [
      "nobody who's actually experienced this disagrees.",
      "the data backs this up.",
      "I learned this the hard way.",
    ];
    return pickBestFollowUp(post, opinionFollowUps);
  }

  // For personal stories, add a lesson-style follow-up
  if (isPersonalStory) {
    const storyFollowUps = [
      "I learned this the hard way.",
      "nobody talks about this. everyone should.",
      "I wish I'd known this 5 years ago.",
    ];
    return pickBestFollowUp(post, storyFollowUps);
  }

  // Default: generic but safe follow-ups
  const followUps = {
    saas: ["every founder I know says the same thing.", "the data backs this up."],
    marketing: ["the data backs this up.", "every marketer I know says the same thing."],
    ai: ["the gap is widening every month.", "nobody who's actually using AI disagrees."],
    fitness: ["the science backs this up.", "nobody who's actually trained seriously disagrees."],
    money: ["the math is simple. nobody does it.", "the numbers don't lie."],
    productivity: ["the fix took 10 minutes. the payoff took months.", "nobody who's actually tried this disagrees."],
    content: ["the algorithm rewards this. most creators don't know.", "every creator I know who grew fast did this."],
    career: ["every promotion I got came from this.", "nobody who's been in the workforce 10+ years disagrees."],
    coding: ["every senior dev I know does this.", "nobody who's shipped production code disagrees."],
    design: ["the best designers I know all do this.", "the data backs this up."],
    general: ["I learned this the hard way.", "nobody talks about this. everyone should."],
  };

  const list = followUps[domain] || followUps.general;
  return pickBestFollowUp(post, list);
}

// Try ALL follow-ups and pick the best-scoring one (deterministic)
function pickBestFollowUp(post, followUps) {
  let bestPost = post;
  let bestScore = scorePost(post).score || 0;
  for (const followUp of followUps) {
    const candidate = post + "\n\n" + followUp;
    const score = scorePost(candidate).score || 0;
    if (score > bestScore) {
      bestScore = score;
      bestPost = candidate;
    }
  }
  return bestPost;
}

// ---------------------------------------------------------------------------
// Helpers for idea parsing
// ---------------------------------------------------------------------------

function scoreSpecificity(text) {
  let score = 5;
  if (/\d/.test(text)) score += 3;
  if (/\$|\bmrr\b|\barr\b|\brevenue\b|\bsalary\b/i.test(text)) score += 3;
  if (/\b(notion|figma|stripe|chatgpt|claude|react|python|slack|gmail)\b/i.test(text)) score += 2;
  if (/\b\d+ (day|week|month|year|hour|minute)/i.test(text)) score += 2;
  return Math.min(10, score);
}

function isSimilar(a, b) {
  // Check if two insights are too similar (overlapping words)
  const wordsA = new Set(a.toLowerCase().match(/[\w']+/g) || []);
  const wordsB = new Set(b.toLowerCase().match(/[\w']+/g) || []);
  let common = 0;
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 3) common++;
  }
  const overlap = common / Math.min(wordsA.size, wordsB.size);
  return overlap > 0.5;
}

function formatResult(posts, topic) {
  const lines = [];
  lines.push(`=== AGENTX CONTENT ENGINE ===`);
  lines.push(`Topic: ${topic}`);
  lines.push(`Generated ${posts.length} posts`);
  lines.push("");

  posts.forEach((p, i) => {
    lines.push(`--- POST ${i + 1} [${p.grade}] Real: ${p.realScore} | Quality: ${p.qualityScore}/100 ---`);
    lines.push(`Angle: ${p.angleType} | ${p.angleReasoning}`);
    if (p.qualityIssues.length) {
      lines.push(`Quality issues: ${p.qualityIssues.slice(0, 2).join("; ")}`);
    }
    if (p.qualityGoodParts.length) {
      lines.push(`Strengths: ${p.qualityGoodParts.slice(0, 2).join("; ")}`);
    }
    lines.push("");
    lines.push("```");
    lines.push(p.post);
    lines.push("```");
    lines.push("");
  });

  return lines.join("\n");
}

module.exports = {
  generate,
  buildPost,
  formatResult,
  findAngles,
  check,
  fixSlop,
};

