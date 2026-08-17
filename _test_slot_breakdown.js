const { getInstance } = require("./slotGenerator");
const { scorePost } = require("./engagementAlgo");

const ml = getInstance();
ml.train();

// Generate 5 full stories and show detailed breakdown
for (let i = 0; i < 5; i++) {
  const { fullStory } = ml.generateStory("saas", true, 1.0);
  const score = scorePost(fullStory);
  console.log(`\n[${score.grade}] ${score.score}:`);
  console.log(fullStory);
  console.log("\nBreakdown:");
  for (const d of score.breakdown) {
    if (d.score < 90) console.log(`  ${d.dimension}: ${d.score} (weight ${d.weight}) — ${d.note}`);
  }
  console.log(`${"─".repeat(60)}`);
}
