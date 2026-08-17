const { scorePost } = require("./engagementAlgo");

const stories = [
  "I built a SaaS in 7 days. It hit $1k MRR in month 1.\n\nNo, this isn't a 'build in public' flex.\n\nI had a problem. I solved it. I put it online. 3 people paid for it on day 1.\n\nThe '7 days' wasn't the build. It was the courage to ship something ugly.\n\nHere's what I built and how I got the first 10 users 👇",
  "I built a SaaS for a niche of 200 people. It makes $30k MRR.\n\nEveryone said the market was too small. 'You can't build a business on 200 people.'\n\n200 people × $150/month = $30k MRR.\n\nNo competition. No marketing. No SEO.\n\nThey all know each other. Word of mouth did the rest.",
  "I turned down $500k in funding. Best decision I ever made.\n\nEveryone told me to take the money. 'You'd be stupid not to.'\n\nInstead I kept my day job, built on weekends, and charged from day 1.\n\n12 months later: $8k MRR, 100% mine, no investors to answer to.\n\nThe founder who took the $500k? He pivoted 3 times and has $0 MRR.",
];

for (const s of stories) {
  const score = scorePost(s);
  console.log(`\n[${score.grade}] ${score.score}: ${s.split("\n")[0]}`);
  for (const b of score.breakdown) {
    if (b.score < 80) console.log(`  LOW: ${b.dimension}: ${b.score} (w${b.weight}) — ${b.note}`);
  }
}
