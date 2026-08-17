const { sprint } = require("./sprinter");

const tests = ["SaaS", "AI tools", "coding", "Notion", "remote work"];

for (const t of tests) {
  const r = sprint(t, { count: 6 });
  console.log(`\n${"=".repeat(60)}`);
  console.log(`TOPIC: "${t}"`);
  for (let i = 0; i < r.posts.length; i++) {
    const p = r.posts[i];
    console.log(`\n--- #${i+1} [${p.grade}] Score: ${p.score} (type: ${p.archetype}) ---`);
    console.log(p.post);
  }
}
