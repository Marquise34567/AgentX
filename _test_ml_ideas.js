const { sprint } = require("./sprinter");

// Test with ideas the user cares about — SaaS, AutoEditor, and random viral-style ideas
const tests = [
  // AutoEditor ideas
  "autoeditor saves me 4 hours per video and my watchtime went up 2x across 10 videos",
  "i built autoeditor an autonomous video editor that boosts watchtime and saves you hours of editing",
  "autoeditor made my watchtime go up 2x",
  
  // SaaS ideas
  "my SaaS hit $10k MRR in 3 months",
  "i spent 18 months building the wrong product and then deleted 80% of it and MRR went up 3x",
  "building a SaaS",
  "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months",
  
  // Viral-style ideas (based on the real tweets the user showed me)
  "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time",
  "Notion is overrated",
  "AI is going to replace junior developers",
  "the problem with most startups is they dont talk to users enough",
  "i cut $456k/year in costs this month and improved my profit margins from 67% to 87%",
  
  // Random ideas
  "i tracked my time for 30 days and here's what I found",
  "most fitness advice is garbage",
  "remote work is bad for your career",
  "the stock market is rigged",
  "getting fit",
  "growing on X",
  "productivity",
];

console.log("=== TESTING CURRENT SYSTEM ===\n");
console.log("Testing with SaaS, AutoEditor, and viral-style ideas\n");

const results = [];
for (const t of tests) {
  try {
    const r = sprint(t);
    const p = r.posts[0];
    results.push({ input: t, grade: p.grade, score: p.score, post: p.post, realScore: p.realScore });
  } catch (e) {
    results.push({ input: t, grade: "ERROR", score: 0, post: e.message, realScore: 0 });
  }
}

// Print all results
for (const r of results) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`INPUT: "${r.input}"`);
  console.log(`GRADE: ${r.grade} | SCORE: ${r.score} | REAL: ${r.realScore}`);
  console.log(`POST:`);
  console.log(r.post);
  console.log(`${"=".repeat(70)}`);
}

// Stats
const aPosts = results.filter(r => r.grade.startsWith("A"));
const bPlusPosts = results.filter(r => r.grade === "B+");
const bPosts = results.filter(r => r.grade === "B");
const cPlusPosts = results.filter(r => r.grade === "C+");
const belowC = results.filter(r => !["A+","A","B+","B","C+"].includes(r.grade));

console.log(`\n\n=== STATS ===`);
console.log(`A/A+: ${aPosts.length}`);
console.log(`B+: ${bPlusPosts.length}`);
console.log(`B: ${bPosts.length}`);
console.log(`C+: ${cPlusPosts.length}`);
console.log(`Below C+: ${belowC.length}`);
console.log(`Total: ${results.length}`);
const bOrHigher = aPosts.length + bPlusPosts.length + bPosts.length;
console.log(`B or higher: ${bOrHigher}/${results.length} (${Math.round(bOrHigher/results.length*100)}%)`);

// Show the best and worst
console.log(`\n\n=== BEST POSTS ===`);
results.sort((a,b) => b.score - a.score);
for (let i = 0; i < Math.min(5, results.length); i++) {
  const r = results[i];
  console.log(`\n#${i+1} [${r.grade}] Score: ${r.score}`);
  console.log(`Input: "${r.input}"`);
  console.log(`Post: ${r.post}`);
}

console.log(`\n\n=== WORST POSTS ===`);
for (let i = Math.max(0, results.length - 5); i < results.length; i++) {
  const r = results[i];
  console.log(`\n#${i+1} [${r.grade}] Score: ${r.score}`);
  console.log(`Input: "${r.input}"`);
  console.log(`Post: ${r.post}`);
}

// Check for formulaic patterns
console.log(`\n\n=== FORMULAIC PATTERN CHECK ===`);
const ctaCount = results.filter(r => /what's your version|what's the part|where am I wrong|change my mind|what would you add|does this match/.test(r.post)).length;
const shareCueCount = results.filter(r => /save this|send this|bookmark this|screenshot this|pass this/.test(r.post)).length;
const nobodyCount = results.filter(r => /nobody wants to hear this|nobody talks about/.test(r.post)).length;
const casualCount = results.filter(r => {
  const firstChar = r.post.charAt(0);
  return firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase();
}).length;

console.log(`Posts with generic CTA: ${ctaCount}/${results.length} (${Math.round(ctaCount/results.length*100)}%)`);
console.log(`Posts with share cue: ${shareCueCount}/${results.length} (${Math.round(shareCueCount/results.length*100)}%)`);
console.log(`Posts with "nobody wants to hear this": ${nobodyCount}/${results.length} (${Math.round(nobodyCount/results.length*100)}%)`);
console.log(`Posts starting lowercase (casual): ${casualCount}/${results.length} (${Math.round(casualCount/results.length*100)}%)`);
