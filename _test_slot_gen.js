const { getInstance } = require("./slotGenerator");

const ml = getInstance();
const stats = ml.train();
console.log("Training:", stats);
console.log("");

const tweets = ml.generate("saas", 8);
console.log(`Generated ${tweets.length} tweets:`);
for (const t of tweets) {
  console.log(`  [${t.length} chars] ${t.slice(0, 60)}...`);
}
