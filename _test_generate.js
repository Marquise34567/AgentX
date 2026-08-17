const { sprint } = require("./sprinter");

// Test: can the system GENERATE casual tweets from just a topic?
// (Not just echo back user-written tweets)
const topics = [
  "SaaS",
  "Notion",
  "productivity apps",
  "startup fundraising",
  "indie hacking",
  "AI tools",
  "coding",
  "remote work",
];

for (const t of topics) {
  const r = sprint(t);
  const p = r.posts[0];
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOPIC: "${t}"`);
  console.log(`GRADE: ${p.grade} | SCORE: ${p.score}`);
  console.log(`POST:\n${p.post}`);
}
