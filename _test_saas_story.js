const { sprint } = require("./sprinter");

const r = sprint("saas founder story", { count: 6 });
console.log(`TOPIC: "saas founder story"\n`);
for (let i = 0; i < r.posts.length; i++) {
  const p = r.posts[i];
  console.log(`\n--- Variation ${i+1} [${p.grade}] Score: ${p.score} (type: ${p.archetype}) ---`);
  console.log(p.post);
}
