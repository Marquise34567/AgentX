const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`[CONSOLE] ${msg.text()}`); });
  page.on("pageerror", (err) => errors.push(`[PAGE] ${err.message}`));

  console.log("1. Loading page...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle" });
  console.log("   Title:", await page.title());

  // Check iMessage styling
  const headerText = await page.textContent("header");
  console.log("   Header:", headerText?.replace(/\s+/g, " ").trim().slice(0, 50));
  const hasDateSep = await page.$(".date-sep");
  console.log("   Has date separator:", !!hasDateSep);

  // Test outreach topic
  console.log("\n2. Testing outreach topic...");
  const ta = await page.$("textarea");
  await ta.fill("hey I saw that your a pro editor, love the edits btw. Wanted to ask If your interested in giving me raw footage, allowing me to put it thru my retention editing software and when the video is done, you react to it. In return i could put you in the affiliate program and give you a free subscription?");
  await page.$("button").then(btn => btn.click());
  await page.waitForTimeout(5000);

  // Check user bubble (right-aligned, blue)
  const userBubble = await page.$(".msg-row.user .bubble.user");
  console.log("   User bubble exists:", !!userBubble);
  if (userBubble) {
    const bg = await userBubble.evaluate(el => getComputedStyle(el).backgroundColor);
    console.log("   User bubble bg:", bg);
  }

  // Check bot bubble (left-aligned, dark)
  const botBubbles = await page.$$(".msg-row.bot .bubble.bot");
  console.log("   Bot bubbles count:", botBubbles.length);
  if (botBubbles.length > 0) {
    const lastBot = botBubbles[botBubbles.length - 1];
    const text = await lastBot.textContent();
    console.log("   Last bot text (first 200):", text?.slice(0, 200));
    const bg = await lastBot.evaluate(el => getComputedStyle(el).backgroundColor);
    console.log("   Bot bubble bg:", bg);
  }

  await page.screenshot({ path: "test_imessage_1.png", fullPage: true });
  console.log("   Screenshot saved: test_imessage_1.png");

  // Test random topic
  console.log("\n3. Testing random topic...");
  const ta2 = await page.$("textarea");
  await ta2.fill("building a fitness app for busy professionals");
  await page.$("button").then(btn => btn.click());
  await page.waitForTimeout(4000);

  const botBubbles2 = await page.$$(".msg-row.bot .bubble.bot");
  if (botBubbles2.length > 0) {
    const lastBot = botBubbles2[botBubbles2.length - 1];
    const text = await lastBot.textContent();
    console.log("   Response type check:", text?.includes("Sprint") ? "SPRINT (good)" : text?.includes("Draft") ? "GRADED (bad)" : "unknown");
    console.log("   Response (first 300):", text?.slice(0, 300));
  }

  await page.screenshot({ path: "test_imessage_2.png", fullPage: true });
  console.log("   Screenshot saved: test_imessage_2.png");

  // Test score command
  console.log("\n4. Testing score command...");
  const ta3 = await page.$("textarea");
  await ta3.fill("score: I spent 18 months building features nobody asked for. Then I deleted 80% of my product. MRR went up 3x.");
  await page.$("button").then(btn => btn.click());
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "test_imessage_3.png", fullPage: true });
  console.log("   Screenshot saved: test_imessage_3.png");

  if (errors.length) {
    console.log("\n=== ERRORS ===");
    errors.forEach(e => console.log(e));
  } else {
    console.log("\n=== No errors ===");
  }

  await browser.close();
  console.log("\nDone.");
})();
