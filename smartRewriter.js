/*
 * Smart Rewriter — uses the postAnalyzer's analysis to craft a UNIQUE
 * rewrite for every post. No fixed templates. Every post gets its own
 * hook, structure, and pacing based on its specific DNA.
 *
 * The rewriter generates multiple candidates from different angles,
 * scores them, and returns the best — but every candidate is built
 * from the post's own facts, emotion, and hook potential.
 *
 * Rule-based (no LLM) so it runs anywhere and is deterministic.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { analyze } = require("./postAnalyzer");
const { generateHooks, extractTension, extractTopic } = require("./hookLibrary");
const { URL_RE_GLOBAL } = require("./engagementAlgo");

// ---------------------------------------------------------------------------
// Hook generators — each produces a unique first line based on the analysis
// ---------------------------------------------------------------------------

function makeMoneyHook(analysis) {
  const money = analysis.mustPreserve.money;
  if (!money.length) return null;
  const m = money[0];
  const emotion = analysis.emotion;

  // Different angles depending on context
  if (emotion === "vulnerability") return `${m}. and counting.`;
  if (analysis.primaryType === "revenue_milestone") return `${m}/month. here's what actually drove it.`;
  if (analysis.primaryType === "absurd_niche") return `the kinda bullshit that's printing you ${m}/mo nowadays:`;
  return `${m} and counting.`;
}

function makeDramaHook(analysis, text) {
  const t = text.toLowerCase();
  // "Claude just killed our startup"
  if (/\b(killed|destroyed)\b/.test(t)) {
    const killer = text.match(/\b(Claude|GPT|AI|Copilot|Cursor|the algo|the update)\b/i);
    const victim = text.match(/\b(startup|business|company|agency|studio)\b/i);
    if (killer && victim) return `${killer[0]} just killed our ${victim[0].toLowerCase()}.`;
  }
  // "I failed at 3 startups"
  if (/\b(failed)\b/.test(t)) {
    const count = analysis.mustPreserve.counts.find((c) => /startup|business|company/.test(c));
    if (count) return `I failed at ${count} before this one worked.`;
    return `I failed. here's what it cost me.`;
  }
  // "I quit my job"
  if (/\b(quit my job|last day|i quit|resigned)\b/.test(t)) {
    return `Today was my last day at my 9-to-5.`;
  }
  return null;
}

function makeContrarianHook(analysis, text) {
  const t = text.toLowerCase();
  // Find the contrarian claim
  if (/\b(overrated)\b/.test(t)) {
    const subject = text.match(/(\w[\w\s]+)\s+is\s+overrated/i);
    if (subject) return `${subject[1].trim()} is overrated.`;
  }
  if (/\b(useless)\b/.test(t)) {
    const subject = text.match(/(\w[\w\s]+)\s+are\s+useless/i);
    if (subject) return `${subject[1].trim()} are useless.`;
  }
  if (/\b(killing)\b/.test(t)) {
    const subject = text.match(/(\w[\w\s]+)\s+is\s+killing/i);
    if (subject) return `${subject[1].trim()} is killing your growth.`;
  }
  // Generic contrarian: "most X are Y"
  if (/\b(most|everyone|nobody)\b/.test(t)) {
    const firstLine = text.split(/[.!?]/)[0].trim();
    if (firstLine.length < 80) return firstLine.replace(/\.$/, "") + ".";
  }
  // For generic "I want to share thoughts about X" → make X contrarian
  if (/\b(i want to share|thoughts about|let me tell|here are some thoughts)\b/.test(t)) {
    const topicMatch = text.match(/(?:thoughts about|thoughts on|about) (.+?)(?:\.|$)/i) ||
                       text.match(/building (?:a )?(\w+)/i);
    if (topicMatch) {
      const topic = topicMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
      return `${topic} is overrated.`;
    }
  }
  return null;
}

function makeQuestionHook(analysis, text) {
  // "why do AI edited videos still get skipped?"
  const t = text.toLowerCase();
  if (/\b(figured out|spent months|why)\b/.test(t)) {
    // Extract the "why X" from "I spent months figuring out why X"
    const whyMatch = text.match(/figuring out why (.+?)(?:\.|$)/i) ||
                     text.match(/why (.+?)(?:\.|$)/i);
    if (whyMatch) {
      let q = whyMatch[1].trim().replace(/\.$/, "");
      // Prefix with "why do" if the extracted text doesn't start with a question word
      if (!/^(why|how|what|when|where|who)/i.test(q)) {
        q = "why do " + q;
      }
      if (!q.endsWith("?")) q += "?";
      return q;
    }
  }
  // Turn a statement into a question
  if (analysis.hooks.some((h) => h.angle === "curiosity_question")) {
    const q = text.match(/[^.!?]*\?/);
    if (q) return q[0].trim();
  }
  return null;
}

function makeStoryHook(analysis, text) {
  const t = text.toLowerCase();
  // "i met him at a car service center"
  if (/\b(i met (him|her|a guy|someone)|met him at)\b/.test(t)) {
    const match = text.match(/i met (?:him|her|a guy|someone) at a (.+?)(?:\.|$)/i);
    if (match) return `i met him at a ${match[1].trim().replace(/\.$/, "")}.`;
  }
  // "waiting room."
  if (/\b(waiting room|plastic chairs|bad coffee|3am|midnight)\b/.test(t)) {
    const setting = text.match(/\b(waiting room|plastic chairs|bad coffee|3am|midnight)\b/i);
    if (setting) return `${setting[0].toLowerCase()}.`;
  }
  return null;
}

function makeAbsurdHook(analysis, text) {
  const t = text.toLowerCase();
  // "a cat playing sudoku makes $6M"
  if (/\b(cat|embryo|brainrot)\b/.test(t) && analysis.mustPreserve.money.length) {
    const subject = text.match(/\b(cat playing|embryo|brainrot)\b[^.]*/i);
    const money = analysis.mustPreserve.money[0];
    if (subject) return `${subject[0].toLowerCase()} makes ${money}.`;
  }
  // "Here's a 16-hour timelapse of an embryo"
  if (/\b(embryo|timelapse|nervous system|dna)\b/.test(t)) {
    const match = text.match(/(here'?s a \d+[\w\s]*timelapse[^.]*|a \d+[\w\s]*timelapse[^.]*)/i);
    if (match) return match[0].trim().replace(/\.$/, "") + ".";
  }
  // "the kinda bullshit that's printing you $6M"
  if (/\b(the kinda (bullshit|shit|stuff))\b/.test(t)) {
    const match = text.match(/the kinda (bullshit|shit|stuff)[^.]*/i);
    if (match) return match[0].trim().replace(/\.$/, "") + ":";
  }
  return null;
}

function makeTimeCompressionHook(analysis, text) {
  // "edited this entire 12 minute video in just 5 minutes"
  const times = analysis.mustPreserve.timePeriods;
  if (times.length >= 2) {
    // Find the action that connects them
    const actionMatch = text.match(/(edited|built|shipped|wrote|created|made)\s+(?:this|a|an|the)?\s*(?:entire|whole)?\s*(\d+\s*(?:minute|hour|day|week)\w*)\s+(?:video|app|tool|product|post|site|feature)?\s+in\s+(?:just\s+)?(\d+\s*(?:minute|hour|day|second)\w*)/i);
    if (actionMatch) {
      return `${actionMatch[1].toLowerCase()} this entire ${actionMatch[2]} in just ${actionMatch[3]}.`;
    }
  }
  return null;
}

function makeProofHook(analysis, text) {
  // "my app crossed $40k/mo in less than 90 days"
  const t = text.toLowerCase();
  if (/\b(my (app|product|tool|saas|business))\b/.test(t) && analysis.mustPreserve.money.length) {
    const money = analysis.mustPreserve.money[0];
    const time = analysis.mustPreserve.timePeriods.find((tp) => /day|month|week|year/.test(tp));
    if (time) return `my app crossed ${money}/mo in less than ${time}.`;
    return `my app crossed ${money}/mo.`;
  }
  return null;
}

function makeVulnerabilityHook(analysis, text) {
  const t = text.toLowerCase();
  if (analysis.emotion !== "vulnerability") return null;
  // "Today was my last day at my 9-to-5"
  if (/\b(quit my job|last day|leaving my)\b/.test(t)) {
    return `Today was my last day at my 9-to-5.`;
  }
  // "I failed at 3 startups"
  if (/\b(failed)\b/.test(t)) {
    const count = analysis.mustPreserve.counts.find((c) => /startup|business/.test(c));
    if (count) return `I failed at ${count} before this one worked.`;
    return `I failed. here's what it cost me.`;
  }
  // "I was broke / living off savings"
  if (/\b(broke|savings|living off|saved up)\b/.test(t)) {
    return `I'm living off savings right now.`;
  }
  return null;
}

function makeReverseEngineeredHook(analysis, text) {
  const t = text.toLowerCase();
  if (!/\b(reverse.?engineer|already (working|winning))\b/.test(t)) return null;
  // "this guy doesn't make a single video."
  if (/\b(doesn'?t make|doesn'?t create|never makes)\b/.test(t)) {
    return `this guy doesn't make a single video.`;
  }
  // Generic reverse-engineered hook
  return `he doesn't guess. he reverse-engineers what's already winning.`;
}

function makeLaunchHook(analysis, text) {
  const t = text.toLowerCase();
  // "Excited to share that we just launched" → make it punchy
  if (/\b(excited to share|thrilled to|just launched|we launched|proud to)\b/.test(t)) {
    // Try to find what was launched
    const productMatch = text.match(/\b(launched|shipped|built)\s+(?:a\s+|an\s+|the\s+|our\s+|my\s+)?(?:new\s+)?((?:ai\s+)?(?:tool|app|product|feature|service|platform|agent|bot|system|template|site))\b/i);
    if (productMatch) {
      const toolWord = productMatch[2].toLowerCase();
      const article = /^[aeiou]/.test(toolWord) ? "an" : "a";
      return `I just built ${article} ${toolWord} and it's absurd.`;
    }
    // Try to find the specific feature
    const featureMatch = text.match(/\b(dashboard|analytics|api|dark mode|onboarding|export|integration|automation)\b/i);
    if (featureMatch) {
      return `we rebuilt our ${featureMatch[1].toLowerCase()}. it's absurd.`;
    }
    return `it's absurd.`;
  }
  return null;
}

function makeGenericWeakHook(analysis, text) {
  const t = text.toLowerCase();
  const firstLine = text.split(/[.!\n]/)[0].trim();

  // "Feeling incredibly grateful" → contrarian
  if (/^feeling (incredibly )?grateful/i.test(firstLine)) {
    return `gratitude is overrated.`;
  }
  // "Never give up on your dreams" → contrarian
  if (/^never give up/i.test(firstLine)) {
    return `most people quit right before it works.`;
  }
  // "AI is going to change everything" → contrarian
  if (/^ai is going to/i.test(firstLine)) {
    return `AI isn't going to replace you. someone using AI will.`;
  }
  // "If you're not using AI" → contrarian
  if (/^if you'?re not using/i.test(firstLine)) {
    return `you're already behind.`;
  }
  // "I just built something amazing" → make it specific
  if (/^i just built something/i.test(firstLine)) {
    return `I built something I can't stop using.`;
  }
  // "Here are 5 tips for being more productive" → contrarian
  if (/^here are \d+ tips/i.test(firstLine)) {
    const topicMatch = text.match(/tips? for (.+?)(?:[:.\n]|$)/i);
    if (topicMatch) {
      const topic = topicMatch[1].trim().split(/\s+/).slice(0, 3).join(" ");
      return `${topic} is overrated.`;
    }
    return `productivity tips are overrated.`;
  }
  // "After 3 months of building, we finally launched" → make it punchy
  if (/^after \d+ months? of building/i.test(firstLine)) {
    const monthsMatch = text.match(/after (\d+) months?/i);
    const months = monthsMatch ? monthsMatch[1] : "3";
    return `${months} months. 1 product. it's live.`;
  }
  // "Today I woke up at 5am" → make it a story hook
  if (/^today i woke up/i.test(firstLine)) {
    return `I woke up at 5am today.`;
  }
  // "Just shipped another feature" → make it specific
  if (/^just shipped another/i.test(firstLine)) {
    return `shipped it. it's absurd.`;
  }
  // "This week we shipped" → make it punchy
  if (/^this week we shipped/i.test(firstLine)) {
    return `we shipped this week.`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Body builders — construct the post body from preserved facts
// ---------------------------------------------------------------------------

function buildBody(analysis, text, hook) {
  const facts = analysis.mustPreserve;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const sentences = text.split(/(?<!\d)[.!?]+(?!\d)/).map((s) => s.trim()).filter((s) => s.length > 10);

  // Extract proof points — sentences with numbers, facts, or key phrases
  // Filter out: the hook itself, weak openers, URLs, and sentences that
  // are just restating the hook
  const hookWords = hook ? hook.toLowerCase().split(/\s+/).slice(0, 4) : [];
  const proofPoints = sentences.filter((s) => {
    const sl = s.toLowerCase();
    // Skip weak openers and URLs
    if (/^(excited|thrilled|happy|proud|check out|here is|here'?s|agree or|https?:|we'?re|after months|feeling|never give|keep building|keep shipping|keep believing|ai is going|if you'?re not|i just built something|today i woke|hope this|just shipped another|this week we shipped)/i.test(sl)) return false;
    // Skip if this sentence IS the hook (first 4 words match)
    if (hookWords.length >= 2) {
      const sWords = sl.split(/\s+/).slice(0, 4);
      const overlap = hookWords.filter((w, i) => sWords[i] === w).length;
      if (overlap >= 2) return false;
    }
    // Skip "I spent months" / "I figured out" — these are the setup, not the proof
    if (/^(i spent months|i figured out|i want to share|let me tell|a thread|i'?ve been thinking)/i.test(sl)) return false;
    // Skip "Then I fixed it" — already in the body if needed
    if (/^then i fixed/i.test(sl)) return false;
    // Skip generic motivation
    if (/^(every successful|the only difference|keep building|keep shipping|keep believing)/i.test(sl)) return false;
    // Keep sentences with facts OR meaningful content
    return /\b(\d|zero|no |dead air|pacing|hook|close rate|original content|face|brand|audience|followers|ads|repurpos|schedule|scrape|workflow|absurd|insane|fixed|solved|cracked|built|shipped|launched|edited|video|tool|app|product|feature|quit|savings|scary|fail|lost|subscribers|channel|posts?|week|dark mode|api|bug|export|dashboard|analytics|faster|improved|redesigned|updated|docs|changelog|saas|platform|businesses|save time|productivity|sign up|live)\b/i.test(s);
  });

  // ── Special handling for changelog posts ──
  const isChangelog = /\b(dark mode|api|bug fix|export|docs|changelog|shipped this week|we shipped)\b/i.test(text);
  if (isChangelog && analysis.tension === "changelog fatigue") {
    const body = [];
    body.push("here's what actually shipped:");
    body.push("");
    // Extract items — match longer phrases first to avoid duplicates
    const items = text.match(/\b((?:redesigned )?dashboard|(?:improved )?analytics|(?:faster )?api(?: response times?)?|bug fix|export bug|docs|onboarding|integration|dark mode)\b[^.]*\./gi) || [];
    // Deduplicate — don't include "dashboard" if "redesigned dashboard" already matched
    const seen = new Set();
    const uniqueItems = [];
    for (const item of items) {
      // Use the last word of the feature phrase as the key (e.g. "redesigned dashboard" → "dashboard")
      const words = item.toLowerCase().match(/\b(dashboard|analytics|api|bug fix|export bug|docs|onboarding|integration|dark mode)\b/i);
      const key = words ? words[0] : item.toLowerCase().split(/\s+/)[0];
      if (!seen.has(key)) {
        seen.add(key);
        uniqueItems.push(item);
      }
    }
    for (const item of uniqueItems.slice(0, 4)) {
      body.push(`- ${item.toLowerCase().replace(/\.$/, "")}`);
    }
    if (uniqueItems.length === 0) {
      for (const p of proofPoints.slice(0, 3)) {
        body.push(`- ${p.toLowerCase().replace(/\.$/, "")}`);
      }
    }
    body.push("");
    body.push("small ships. big compounding.");
    return body.join("\n");
  }

  // ── Special handling for corporate speak posts ──
  const isCorporate = /\b(thrilled|excited to share|proud to announce|hard work|amazing team|grateful for your support|v\d\.\d)\b/i.test(text);
  if (isCorporate && analysis.tension === "launch anxiety") {
    const body = [];
    // Extract real features from corporate speak — match longer phrases first
    const features = text.match(/\b((?:redesigned )?dashboard|(?:improved )?analytics|(?:faster )?api(?: response times?)?|dark mode|new features?|integration|onboarding|export|automation)\b[^.]*\./gi) || [];
    // Deduplicate
    const seen = new Set();
    const uniqueFeatures = [];
    for (const f of features) {
      const words = f.toLowerCase().match(/\b(dashboard|analytics|api|dark mode|features?|integration|onboarding|export|automation)\b/i);
      const key = words ? words[0] : f.toLowerCase().split(/\s+/)[0];
      if (!seen.has(key)) {
        seen.add(key);
        uniqueFeatures.push(f);
      }
    }
    if (uniqueFeatures.length > 0) {
      body.push("what actually changed:");
      body.push("");
      for (const f of uniqueFeatures.slice(0, 3)) {
        body.push(`- ${f.toLowerCase().replace(/\.$/, "")}`);
      }
      body.push("");
      body.push("no fluff. just the diff.");
    } else {
      body.push("most launch posts get scrolled past.");
      body.push("");
      body.push("here's what actually matters:");
      body.push("");
      body.push("- does it solve a real problem?");
      body.push("- can someone use it in 60 seconds?");
      body.push("- is there proof it works?");
    }
    return body.join("\n");
  }

  // Build the body based on post type and emotion
  const body = [];

  if (analysis.primaryType === "product_demo" || analysis.primaryType === "ai_topic") {
    // Product demo: hook → proof points → closer
    // Don't add "then I fixed it" if the hook already contains "fixed"
    if (/\b(fixed|solved|figured out|cracked)\b/i.test(text) && !/fix/i.test(hook)) {
      body.push("then I fixed it.");
      body.push("");
    }
    for (const p of proofPoints.slice(0, 3)) {
      // Skip proof points that duplicate the hook
      if (hook && p.toLowerCase().slice(0, 20) === hook.toLowerCase().slice(0, 20)) continue;
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("it's a new world.");
  } else if (analysis.primaryType === "revenue_milestone") {
    // Revenue: hook → proof points → "here's what drove it"
    for (const p of proofPoints.slice(0, 2)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("here's what actually drove it 👇");
  } else if (analysis.primaryType === "personal_story") {
    // Story: hook → narrative fragments
    for (const p of proofPoints.slice(0, 3)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    if (analysis.emotion === "vulnerability") {
      body.push("scary? yes.");
      body.push("");
      body.push("worth it? ");
    }
  } else if (analysis.primaryType === "reverse_engineered") {
    // Reverse-engineered: hook → "not until he's..." → proof → "here's his system"
    body.push("not until he's reverse-engineered what's already winning.");
    body.push("");
    body.push("most creators start with \"what should I make?\" and hope.");
    body.push("");
    body.push("he starts with \"what's already working?\" then proves it.");
    body.push("");
    // Add money/stats as bullet points
    if (facts.money.length) {
      body.push(`• ${facts.money[0]}/month`);
    }
    body.push("• 1 person");
    body.push("• zero original content");
    body.push("");
    body.push("here's his exact system 👇");
  } else if (analysis.primaryType === "contrarian_take") {
    // Contrarian: hook → proof → "here's what actually works"
    for (const p of proofPoints.slice(0, 2)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    if (body.length === 0) body.push("here's what actually works 👇");
    else body.push("here's what actually works 👇");
  } else if (analysis.primaryType === "failure_reflection") {
    // Failure: hook → what each failure taught
    for (const p of proofPoints.slice(0, 3)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("each one taught me something the others couldn't.");
  } else if (analysis.primaryType === "absurd_niche") {
    // Absurd: hook → proof → "no I'm not joking"
    for (const p of proofPoints.slice(0, 2)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("no I'm not joking.");
  } else if (analysis.primaryType === "lead_gen") {
    // Lead gen: hook → "Like + Reply" → credibility
    for (const p of proofPoints.slice(0, 1)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("Like + Reply with 👋 and I'll DM it to you for free, right now.");
    body.push("");
    // Find credibility line
    const credMatch = text.match(/\(?(i'?ve done[^)]+|i'?ve helped[^)]+|i'?ve worked with[^)]+|experience in[^)]+|years? of[^)]+)\)?/i);
    if (credMatch) body.push(`(${credMatch[0].replace(/[()]/g, "")})`);
  } else if (analysis.primaryType === "giveaway") {
    // Giveaway: hook → product description → "free for 24 hours" → instructions
    for (const p of proofPoints.slice(0, 2)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    body.push("For the next 24 hours, it's FREE.");
    body.push("");
    body.push("Just like, repost, and comment below 👇");
  } else if (analysis.primaryType === "educational" || analysis.primaryType === "data_drop") {
    // Educational: hook → bullet points
    body.push("here's what I did:");
    body.push("");
    for (const p of proofPoints.slice(0, 4)) {
      body.push(`- ${p.toLowerCase().replace(/\.$/, "")}`);
    }
  } else {
    // Generic: hook → proof points → reply trigger
    for (const p of proofPoints.slice(0, 3)) {
      body.push(p.toLowerCase().replace(/\.$/, "") + ".");
      body.push("");
    }
    // If no proof points, add a generic closer
    if (body.length === 0) {
      body.push("here's what actually works 👇");
    }
  }

  return body.join("\n");
}

// ---------------------------------------------------------------------------
// Candidate generation — produce multiple unique rewrites
// ---------------------------------------------------------------------------

function generateCandidates(text) {
  const analysis = analyze(text);
  const candidates = [];

  // Strip URL from body for all candidates (move to reply)
  let cleanText = text.replace(URL_RE_GLOBAL, "").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  const links = text.match(URL_RE_GLOBAL) || [];

  // Generate hooks from different angles
  const hookGenerators = [
    { name: "money", fn: () => makeMoneyHook(analysis) },
    { name: "drama", fn: () => makeDramaHook(analysis, cleanText) },
    { name: "contrarian", fn: () => makeContrarianHook(analysis, cleanText) },
    { name: "question", fn: () => makeQuestionHook(analysis, cleanText) },
    { name: "story", fn: () => makeStoryHook(analysis, cleanText) },
    { name: "absurd", fn: () => makeAbsurdHook(analysis, cleanText) },
    { name: "time_compression", fn: () => makeTimeCompressionHook(analysis, cleanText) },
    { name: "proof", fn: () => makeProofHook(analysis, cleanText) },
    { name: "vulnerability", fn: () => makeVulnerabilityHook(analysis, cleanText) },
    { name: "reverse_engineered", fn: () => makeReverseEngineeredHook(analysis, cleanText) },
    { name: "launch", fn: () => makeLaunchHook(analysis, cleanText) },
    { name: "generic_weak", fn: () => makeGenericWeakHook(analysis, cleanText) },
  ];

  for (const gen of hookGenerators) {
    try {
      const hook = gen.fn();
      if (!hook || hook.length < 3 || hook.length > 120) continue;
      // Skip duplicate hooks
      if (candidates.some((c) => c.hook === hook)) continue;

      const body = buildBody(analysis, cleanText, hook);
      if (!body || body.length < 10) continue;

      const fullPost = `${hook}\n\n${body}`;
      // Verify facts are preserved
      if (!verifyFacts(fullPost, analysis)) continue;

      const score = scorePost(fullPost);
      candidates.push({
        hook,
        body,
        fullPost,
        score: score.score,
        grade: score.grade,
        angle: gen.name,
        changes: [`smart rewrite via ${gen.name} hook angle`],
        linkReply: links.length ? links[0] : null,
      });
    } catch {}
  }

  // ── Hook Library candidates ──
  // Generate hooks from the 100-framework library (sourced from open-source projects)
  const libraryHooks = generateHooks(cleanText, analysis);
  for (const libHook of libraryHooks.slice(0, 15)) { // top 15 by virality ceiling
    try {
      const hook = libHook.hook;
      if (!hook || hook.length < 5 || hook.length > 120) continue;
      if (candidates.some((c) => c.hook === hook)) continue;

      const body = buildBody(analysis, cleanText, hook);
      if (!body || body.length < 10) continue;

      const fullPost = `${hook}\n\n${body}`;
      if (!verifyFacts(fullPost, analysis)) continue;

      const score = scorePost(fullPost);
      candidates.push({
        hook,
        body,
        fullPost,
        score: score.score,
        grade: score.grade,
        angle: `library_${libHook.category}`,
        changes: [`smart rewrite via ${libHook.category} hook library (${libHook.id})`],
        linkReply: links.length ? links[0] : null,
      });
    } catch {}
  }

  // Also generate a "polished original" candidate — keep the original
  // structure but fix weaknesses (strip links, add breaks, fix opener)
  {
    let polished = cleanText;
    const changes = [];

    // Kill weak opener if present
    const weakOpenerPatterns = [
      /^(excited|thrilled|happy|proud|honored|delighted)[^.]*\.\s*/i,
      /^(the new year)[^.]*\.\s*/i,
      /^(here are|here is|here'?s a)[^.]*\.\s*/i,
      /^(so (today|this week))[^.]*\.\s*/i,
    ];
    for (const pat of weakOpenerPatterns) {
      if (pat.test(polished)) {
        polished = polished.replace(pat, "");
        changes.push("removed weak opener");
        break;
      }
    }

    // Add line breaks if wall of text
    if (!polished.includes("\n") && polished.length > 100) {
      const sentences = polished.split(/(?<=[.!?])\s+/);
      polished = sentences.join("\n\n");
      changes.push("added line breaks");
    }

    // Add reply trigger if missing
    if (!/\?/.test(polished) && !/\b(reply|comment|agree|your take)\b/i.test(polished)) {
      polished = polished + "\n\nAgree or disagree?";
      changes.push("added reply trigger");
    }

    if (polished !== text) {
      const score = scorePost(polished);
      candidates.push({
        hook: polished.split("\n")[0].trim(),
        body: polished.split("\n").slice(1).join("\n").trim(),
        fullPost: polished,
        score: score.score,
        grade: score.grade,
        angle: "polished_original",
        changes: changes.length ? changes : ["polished original"],
        linkReply: links.length ? links[0] : null,
      });
    }
  }

  // Sort by score
  candidates.sort((a, b) => b.score - a.score);
  return { analysis, candidates };
}

// ---------------------------------------------------------------------------
// Fact verification — make sure no facts were lost or corrupted
// ---------------------------------------------------------------------------
function verifyFacts(post, analysis) {
  const facts = analysis.mustPreserve;

  // Money must be preserved
  for (const m of facts.money) {
    if (!post.includes(m)) return false;
  }
  // Percentages must be preserved
  for (const p of facts.percents) {
    if (!post.includes(p)) return false;
  }
  // Product names should be preserved (case-insensitive)
  for (const name of facts.productNames) {
    if (!post.toLowerCase().includes(name.toLowerCase())) return false;
  }

  // Check for corruption: "$X!" without context, "/month" without money, "$$"
  if (/\$\$/.test(post)) return false;
  if (/\/month/.test(post) && !/\$\d/.test(post)) return false;
  if (/\$\d+[!]/.test(post) && !/month|mo|k|m\b/i.test(post)) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Main rewrite function
// ---------------------------------------------------------------------------
function smartRewrite(text, targetScore = 85, maxIterations = 3) {
  const { analysis, candidates } = generateCandidates(text);

  if (!candidates.length) {
    // Fallback: return original with minor fixes
    return {
      final: text,
      finalScore: scorePost(text).score,
      finalGrade: scorePost(text).grade,
      originalScore: scorePost(text).score,
      originalGrade: scorePost(text).grade,
      iterations: [{ iteration: 0, score: scorePost(text).score, grade: scorePost(text).grade, changes: ["no candidates generated"], candidate: text }],
      analysis,
      candidates: [],
      linkReply: null,
    };
  }

  // Pick the best candidate
  let best = candidates[0];
  const iterations = [{
    iteration: 0,
    score: best.score,
    grade: best.grade,
    changes: best.changes,
    candidate: best.fullPost,
  }];

  // Iterate: try to improve the best candidate
  for (let i = 1; i < maxIterations; i++) {
    if (best.score >= targetScore) break;

    // Re-analyze the current best and try to improve it
    const reAnalyzed = analyze(best.fullPost);
    const reCandidates = generateCandidates(best.fullPost);

    // Find a candidate that scores higher
    const better = reCandidates.candidates.find((c) => c.score > best.score && verifyFacts(c.fullPost, reAnalyzed));
    if (better) {
      best = better;
      iterations.push({
        iteration: i,
        score: best.score,
        grade: best.grade,
        changes: best.changes,
        candidate: best.fullPost,
      });
    } else {
      break;
    }
  }

  return {
    final: best.fullPost,
    finalScore: best.score,
    finalGrade: best.grade,
    originalScore: scorePost(text).score,
    originalGrade: scorePost(text).grade,
    iterations,
    analysis,
    candidates: candidates.slice(0, 5), // top 5 for transparency
    linkReply: best.linkReply,
  };
}

module.exports = { smartRewrite, generateCandidates, analyze, verifyFacts };
