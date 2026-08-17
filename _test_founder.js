const { generateFounderStories, generateFounderStoryHooks } = require("./founderStoryGenerator");
const { scorePost } = require("./engagementAlgo");

const stories = generateFounderStories("saas");
console.log(`=== ${stories.length} FULL FOUNDER STORIES ===\n`);

for (const s of stories) {
  const score = scorePost(s);
  console.log(`[${score.grade}] Score: ${score.score}`);
  console.log(s);
  console.log(`\n${"─".repeat(60)}\n`);
}
