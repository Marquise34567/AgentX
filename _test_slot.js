const { getInstance } = require("./slotGenerator");
const { scorePost } = require("./engagementAlgo");

console.log("Training slot model...\n");
const ml = getInstance();
const stats = ml.train();
console.log("Training complete:", stats);
console.log("");

// Generate stories for SaaS
console.log("=== SLOT-GENERATED STORIES for SaaS ===\n");
const stories = ml.generate("saas", 12);

for (const story of stories) {
  const score = scorePost(story);
  console.log(`[${score.grade}] ${score.score}:`);
  console.log(story);
  console.log(`\n${"─".repeat(60)}\n`);
}
