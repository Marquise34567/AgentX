const { scorePost } = require("./engagementAlgo");

const stories = [
  "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months.",
  "I built a SaaS nobody wanted. Then I deleted 80% of it. MRR went up 3x.",
  "I went from $0 to $79k MRR in 12 months. No SEO. No TikTok. No personal brand.",
  "I built a SaaS in 7 days. It hit $1k MRR in month 1.",
  "I had 3 paying customers. Then I raised prices 4x. I lost 2 of them.",
];

for (const s of stories) {
  const score = scorePost(s);
  console.log(`\n[${score.grade}] ${score.score}: ${s}`);
  for (const b of score.breakdown) {
    console.log(`  ${b.dimension}: ${b.score} (w${b.weight}) — ${b.note}`);
  }
}
