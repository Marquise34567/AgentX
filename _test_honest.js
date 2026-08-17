const { scorePost } = require("./engagementAlgo");
const { check } = require("./qualityChecker");

const post = "autoeditor is changing the world of ai video editing\nthe old way is dead.\nthis is the hill I'll die on.";

const s = scorePost(post);
const q = check(post);

console.log("=== HONEST ASSESSMENT ===");
console.log();
console.log("POST:");
console.log(post);
console.log();
console.log("Grade:", s.grade);
console.log("Score:", s.score);
console.log("Real algorithm score:", s.signalModel.realScore);
console.log("Quality:", q.score + "/100");
console.log("Is slop:", q.isSlop);
console.log();
console.log("Issues:");
for (const issue of q.issues) console.log("  -", issue);
console.log();
console.log("Top signals:");
for (const sig of s.signalModel.topPositive.slice(0, 5)) {
  console.log("  " + sig.signal + ": +" + sig.contribution);
}
console.log();
console.log("=== WHAT WOULD ACTUALLY GET ENGAGEMENT ===");
console.log();

// Compare with a story-based post
const storyPost = "I built an AI video editor that saves 4 hours per video.\nMy last 10 videos were edited by AI.\nWatch time went up 2x.\nHere's the workflow nobody's talking about.";
const s2 = scorePost(storyPost);
const q2 = check(storyPost);
console.log("STORY VERSION:");
console.log(storyPost);
console.log();
console.log("Grade:", s2.grade, "| Score:", s2.score, "| Quality:", q2.score + "/100");
console.log();

// Compare with a contrarian post
const contrarianPost = "AI video editing isn't about saving time.\nIt's about making videos you wouldn't have made at all.\nThe best creators aren't faster. They're bolder.";
const s3 = scorePost(contrarianPost);
const q3 = check(contrarianPost);
console.log("CONTRARIAN VERSION:");
console.log(contrarianPost);
console.log();
console.log("Grade:", s3.grade, "| Score:", s3.score, "| Quality:", q3.score + "/100");
console.log();

// Compare with a data/proof post
const dataPost = "I tested 50 videos: AI editing vs manual.\nAI was 3x faster.\nViewers watched 40% longer.\nThe data is undeniable.";
const s4 = scorePost(dataPost);
const q4 = check(dataPost);
console.log("DATA/PROOF VERSION:");
console.log(dataPost);
console.log();
console.log("Grade:", s4.grade, "| Score:", s4.score, "| Quality:", q4.score + "/100");
