const { generateStories } = require("./storyGenerator");
const { scorePost } = require("./engagementAlgo");

const stories = generateStories("saas", 20);

// Show only full stories (ones with "For" in them = have struggle body)
const fullStories = stories.filter(s => s.includes("\nFor "));
const shortHooks = stories.filter(s => !s.includes("\nFor "));

console.log(`=== FULL STORIES (${fullStories.length}) ===\n`);
for (const s of fullStories.slice(0, 3)) {
  const score = scorePost(s);
  console.log(`[${score.grade}] ${score.score}:`);
  console.log(s);
  console.log(`\n${"─".repeat(60)}\n`);
}

console.log(`\n=== SHORT HOOKS (${shortHooks.length}) ===\n`);
for (const s of shortHooks.slice(0, 3)) {
  const score = scorePost(s);
  console.log(`[${score.grade}] ${score.score}:`);
  console.log(s);
  console.log(`\n${"─".repeat(60)}\n`);
}
