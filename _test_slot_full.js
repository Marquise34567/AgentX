const { getInstance } = require("./slotGenerator");
const { scorePost } = require("./engagementAlgo");

const ml = getInstance();
ml.train();

// Generate and show full stories specifically
console.log("=== FULL STORIES ===\n");
for (let i = 0; i < 8; i++) {
  const useFirst = i % 2 === 0;
  const { fullStory } = ml.generateStory("saas", useFirst, 1.0);
  const score = scorePost(fullStory);
  console.log(`[${score.grade}] ${score.score}:`);
  console.log(fullStory);
  console.log(`\n${"─".repeat(60)}\n`);
}
