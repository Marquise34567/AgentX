const { getInstance } = require("./slotGenerator");
const { scorePost } = require("./engagementAlgo");

const ml = getInstance();
ml.train();

const { fullStory } = ml.generateStory("saas", true, 1.0);
console.log("STORY:");
console.log(fullStory);
console.log("\n--- SCORE BREAKDOWN ---");
const score = scorePost(fullStory);
console.log("Grade:", score.grade, "Score:", score.score);
console.log("Dimension score:", score.dimensionScore);
console.log("Breakdown:", JSON.stringify(score.breakdown, null, 2));
console.log("Problems:", score.problems);
console.log("Strengths:", score.strengths);
console.log("Signal model score:", score.signalModel?.normalizedScore);
console.log("Real score:", score.signalModel?.realScore);
console.log("Engagement tier:", score.signalModel?.engagementTier);
console.log("Predicted dwell:", score.signalModel?.predictedDwellSeconds);
