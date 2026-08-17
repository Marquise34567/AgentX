const { getInstance } = require("./mlGenerator");

console.log("Training...");
const ml = getInstance();
ml.train();
console.log("Trained. Stats:", ml.stats());

// Try generating one tweet
console.log("\nGenerating one tweet with seed 'i built'...");
const tweet = ml.model.generate("i built", 280, 1.0, "saas");
console.log("Generated:", JSON.stringify(tweet));
console.log("Length:", tweet.length);
