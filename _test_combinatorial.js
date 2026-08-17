const { generateStories } = require("./storyGenerator");
const { scorePost } = require("./engagementAlgo");

const stories = generateStories("saas", 20);
console.log(`=== ${stories.length} GENERATED STORIES ===\n`);

for (const s of stories) {
  const score = scorePost(s);
  console.log(`[${score.grade}] ${score.score}: ${s.replace(/\n/g, " | ")}`);
}
