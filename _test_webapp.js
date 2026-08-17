const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];

  // Capture console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") results.push(`[CONSOLE ERROR] ${msg.text()}`);
  });
  page.on("pageerror", (err) => results.push(`[PAGE ERROR] ${err.message}`));

  console.log("1. Loading http://localhost:3000...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 10000 });
  console.log("   Page loaded. Title:", await page.title());

  // Check the chatbox exists
  const chatInput = await page.$("textarea, input[type='text'], #chat-input, .chat-input");
  if (!chatInput) {
    // Try to find any input
    const allInputs = await page.$$("input, textarea");
    console.log(`   Found ${allInputs.length} input elements`);
    for (const inp of allInputs) {
      const tag = await inp.evaluate(el => el.tagName);
      const id = await inp.getAttribute("id");
      const cls = await inp.getAttribute("class");
      const placeholder = await inp.getAttribute("placeholder");
      console.log(`   - ${tag} id=${id} class=${cls} placeholder=${placeholder}`);
    }
  }

  // Take a screenshot
  await page.screenshot({ path: "test_screenshot_1.png", fullPage: true });
  console.log("   Screenshot saved: test_screenshot_1.png");

  // Try to find the chat input and send a message
  console.log("\n2. Testing chat with outreach topic...");

  // Find the textarea or input
  const inputEl = await page.$("textarea") || await page.$("input[type='text']");
  if (inputEl) {
    await inputEl.fill("hey I saw that your a pro editor, love the edits btw. Wanted to ask If your interested in giving me raw footage, allowing me to put it thru my retention editing software and when the video is done, you react to it. In return i could put you in the affiliate program and give you a free subscription?");

    // Find and click the send button, or press Enter
    const sendBtn = await page.$("button[type='submit'], button.send, #send, .send-btn, button");
    if (sendBtn) {
      console.log("   Clicking send button...");
      await sendBtn.click();
    } else {
      console.log("   No send button found, pressing Enter...");
      await inputEl.press("Enter");
    }

    // Wait for response
    console.log("   Waiting for response...");
    await page.waitForTimeout(5000);

    // Take screenshot of result
    await page.screenshot({ path: "test_screenshot_2.png", fullPage: true });
    console.log("   Screenshot saved: test_screenshot_2.png");

    // Get the response text
    const responseText = await page.evaluate(() => {
      const messages = document.querySelectorAll(".message, .reply, .response, .chat-message, .assistant, [class*='message'], [class*='reply'], [class*='response']");
      return Array.from(messages).map(m => m.textContent?.slice(0, 200)).join("\n---\n");
    });
    console.log("   Response preview:", responseText?.slice(0, 500));

    // Get full page text for debugging
    const fullText = await page.evaluate(() => document.body.innerText);
    console.log("\n   Full page text (first 2000 chars):");
    console.log(fullText.slice(0, 2000));
  } else {
    console.log("   ERROR: No input element found!");
  }

  // Test 3: sprint command
  console.log("\n3. Testing sprint command...");
  const inputEl2 = await page.$("textarea") || await page.$("input[type='text']");
  if (inputEl2) {
    await inputEl2.fill("sprint: building a SaaS");
    const sendBtn2 = await page.$("button[type='submit'], button.send, #send, .send-btn, button");
    if (sendBtn2) await sendBtn2.click();
    else await inputEl2.press("Enter");

    await page.waitForTimeout(3000);
    await page.screenshot({ path: "test_screenshot_3.png", fullPage: true });
    console.log("   Screenshot saved: test_screenshot_3.png");
  }

  // Test 4: score command
  console.log("\n4. Testing score command...");
  const inputEl3 = await page.$("textarea") || await page.$("input[type='text']");
  if (inputEl3) {
    await inputEl3.fill("score: I spent 18 months building features nobody asked for. Then I deleted 80% of my product. MRR went up 3x.");
    const sendBtn3 = await page.$("button[type='submit'], button.send, #send, .send-btn, button");
    if (sendBtn3) await sendBtn3.click();
    else await inputEl3.press("Enter");

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "test_screenshot_4.png", fullPage: true });
    console.log("   Screenshot saved: test_screenshot_4.png");
  }

  // Test 5: API endpoint directly
  console.log("\n5. Testing API endpoint directly...");
  const apiResponse = await page.evaluate(async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "hey I saw that your a pro editor, love the edits btw. Wanted to ask If your interested in giving me raw footage, allowing me to put it thru my retention editing software and when the video is done, you react to it. In return i could put you in the affiliate program and give you a free subscription?"
      }),
    });
    const data = await res.json();
    return { status: res.status, type: data.reply?.type, markdown: data.reply?.markdown?.slice(0, 500) };
  });
  console.log("   API status:", apiResponse.status);
  console.log("   API type:", apiResponse.type);
  console.log("   API reply preview:", apiResponse.markdown?.slice(0, 300));

  // Test 6: Health check
  console.log("\n6. Testing health endpoint...");
  const health = await page.evaluate(async () => {
    const res = await fetch("/api/health");
    return res.json();
  });
  console.log("   Health:", JSON.stringify(health));

  if (results.length) {
    console.log("\n=== ERRORS ===");
    results.forEach(r => console.log(r));
  } else {
    console.log("\n=== No console/page errors ===");
  }

  await browser.close();
  console.log("\nDone.");
})();
