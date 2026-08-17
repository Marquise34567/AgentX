const { getInstance } = require("./slotGenerator");

try {
  const ml = getInstance();
  const stats = ml.train();
  console.log("Training OK:", stats.slotSizes);
  const tweets = ml.generate("saas founder story", "saas", 8);
  console.log(`Generated ${tweets.length} tweets`);
  for (const t of tweets) {
    console.log(`  [${t.length} chars] ${t.slice(0, 50)}...`);
  }
} catch (e) {
  console.error("ERROR:", e.message);
  console.error(e.stack);
}
