const { scorePost } = require("./engagementAlgo");

const story = `I built a customer feedback tool with no coding experience.

For 8 months I was cold DMing people and getting blocked.

Then I changed the pricing model.

Profitable in 30 days.

Here's the full breakdown 👇`;

const score = scorePost(story);
console.log(`[${score.grade}] ${score.score}`);
for (const b of score.breakdown) {
  console.log(`  ${b.dimension}: ${b.score} (w${b.weight}) — ${b.note}`);
}
