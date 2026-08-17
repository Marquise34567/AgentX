const { getInstance } = require("./slotGenerator");
const { scorePost } = require("./engagementAlgo");

const ml = getInstance();
ml.train();

// Generate 8 full stories and score them
const stories = ml.generate("saas", 8);
console.log(`Generated ${stories.length} stories:\n`);

const scored = stories.map(s => ({ story: s, score: scorePost(s) }));
scored.sort((a, b) => b.score.score - a.score.score);

for (const { story, score } of scored) {
  console.log(`[${score.grade}] ${score.score}:`);
  console.log(story);
  console.log(`\n${"─".repeat(60)}\n`);
}
