const { getInstance } = require("./mlGenerator");
const { scorePost } = require("./engagementAlgo");

console.log("Training ML model...\n");
const ml = getInstance();
const stats = ml.train();
console.log("Training complete:", stats.stats);
console.log("Training examples:", stats.referenceCount + stats.generatedCount);
console.log("");

// Generate tweets for different seeds
const seeds = ["i built", "2 unemployed", "i raised", "i spent", "nobody talks about", "i know", "the most annoying", "every"];

console.log("=== ML-GENERATED TWEETS ===\n");
let count = 0;
const seen = new Set();

for (const seed of seeds) {
  for (let t = 0.8; t <= 1.4; t += 0.2) {
    for (let i = 0; i < 3; i++) {
      const tweet = ml.model.generate(seed, 280, t, "saas");
      const cleaned = ml.cleanup(tweet);
      
      // Skip if too short or duplicate
      if (cleaned.length < 40) continue;
      const key = cleaned.slice(0, 40).toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      
      // Skip if too similar to training
      if (ml.isTooSimilarToTraining(cleaned)) continue;
      
      const score = scorePost(cleaned);
      if (score.score >= 70) {
        console.log(`[${score.grade}] ${score.score} (seed: "${seed}", temp: ${t.toFixed(1)}):`);
        console.log(cleaned);
        console.log(`\n${"─".repeat(60)}\n`);
        count++;
        if (count >= 15) break;
      }
    }
    if (count >= 15) break;
  }
  if (count >= 15) break;
}

console.log(`\nTotal ML-generated tweets scoring 70+: ${count}`);
