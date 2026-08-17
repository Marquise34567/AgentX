const { scorePost } = require("./engagementAlgo");
const { check } = require("./qualityChecker");

const example = "I built an AI video editor that saves 4 hours per video.\nMy last 10 videos were edited by AI.\nWatch time went up 2x.\nHere's the workflow nobody's talking about.";
const s = scorePost(example);
const q = check(example);
console.log("EXAMPLE POST (the one the user liked):");
console.log(example);
console.log();
console.log("Grade:", s.grade, "| Score:", s.score, "| Real:", s.signalModel.realScore, "| Quality:", q.score);
console.log("Top signals:", s.signalModel.topPositive.slice(0, 5).map(x => x.signal + " (+" + x.contribution + ")").join(", "));
console.log();

const ours = "Watchtime went up 2x after I started using AutoEditor.\nit saves me 4 hours per video.\nI tested it across 10 videos.\nhere's what I did differently.";
const s2 = scorePost(ours);
const q2 = check(ours);
console.log("OUR POST (system-generated):");
console.log(ours);
console.log();
console.log("Grade:", s2.grade, "| Score:", s2.score, "| Real:", s2.signalModel.realScore, "| Quality:", q2.score);
console.log("Top signals:", s2.signalModel.topPositive.slice(0, 5).map(x => x.signal + " (+" + x.contribution + ")").join(", "));
console.log();

// Try a better hook order
const better = "AutoEditor saves me 4 hours per video.\nI tested it across 10 videos.\nWatch time went up 2x.\nhere's the workflow nobody's talking about.";
const s3 = scorePost(better);
const q3 = check(better);
console.log("BETTER ORDER (lead with time saved):");
console.log(better);
console.log();
console.log("Grade:", s3.grade, "| Score:", s3.score, "| Real:", s3.signalModel.realScore, "| Quality:", q3.score);
console.log("Top signals:", s3.signalModel.topPositive.slice(0, 5).map(x => x.signal + " (+" + x.contribution + ")").join(", "));
