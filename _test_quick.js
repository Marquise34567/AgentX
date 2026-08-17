const { sprint } = require("./sprinter");

const tests = [
  "autoeditor saves me 4 hours per video and my watchtime went up 2x across 10 videos",
  "my SaaS hit $10k MRR in 3 months",
  "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months",
  "i cut $456k/year in costs this month and improved my profit margins from 67% to 87%",
  "i KNOW SaaS stands for software as a service but that will not stop me from reading it like a youtube poop every time",
  "Notion is overrated",
  "the problem with most startups is they dont talk to users enough",
  "i spent 18 months building the wrong product and then deleted 80% of it and MRR went up 3x",
];

for (const t of tests) {
  const r = sprint(t);
  const p = r.posts[0];
  console.log(`\n${"=".repeat(70)}`);
  console.log(`INPUT: "${t}"`);
  console.log(`GRADE: ${p.grade} | SCORE: ${p.score}`);
  console.log(`POST:\n${p.post}`);
}
