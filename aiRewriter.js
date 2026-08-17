/*
 * AI rewriter — LLM-powered post rewriting in the author's voice.
 *
 * BYOK (Bring Your Own Key): the user provides an API key for an
 * OpenAI-compatible endpoint. Uses fetch (Node 18+ global) — zero deps.
 *
 * Workflow:
 *   1. Score the draft with the rule-based engine → get problems + signals
 *   2. Build a prompt that includes:
 *      - The draft
 *      - The voice profile (from voiceProfile.js)
 *      - The specific signals to add (from engagementAlgo.js)
 *      - The target grade (A = 85+)
 *   3. Call the LLM
 *   4. Score the LLM output → if below target, feed back and retry (max 3)
 *   5. Return the best version + the iteration trace
 *
 * Falls back to the rule-based improver if no API key is set.
 */

"use strict";

const { scorePost } = require("./engagementAlgo");
const { improvePost } = require("./improver");
const { generateSelfReplyPackage } = require("./selfReplyEngine");

const TARGET_SCORE = 85.0;
const MAX_LLM_ROUNDS = 3;

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------
function buildRewritePrompt(draft, voiceProfile, scoreResult, opts = {}) {
  const problems = scoreResult.problems.length
    ? scoreResult.problems.map((p) => "- " + p).join("\n")
    : "- No major problems detected — polish for voice and impact.";
  const signals = scoreResult.signalsToAdd.length
    ? scoreResult.signalsToAdd.slice(0, 6).map((s) => "- " + s).join("\n")
    : "- No specific signals needed.";
  const breakdown = scoreResult.breakdown
    .filter((b) => b.score < 75)
    .map((b) => `- ${b.dimension}: ${b.score}/100 — ${b.note}`)
    .join("\n");

  const voiceDesc = voiceProfile ? voiceProfile.description : "No voice profile provided — use a confident, direct, conversational tone.";

  const includeSelfReply = opts.includeSelfReply;
  const selfReplySection = includeSelfReply
    ? `\n\nAlso generate a SELF-REPLY for this post — a reply the author posts immediately after to seed a conversation. The self-reply should:\n- Ask a specific question or make a contrarian addendum\n- Be short (under 200 chars)\n- Invite the audience to reply (the +75 reply-author-reply-back signal is the dominant one)\n- NOT repeat the original post or link-drop\n\nFormat the self-reply as:\nSELF-REPLY: <the self-reply text>`
    : "";

  return `You are an expert X (Twitter) ghostwriter who writes in the author's exact voice.

## Author's voice profile
${voiceDesc}

## The draft to rewrite
"""
${draft}
"""

## Current score: ${scoreResult.score}/100 (${scoreResult.grade})
## Verdict: ${scoreResult.verdict}

## Problems to fix
${problems}

## Weakest dimensions
${breakdown || "- All dimensions are adequate"}

## Signals to add (2026 X algorithm)
${signals}

## Rules
- Rewrite the post to score A grade (85+) on the 2026 X algorithm
- Match the author's voice EXACTLY — same sentence length, punctuation habits, hook style, emoji usage, tone
- Keep the core message and intent — don't invent claims the author didn't make
- First line must be 4-6 words, under 40 chars if possible
- No external links in the body (move to reply)
- No weak openers ("excited to share", "thrilled to announce", etc.)
- Statements beat questions 7× — but keep a reply invitation at the end
- Add one specific number if the draft lacks one
- Use line breaks for scanability
- Output ONLY the rewritten post, nothing else${selfReplySection}`;
}

function buildRefinementPrompt(current, scoreResult, voiceProfile) {
  const voiceDesc = voiceProfile ? voiceProfile.description : "";
  const remaining = scoreResult.signalsToAdd.filter((s) => !current.includes(s.slice(0, 20))).slice(0, 4);
  const problems = scoreResult.problems.map((p) => "- " + p).join("\n");

  return `This rewrite scored ${scoreResult.score}/100 (${scoreResult.grade}). Refine it further.

## Current version
"""
${current}
"""

## Still needs work
${problems}

## Remaining signals to add
${remaining.map((s) => "- " + s).join("\n") || "- Polish for maximum impact"}

## Author's voice
${voiceDesc}

## Rules
- Keep the same voice and core message
- Fix the remaining problems
- Output ONLY the refined post, nothing else`;
}

// ---------------------------------------------------------------------------
// LLM API call (OpenAI-compatible)
// ---------------------------------------------------------------------------
async function callLLM(prompt, opts) {
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY || process.env.AGENTX_API_KEY;
  if (!apiKey) throw new Error("No API key provided");

  const baseUrl = opts.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model = opts.model || process.env.AGENTX_MODEL || "gpt-4o";

  const body = {
    model,
    messages: [
      { role: "system", content: "You are an expert X/Twitter ghostwriter. You output only the rewritten post text, nothing else. No preamble, no explanation." },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 500,
  };

  const res = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`LLM API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("LLM returned empty response");
  return content;
}

// ---------------------------------------------------------------------------
// Extract post text from LLM response (handles self-reply format)
// ---------------------------------------------------------------------------
function parseLLMResponse(raw) {
  // If the response contains "SELF-REPLY:", split it
  const srIdx = raw.indexOf("SELF-REPLY:");
  if (srIdx >= 0) {
    const post = raw.slice(0, srIdx).trim().replace(/^[""]+|[""]+$/g, "").trim();
    const selfReply = raw.slice(srIdx + "SELF-REPLY:".length).trim().replace(/^[""]+|[""]+$/g, "").trim();
    return { post, selfReply };
  }
  // Strip surrounding quotes if present
  return { post: raw.replace(/^[""]+|[""]+$/g, "").trim(), selfReply: null };
}

// ---------------------------------------------------------------------------
// Main: AI-powered improve loop
// ---------------------------------------------------------------------------
async function improveWithAI(draft, opts = {}) {
  const voiceProfile = opts.voiceProfile || null;
  const includeSelfReply = opts.includeSelfReply || false;

  // If no API key, fall back to rule-based
  const apiKey = opts.apiKey || process.env.OPENAI_API_KEY || process.env.AGENTX_API_KEY;
  if (!apiKey) {
    const ruleResult = improvePost(draft);
    return {
      ...ruleResult,
      method: "rule-based (no API key — set OPENAI_API_KEY or pass apiKey)",
      aiPowered: false,
    };
  }

  const origResult = scorePost(draft);
  const iterations = [{ iteration: 0, candidate: draft, score: origResult.score, grade: origResult.grade, changes: ["original draft"] }];

  let current = draft;
  let currentScore = origResult.score;
  let currentGrade = origResult.grade;
  let selfReply = null;
  let converged = false;

  for (let i = 1; i <= MAX_LLM_ROUNDS; i++) {
    if (currentScore >= TARGET_SCORE) { converged = true; break; }

    const prompt = i === 1
      ? buildRewritePrompt(current, voiceProfile, origResult, { includeSelfReply })
      : buildRefinementPrompt(current, scorePost(current), voiceProfile);

    let raw;
    try {
      raw = await callLLM(prompt, opts);
    } catch (e) {
      // If LLM fails mid-loop, return what we have
      return {
        original: draft,
        originalScore: origResult.score,
        originalGrade: origResult.grade,
        final: current,
        finalScore: currentScore,
        finalGrade: currentGrade,
        iterations,
        converged,
        method: "ai (fell back at round " + i + ": " + e.message + ")",
        aiPowered: true,
        selfReply,
        timingAdvice: "Post Tue–Thu 8–11am ET (Wed 9am ET is the single best slot). The first 30–60 min of replies/reposts decide whether the algo pushes you to a broader audience.",
      };
    }

    const parsed = parseLLMResponse(raw);
    if (parsed.selfReply && !selfReply) selfReply = parsed.selfReply;

    const candidate = parsed.post;
    const candResult = scorePost(candidate);

    iterations.push({
      iteration: i,
      candidate,
      score: candResult.score,
      grade: candResult.grade,
      changes: i === 1 ? ["AI rewrite with voice profile"] : ["AI refinement round " + i],
    });

    if (candResult.score > currentScore) {
      current = candidate;
      currentScore = candResult.score;
      currentGrade = candResult.grade;
    }
  }

  converged = converged || currentScore >= TARGET_SCORE;

  // If self-reply was requested but LLM didn't provide one, generate via rule engine
  if (includeSelfReply && !selfReply) {
    try {
      const srPkg = generateSelfReplyPackage(current);
      selfReply = srPkg.selfReply;
    } catch { /* ignore */ }
  }

  return {
    original: draft,
    originalScore: origResult.score,
    originalGrade: origResult.grade,
    final: current,
    finalScore: Math.round(currentScore * 10) / 10,
    finalGrade: currentGrade,
    iterations,
    converged,
    method: "ai (voice-calibrated, " + (voiceProfile ? "profile active" : "no profile") + ")",
    aiPowered: true,
    selfReply,
    timingAdvice: "Post Tue–Thu 8–11am ET (Wed 9am ET is the single best slot). The first 30–60 min of replies/reposts decide whether the algo pushes you to a broader audience.",
  };
}

module.exports = {
  improveWithAI,
  buildRewritePrompt,
  buildRefinementPrompt,
  callLLM,
  parseLLMResponse,
  TARGET_SCORE,
  MAX_LLM_ROUNDS,
};
