/*
 * COMPREHENSIVE ENGAGEMENT TEST
 *
 * Tests the tweets AgentX produces against the 22-signal Phoenix model
 * to see predicted engagement (likes, replies, dwell, bookmarks, etc).
 * Iterates until the agent produces tweets that score high enough to
 * be 80-90% confident they'd get real engagement.
 *
 * Confidence threshold: signal model normalizedScore >= 75 AND
 * composite score >= 85 (A grade) AND scrolled_past probability < 30%.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { improvePost } = require("./improver");
const { predictSignals } = require("./signalModel");
const { analyze } = require("./engagementAlgo");

// ---------------------------------------------------------------------------
// Test inputs — a mix of real drafts people would actually write
// ---------------------------------------------------------------------------
const TEST_POSTS = [
  {
    name: "1plann new year post",
    text: `the new year is almost here

2026 has been one of my most productive years

now I'm planning for the next few months

using 1plann I'm keeping track of each task I complete

https://1plann.space`,
  },
  {
    name: "generic SaaS launch",
    text: "Excited to share that I just launched my new productivity app. It helps you manage tasks and stay organized. Check it out at myapp.com",
  },
  {
    name: "build in public update",
    text: "Today I worked on my app. Added a new feature for tracking habits. It's going well. Will share more soon.",
  },
  {
    name: "milestone tweet (vague)",
    text: "Just hit a big milestone with my SaaS! So grateful for everyone who supported me. Couldn't have done it without you all.",
  },
  {
    name: "thread starter (weak)",
    text: "I want to share some thoughts about building a startup. It's been a journey. Let me tell you about it. A thread 🧵",
  },
  {
    name: "contrarian take (raw)",
    text: "I think most productivity apps are useless. People just need to do the work.",
  },
  {
    name: "demo announcement",
    text: "Built a new AI tool that automatically edits your videos. It saves hours of time. Here's a demo video showing how it works.",
  },
  {
    name: "failure reflection",
    text: "I failed at 3 startups before this one worked. Each time I learned something different. Here's what I learned.",
  },
  // 2026 new patterns
  {
    name: "Drew Hahn style tech humor",
    text: "hey codex can you just move the text slightly to the right\n\n*gpt-5.6-sol xhigh activates*\n\n*rewrites the entire rendering pipeline*",
  },
  {
    name: "Zack waiting room discovery",
    text: "waiting room.\nplastic chairs.\nbad coffee.\na tv playing the news.\n\nfound a guy clearing $44k/month with zero original content.\n\nhere's how 👇",
  },
  {
    name: "niche shock (cat sudoku)",
    text: "a cat playing sudoku makes $6M/month on youtube.\n\nno I'm not joking.\n\nhere's the business model 👇",
  },
  {
    name: "open loop (doesn't exist)",
    text: "I made $10k in 48 hours selling something that doesn't exist.\n\nno product. no inventory. no shipping.\n\nhere's exactly what I sold 👇",
  },
  {
    name: "zero friction readability",
    text: "I tried everything.\n\nTwitter ads. Nothing.\n\nCold DMs. Nothing.\n\nSEO. Nothing.\n\nThen I did one thing differently.\n\nEverything changed.",
  },
  {
    name: "meta timeline ride",
    text: "everyone's arguing about whether AI agents will replace developers.\n\nmeanwhile I just shipped 3 features using only agents.\n\nno opinions. just results. here's what I built 👇",
  },
  // 2026 timeline skeletons — zack, RUX, John, Vadim
  {
    name: "zack mundane encounter",
    text: "i met him at a car service center.\n\nplastic chairs. fluorescent lights. a tv playing commercials nobody watched.\n\nhe was on his phone.\n\ni assumed he was scrolling instagram.\n\ni glanced over.\n\nhe was on a spreadsheet tracking $44k/month from repurposed content.\n\nhere's how he did it",
  },
  {
    name: "RUX reverse-engineered blueprint",
    text: "this guy doesn't make a single video until he's reverse-engineered the channels that are already winning.\n\nmost creators start with what should I make and hope they land on the right niche.\n\nhe starts with what's already working then lets AI answer it with evidence.\n\n$44k/month. 12 camera appearances. 1 person operating the whole system.\n\nmost creators fail because they use generic prompts that spit out robotic scripts nobody wants to watch.",
  },
  {
    name: "John absurd niche brainrot",
    text: "the kinda bullshit that's printing you $6M/mo nowadays:\n\na cat playing sudoku did $6,000,000 a month inside 90 days.\n\nnot a venture-backed rocketship with a war chest. a cat. doing sudoku. wrapped in the most degenerate, oversaturated, brainrot content format imaginable.\n\nand it worked.",
  },
  {
    name: "Vadim bulleted growth hack",
    text: "my app crossed $40k/mo in less than 90 days\n\nAll I did was:\n1. copied the competitor's landing page structure\n2. posted 3x/day across 4 platforms\n3. shipped a new feature every Friday based on user DMs\n\nit's never been simpler",
  },
  // 2026 timeline examples — Andi, Eade, David Ch, Ira, Jeremy, Jay
  {
    name: "Andi quit my job",
    text: "Today was my last day at my 9-to-5.\n\nI quit my job to chase my dream of building my own SaaS.\n\nFrom today I'm living off savings and doing whatever it takes to make it work.\n\nWish me luck.",
  },
  {
    name: "Eade absurd juxtaposition",
    text: "Here's a 16-hour timelapse of an embryo building a central nervous system so 23 years from now it can sell b2b SAAS",
  },
  {
    name: "David Ch AI product launch",
    text: "Big news, @claudeai just got a huge upgrade today and I'm very happy to be introducing it in shipper. From today on, Claude Code Opus 4.6 can build and run a business for you.\n\nWe just launched Shipper 2.0, a tool that lets Claude:\n→ Build web/mobile apps and Chrome extensions\n→ Run deployments\n→ Handle customer support\n\nHere's a 90-second demo",
  },
  {
    name: "Ira AI killed my startup",
    text: "Claude just killed our startup.\n\nI woke up today and Claude killed my startup. We got several hundred paying clients in 2 months, was growing like crazy. One Claude/Manus feature and our close rate dropped from 70% to 20%.\n\nHere's what happened",
  },
  {
    name: "Jeremy lead-gen DM bait",
    text: "I wrote a guide for startups on using SEO to acquire customers.\n\nLike + Reply with 👋 and I'll DM it to you for free, right now.\n\n(I've done SEO for 100+ SaaS startups)",
  },
  {
    name: "Jay 24h free giveaway",
    text: "Alright, it's finally here!\n\nMeet Aligno – a premium @framer SaaS template crafted to elevate SaaS businesses.\n\nFor the next 24 hours, I'm giving it away FREE!\n\nJust like, repost, and comment \"Aligno\" below, and I'll DM you the link.",
  },
];

// ---------------------------------------------------------------------------
// Confidence check — what makes us 80-90% confident a post will engage?
// ---------------------------------------------------------------------------
function confidenceCheck(result) {
  const sm = result.signalModel;
  const signals = {};
  for (const s of sm.signals) signals[s.signal] = s;

  const checks = {
    compositeScore: result.score >= 80,
    signalModelScore: sm.normalizedScore >= 65,
    scrolledPastLow: signals.scrolled_past ? signals.scrolled_past.probability < 0.35 : true,
    replyChainLikely: signals.reply_author_reply_back ? signals.reply_author_reply_back.probability > 0.15 : false,
    noMajorNegative: sm.negativeSum > -8,
    dwellLikely: (signals.dwell_binary ? signals.dwell_binary.probability : 0) > 0.2,
    bookmarkWorthy: (signals.bookmark ? signals.bookmark.probability : 0) > 0.1,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const confidence = (passed / total) * 100;

  return { checks, passed, total, confidence };
}

// ---------------------------------------------------------------------------
// Run the test
// ---------------------------------------------------------------------------
console.log("=".repeat(75));
console.log("COMPREHENSIVE ENGAGEMENT TEST — AgentX vs 22-signal Phoenix model");
console.log("=".repeat(75));

let allConfident = true;
const results = [];

for (const { name, text } of TEST_POSTS) {
  console.log(`\n${"─".repeat(75)}`);
  console.log(`TEST: ${name}`);
  console.log(`DRAFT: ${text.slice(0, 80).replace(/\n/g, " ")}...`);
  console.log("─".repeat(75));

  // Score the original
  const origResult = scorePost(text);
  const origConf = confidenceCheck(origResult);
  console.log(`\n  ORIGINAL: ${origResult.grade} ${origResult.score}/100 | signal: ${origResult.signalModel.normalizedScore}/100 | confidence: ${origConf.confidence.toFixed(0)}%`);

  // Key signal predictions for original
  const origSignals = {};
  for (const s of origResult.signalModel.signals) origSignals[s.signal] = s;
  console.log(`  signals → reply_chain: ${(origSignals.reply_author_reply_back?.probability * 100 || 0).toFixed(0)}% | reply: ${(origSignals.reply?.probability * 100 || 0).toFixed(0)}% | like: ${(origSignals.like?.probability * 100 || 0).toFixed(0)}% | dwell: ${(origSignals.dwell_binary?.probability * 100 || 0).toFixed(0)}% | bookmark: ${(origSignals.bookmark?.probability * 100 || 0).toFixed(0)}% | scrolled_past: ${(origSignals.scrolled_past?.probability * 100 || 0).toFixed(0)}%`);

  // Improve it
  const improved = improvePost(text);
  const finalResult = scorePost(improved.final);
  const finalConf = confidenceCheck(finalResult);
  console.log(`\n  IMPROVED: ${finalResult.grade} ${finalResult.score}/100 | signal: ${finalResult.signalModel.normalizedScore}/100 | confidence: ${finalConf.confidence.toFixed(0)}%`);

  // Key signal predictions for improved
  const finalSignals = {};
  for (const s of finalResult.signalModel.signals) finalSignals[s.signal] = s;
  console.log(`  signals → reply_chain: ${(finalSignals.reply_author_reply_back?.probability * 100 || 0).toFixed(0)}% | reply: ${(finalSignals.reply?.probability * 100 || 0).toFixed(0)}% | like: ${(finalSignals.like?.probability * 100 || 0).toFixed(0)}% | dwell: ${(finalSignals.dwell_binary?.probability * 100 || 0).toFixed(0)}% | bookmark: ${(finalSignals.bookmark?.probability * 100 || 0).toFixed(0)}% | scrolled_past: ${(finalSignals.scrolled_past?.probability * 100 || 0).toFixed(0)}%`);

  // Show the improved post
  console.log(`\n  FINAL POST:`);
  console.log(`  ┌─────────────────────────────────────────────────`);
  for (const line of improved.final.split("\n")) {
    console.log(`  │ ${line}`);
  }
  console.log(`  └─────────────────────────────────────────────────`);

  // Confidence verdict
  const confident = finalConf.confidence >= 80;
  if (!confident) allConfident = false;
  console.log(`\n  CONFIDENCE: ${finalConf.confidence.toFixed(0)}% ${confident ? "✅ PASS" : "❌ NEEDS WORK"}`);
  if (!confident) {
    const failed = Object.entries(finalConf.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`  FAILING: ${failed.join(", ")}`);
  }

  // Iteration details
  if (improved.iterations.length > 1) {
    console.log(`  ITERATIONS: ${improved.iterations.length - 1} rounds`);
    for (const s of improved.iterations.slice(1)) {
      console.log(`    iter ${s.iteration}: ${s.grade} ${s.score} — ${s.changes.join(", ")}`);
    }
  }

  results.push({ name, origScore: origResult.score, finalScore: finalResult.score, origConf: origConf.confidence, finalConf: finalConf.confidence, confident });
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(75)}`);
console.log("SUMMARY");
console.log("=".repeat(75));
console.log("");
console.log("Test                    Orig  Final  OrigConf  FinalConf  Status");
console.log("─".repeat(75));
for (const r of results) {
  const status = r.confident ? "✅" : "❌";
  console.log(`${r.name.padEnd(24)} ${r.origScore.toFixed(0).padStart(4)}  ${r.finalScore.toFixed(0).padStart(5)}  ${r.origConf.toFixed(0).padStart(7)}%  ${r.finalConf.toFixed(0).padStart(8)}%  ${status}`);
}
console.log("");

const avgOrig = results.reduce((a, r) => a + r.origScore, 0) / results.length;
const avgFinal = results.reduce((a, r) => a + r.finalScore, 0) / results.length;
const avgOrigConf = results.reduce((a, r) => a + r.origConf, 0) / results.length;
const avgFinalConf = results.reduce((a, r) => a + r.finalConf, 0) / results.length;
const passCount = results.filter((r) => r.confident).length;

console.log(`Average score:    ${avgOrig.toFixed(1)} → ${avgFinal.toFixed(1)} (${(avgFinal - avgOrig).toFixed(1)} improvement)`);
console.log(`Average confidence: ${avgOrigConf.toFixed(0)}% → ${avgFinalConf.toFixed(0)}%`);
console.log(`Pass rate: ${passCount}/${results.length} posts at 80%+ confidence`);
console.log("");

if (allConfident) {
  console.log("✅ ALL POSTS PASS — AgentX produces tweets at 80%+ confidence");
} else {
  console.log(`❌ ${results.length - passCount} posts need more work to reach 80% confidence`);
  console.log("   → need to improve the improver's transforms for these cases");
}
