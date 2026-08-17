const { generateFounderStories, generateFounderStoryHooks } = require("./founderStoryGenerator");
const { scorePost } = require("./engagementAlgo");

const fullStories = generateFounderStories("saas");
const hooks = generateFounderStoryHooks("saas");

console.log("=== FULL STORIES ===\n");
for (const s of fullStories) {
  const score = scorePost(s);
  console.log(`[${score.grade}] ${score.score}: ${s.split("\n")[0]}`);
}

console.log("\n=== HOOKS ONLY ===\n");
for (const h of hooks) {
  const score = scorePost(h);
  console.log(`[${score.grade}] ${score.score}: ${h}`);
}
