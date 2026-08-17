const { sprint } = require("./sprinter");

const tests = [
  "building a SaaS",
  "getting fit",
  "investing in crypto",
  "growing on X",
  "productivity",
  "web design",
  "career advice",
  "most founders waste time building features nobody asks for",
  "AI is going to replace junior developers",
  "remote work is bad for your career",
  "most fitness advice is garbage",
  "the stock market is rigged",
  "Notion is overrated",
  "why do most newsletters fail?",
  "how do I grow on X?",
  "should I quit my job to start a business?",
  "is AI going to replace writers?",
  "I spent 18 months building the wrong product and then deleted 80% of it and MRR went up 3x",
  "I worked out 5x a week for a year and gained 2lbs of muscle then I fixed my sleep and gained 8lbs in 3 months",
  "I tried day trading for 6 months and made $340 while I would have made $4000 just buying and holding",
  "I job-hopped 4 times in 3 years and my salary went up 120%",
  "autoeditor saves me 4 hours per video and my watchtime went up 2x across 10 videos",
  "my SaaS hit $10k MRR in 3 months",
  "my newsletter grew to 10k subscribers in 6 months",
  "i want to post about how I quit my job to go indie",
  "i think the problem with most startups is they dont talk to users enough",
  "fitness is all about consistency",
  "5 things I learned building a SaaS",
  "the truth about AI content",
  "I tracked my time for 30 days and here's what I found",
];

const results = [];

for (const t of tests) {
  const r = sprint(t);
  const p = r.posts[0];
  results.push({ input: t, grade: p.grade, score: p.score, post: p.post });
}

// Sort by score descending
results.sort((a, b) => b.score - a.score);

console.log("=== TOP 10 BEST POSTS ===\n");
for (let i = 0; i < Math.min(10, results.length); i++) {
  const r = results[i];
  console.log(`#${i + 1} [${r.grade}] Score: ${r.score}`);
  console.log(`Input: "${r.input}"`);
  console.log(`Post:`);
  console.log(r.post);
  console.log("\n" + "─".repeat(60) + "\n");
}

console.log("=== ALL POSTS BY GRADE ===\n");
const aPosts = results.filter(r => r.grade.startsWith("A"));
const bPlusPosts = results.filter(r => r.grade === "B+");
const bPosts = results.filter(r => r.grade === "B");
const cPlusPosts = results.filter(r => r.grade === "C+");

console.log(`A or A+: ${aPosts.length}`);
console.log(`B+: ${bPlusPosts.length}`);
console.log(`B: ${bPosts.length}`);
console.log(`C+: ${cPlusPosts.length}`);
console.log(`Total: ${results.length}`);
console.log(`B or higher: ${aPosts.length + bPlusPosts.length + bPosts.length} (${Math.round((aPosts.length + bPlusPosts.length + bPosts.length) / results.length * 100)}%)`);
