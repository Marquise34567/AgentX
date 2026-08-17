const { sprint } = require("./sprinter");

// Test: generate 5 variations per idea, compare to real viral tweets
const ideas = [
  "SaaS",
  "Notion",
  "AI tools",
  "coding",
  "productivity",
  "remote work",
  "i built autoeditor an autonomous video editor that boosts watchtime and saves you hours of editing",
  "2 unemployed friends bootstrapped a SaaS and sold it for $10M+ in 18 months",
];

for (const idea of ideas) {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`IDEA: "${idea}"`);
  console.log(`${"=".repeat(70)}`);
  
  const r = sprint(idea, { count: 5 });
  
  for (let i = 0; i < r.posts.length; i++) {
    const p = r.posts[i];
    console.log(`\n--- Variation ${i+1} [${p.grade}] Score: ${p.score} ---`);
    console.log(p.post);
    console.log(`(type: ${p.archetype})`);
  }
}
