"use strict";

// === API URL — configurable via settings, defaults to localhost ===
let API_URL = "http://localhost:3000";

// Load saved URL from chrome.storage
if (typeof chrome !== "undefined" && chrome.storage) {
  chrome.storage.local.get("apiUrl", (result) => {
    if (result.apiUrl) {
      API_URL = result.apiUrl;
      document.getElementById("api-url").value = result.apiUrl;
    }
  });
}

// Settings toggle
const settingsToggle = document.getElementById("settings-toggle");
const settingsPanel = document.getElementById("settings-panel");
const apiUrlInput = document.getElementById("api-url");

settingsToggle.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
});

apiUrlInput.addEventListener("change", () => {
  API_URL = apiUrlInput.value.trim().replace(/\/$/, "") || "http://localhost:3000";
  if (typeof chrome !== "undefined" && chrome.storage) {
    chrome.storage.local.set({ apiUrl: API_URL });
  }
});

const chat = document.getElementById("chat");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");
let lastSender = null;

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMarkdown(md) {
  const codeBlocks = [];
  md = md.replace(/```([\s\S]*?)```/g, (_, code) => {
    codeBlocks.push(code.replace(/\n$/, ""));
    return `\x00CB${codeBlocks.length - 1}\x00`;
  });

  let html = escapeHtml(md);

  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^&gt; (.+)$/gm, "<blockquote>$1</blockquote>");
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, "<em>$1</em>");
  html = html.replace(/`([^`\n]+?)`/g, (m, c) => `<code>${c}</code>`);

  html = html.replace(/(?:^|\n)((?:- .+(?:\n|$))+)/g, (block, items) => {
    const lis = items.trim().split("\n").map((l) => `<li>${l.replace(/^- /, "")}</li>`).join("");
    return `\n<ul>${lis}</ul>`;
  });

  html = html.split(/\n{2,}/).map((chunk) => {
    if (/^\s*<(h3|ul|ol|blockquote|hr|pre)/.test(chunk)) return chunk;
    if (!chunk.trim()) return "";
    return `<p>${chunk.replace(/\n/g, "<br>")}</p>`;
  }).join("\n");

  html = html.replace(/\x00CB(\d+)\x00/g, (_, i) => {
    const code = escapeHtml(codeBlocks[+i]);
    const id = `code-${Date.now()}-${i}`;
    // No onclick — use data attributes + event delegation
    return `<div class="code-block-wrap"><pre id="${id}"><code>${code}</code></pre><div class="code-actions"><button class="copy-btn" data-action="copy" data-target="${id}">copy</button><button class="schedule-btn" data-action="schedule" data-target="${id}">schedule</button></div></div>`;
  });
  return html;
}

function scrollBottom() {
  chat.scrollTop = chat.scrollHeight;
}

function copyCode(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = "copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1500);
  }).catch(() => {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
    btn.textContent = "copied!";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = "copy"; btn.classList.remove("copied"); }, 1500);
  });
}

function schedulePost(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const text = el.textContent.trim();
  if (!text) return;
  btn.textContent = "scheduling...";
  btn.disabled = true;
  fetch(`${API_URL}/api/postiz/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: text, platform: "x" }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.error) {
        btn.textContent = "error";
        setTimeout(() => { btn.textContent = "schedule"; btn.disabled = false; }, 2000);
        return;
      }
      if (data.scheduled) {
        btn.textContent = "posted ✓";
        btn.classList.add("copied");
        addMessage("assistant", `<div class="sched-confirm"><strong>Scheduled via Postiz ✓</strong><br>${escapeHtml(text)}<br><br><em>Time: ${data.scheduledAt}</em><br><em>Account: @${data.integration?.profile || "x"} (${data.integration?.platform || "x"})</em></div>`);
      } else {
        btn.textContent = "dry run ✓";
        btn.classList.add("copied");
        const time = data.scheduledLabel || "next best slot";
        const reason = data.reason === "no POSTIZ_API_KEY set"
          ? "Set <code>POSTIZ_API_KEY</code> env var to actually schedule."
          : escapeHtml(data.reason || "");
        addMessage("assistant", `<div class="sched-confirm"><strong>Dry run — not scheduled</strong><br>${escapeHtml(text)}<br><br><em>Would post at: ${time}</em><br><small>${reason}</small></div>`);
      }
      scrollBottom();
      setTimeout(() => { btn.textContent = "schedule"; btn.disabled = false; btn.classList.remove("copied"); }, 2500);
    })
    .catch(() => {
      btn.textContent = "error";
      setTimeout(() => { btn.textContent = "schedule"; btn.disabled = false; }, 2000);
    });
}

function addMessage(role, contentHtml) {
  const wrap = document.createElement("div");
  wrap.className = "msg-row " + role;
  if (lastSender === role) wrap.classList.add("consecutive");
  lastSender = role;
  const bub = document.createElement("div");
  bub.className = "bubble " + role;
  bub.innerHTML = contentHtml;
  wrap.appendChild(bub);
  chat.appendChild(wrap);
  scrollBottom();
  return bub;
}

function addTyping() {
  const wrap = document.createElement("div");
  wrap.className = "msg-row bot";
  wrap.id = "typing-msg";
  wrap.innerHTML = '<div class="bubble bot"><div class="typing"><span></span><span></span><span></span></div></div>';
  chat.appendChild(wrap);
  scrollBottom();
}
function removeTyping() {
  const t = document.getElementById("typing-msg");
  if (t) t.remove();
}

const WELCOME = `### AgentX

I generate and grade X posts on the real 2026 algorithm.

**What I can do:**
- **Generate tweets** — paste any topic or idea and I'll create 5 variations
- **Grade & rewrite** — paste a tweet and I'll score it + improve it
- **Outreach posts** — describe a deal or offer and I'll generate posts that attract your audience

Try a topic below or paste a tweet to grade.`;

setTimeout(() => { addMessage("bot", renderMarkdown(WELCOME)); }, 300);

async function send(text) {
  if (!text.trim()) return;
  addMessage("user", escapeHtml(text).replace(/\n/g, "<br>"));
  input.value = "";
  autoGrow();
  sendBtn.disabled = true;
  addTyping();
  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    const data = await res.json();
    removeTyping();
    const md = (data.reply && data.reply.markdown) || "_(no reply)_";
    addMessage("bot", renderMarkdown(md));
  } catch (e) {
    removeTyping();
    const errMsg = String(e).replace(/TypeError:/g, "").trim();
    addMessage("bot", `<p><strong>Connection error.</strong></p><p>Make sure your AgentX server is running at <code>${escapeHtml(API_URL)}</code></p><p><small>${escapeHtml(errMsg)}</small></p><p>Click the gear icon above to change the API URL.</p>`);
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

function autoGrow() {
  input.style.height = "auto";
  input.style.height = Math.min(120, input.scrollHeight) + "px";
}

sendBtn.addEventListener("click", () => send(input.value));
input.addEventListener("input", autoGrow);
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send(input.value);
  }
});

document.querySelectorAll(".hint").forEach((h) => {
  h.addEventListener("click", () => {
    input.value = h.dataset.text;
    autoGrow();
    send(h.dataset.text);
  });
});

// Event delegation for dynamically generated copy/schedule buttons
// (Can't use onclick= in Manifest V3 — CSP blocks inline handlers)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.dataset.action;
  const target = btn.dataset.target;
  if (action === "copy") copyCode(target, btn);
  else if (action === "schedule") schedulePost(target, btn);
});

input.focus();
