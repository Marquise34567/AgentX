/*
 * Comprehensive test — different niches, input types, and formats.
 * Tests whether the system can produce B+ grade posts across the board.
 */

const { sprint } = require("./sprinter");
const { scorePost } = require("./engagementAlgo");
const { check } = require("./qualityChecker");

const tests = [
  // --- SHORT TOPICS (should pull from insight database) ---
  { input: "building a SaaS", category: "topic", niche: "saas" },
  { input: "getting fit", category: "topic", niche: "fitness" },
  { input: "learning to code", category: "topic", niche: "coding" },
  { input: "investing in crypto", category: "topic", niche: "money" },
  { input: "growing on X", category: "topic", niche: "content" },
  { input: "productivity", category: "topic", niche: "productivity" },
  { input: "web design", category: "topic", niche: "design" },
  { input: "career advice", category: "topic", niche: "career" },

  // --- FULL IDEAS (should use the idea directly) ---
  { input: "most founders waste time building features nobody asks for", category: "idea", niche: "saas" },
  { input: "AI is going to replace junior developers", category: "idea", niche: "ai" },
  { input: "remote work is bad for your career", category: "idea", niche: "career" },
  { input: "most fitness advice is garbage", category: "idea", niche: "fitness" },
  { input: "the stock market is rigged", category: "idea", niche: "money" },
  { input: "Notion is overrated", category: "idea", niche: "productivity" },

  // --- QUESTIONS (should flip into contrarian claims) ---
  { input: "why do most newsletters fail?", category: "question", niche: "content" },
  { input: "how do I grow on X?", category: "question", niche: "content" },
  { input: "should I quit my job to start a business?", category: "question", niche: "career" },
  { input: "is AI going to replace writers?", category: "question", niche: "ai" },

  // --- STORIES (should use the story directly) ---
  { input: "I spent 18 months building the wrong product and then deleted 80% of it and MRR went up 3x", category: "story", niche: "saas" },
  { input: "I worked out 5x a week for a year and gained 2lbs of muscle then I fixed my sleep and gained 8lbs in 3 months", category: "story", niche: "fitness" },
  { input: "I tried day trading for 6 months and made $340 while I would have made $4000 just buying and holding", category: "story", niche: "money" },
  { input: "I job-hopped 4 times in 3 years and my salary went up 120%", category: "story", niche: "career" },

  // --- PRODUCT CLAIMS (should add proof or reframe) ---
  { input: "autoeditor made my watchtime go up 2x", category: "product", niche: "ai" },
  { input: "autoeditor saves me 4 hours per video and my watchtime went up 2x across 10 videos", category: "product", niche: "ai" },
  { input: "my SaaS hit $10k MRR in 3 months", category: "product", niche: "saas" },
  { input: "my newsletter grew to 10k subscribers in 6 months", category: "product", niche: "content" },

  // --- VAGUE IDEAS (should clean up and expand) ---
  { input: "i want to post about how I quit my job to go indie", category: "vague", niche: "career" },
  { input: "i think the problem with most startups is they dont talk to users enough", category: "vague", niche: "saas" },
  { input: "fitness is all about consistency", category: "vague", niche: "fitness" },

  // --- DIFFERENT FORMATS ---
  { input: "5 things I learned building a SaaS", category: "listicle", niche: "saas" },
  { input: "the truth about AI content", category: "contrarian", niche: "ai" },
  { input: "I tracked my time for 30 days and here's what I found", category: "data", niche: "productivity" },
];

let passCount = 0;
let failCount = 0;
let bOrHigher = 0;
const failures = [];
const weakNiches = {};
const weakCategories = {};

console.log("=== COMPREHENSIVE TEST ===");
console.log(`Testing ${tests.length} inputs across niches and formats`);
console.log();

for (const test of tests) {
  try {
    const r = sprint(test.input);
    const p = r.posts[0];

    if (!p) {
      console.log(`[FAIL] ${test.input.slice(0, 50)}`);
      console.log("  No post generated!");
      failCount++;
      failures.push({ ...test, reason: "no post" });
      continue;
    }

    const passed = p.grade.startsWith("A") || p.grade.startsWith("B");
    const status = passed ? "PASS" : "FAIL";
    if (passed) {
      passCount++;
      bOrHigher++;
    } else {
      failCount++;
      failures.push({ ...test, grade: p.grade, score: p.score, post: p.post, reason: p.assessment?.failures?.map(f => f.type) || [] });
      weakNiches[test.niche] = (weakNiches[test.niche] || 0) + 1;
      weakCategories[test.category] = (weakCategories[test.category] || 0) + 1;
    }

    console.log(`[${status}] [${p.grade}] ${test.input.slice(0, 55)}`);
    console.log(`  score: ${p.score} | quality: ${p.qualityScore}/100 | iters: ${p.iterationCount}`);
    console.log(`  ${p.post.split("\n").slice(0, 2).join(" ").slice(0, 100)}`);
    console.log();
  } catch (e) {
    console.log(`[ERROR] ${test.input.slice(0, 50)}`);
    console.log(`  ${e.message}`);
    failCount++;
    failures.push({ ...test, reason: e.message });
    console.log();
  }
}

console.log("=== SUMMARY ===");
console.log(`Total: ${tests.length}`);
console.log(`B or higher: ${bOrHigher} (${Math.round(bOrHigher / tests.length * 100)}%)`);
console.log(`Below B: ${failCount} (${Math.round(failCount / tests.length * 100)}%)`);
console.log();

if (Object.keys(weakNiches).length) {
  console.log("WEAK NICHES (most failures):");
  for (const [niche, count] of Object.entries(weakNiches).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${niche}: ${count} failures`);
  }
  console.log();
}

if (Object.keys(weakCategories).length) {
  console.log("WEAK CATEGORIES (most failures):");
  for (const [cat, count] of Object.entries(weakCategories).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count} failures`);
  }
  console.log();
}

if (failures.length) {
  console.log("=== FAILURES DETAIL ===");
  for (const f of failures) {
    console.log(`[${f.grade || "ERROR"}] ${f.input.slice(0, 60)}`);
    if (f.post) console.log(`  Post: ${f.post.split("\n").slice(0, 2).join(" ").slice(0, 100)}`);
    if (f.reason) console.log(`  Issues: ${Array.isArray(f.reason) ? f.reason.join(", ") : f.reason}`);
    console.log();
  }
}
