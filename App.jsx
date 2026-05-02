import { useState, useRef, useEffect, useCallback } from "react";

// ── Storage keys ──
const STORAGE_KEY_MESSAGES = "backhead:messages";
const STORAGE_KEY_APIKEY = "backhead:apikey";
const STORAGE_KEY_MODEL = "backhead:model";
const STORAGE_KEY_PREF = "backhead:storage-pref";

const SYSTEM_PROMPT = `You are Backhead — a journal observer and analyzer that helps people see what they cannot see themselves, especially the blind spots in their "back of the head."

Your purpose is NOT to give advice, NOT to therapize, NOT to fix. Your purpose is to observe, reflect, and ask questions that help the person see patterns, contradictions, and blind spots they might miss.

Language Rule: Always respond in the SAME language as the user's journal.
- If journal is in Chinese → respond in Chinese
- If journal is in English → respond in English
- If journal is mixed → respond in the primary language

Who you are:
- Warm but direct — no sugarcoating, no harsh judgment
- A wise observer with some distance — not a friend, not a therapist, somewhere in between
- Concise — you don't waste words unless the person asks for depth
- Uses examples and metaphors when they clarify, not to show off
- Willing to challenge assumptions, but gently

What you do:
1. Identify recurring patterns in emotions, behaviors, thoughts
2. Point out contradictions between what they say and what they do
3. See blind spots — things they write but don't seem aware of
4. Ask deep questions that make them pause and think
5. Help them understand emotional sources — not explain, but guide them to see
6. Challenge assumptions they're making without realizing
7. Be present — make them feel heard and seen
8. Help them understand what's going on from a third party's perspective

What you don't do:
- Don't give advice unless explicitly asked
- Don't pretend to be a therapist or use therapy jargon
- Don't be toxically positive
- Don't judge them
- Don't write long responses unless asked — default to concise

How you respond:
1. Brief acknowledgment (1 sentence)
2. 1-3 observations (specific, using their own words when possible)
3. 2-3 questions (pointed, not generic)
4. Optional: A closing reflection or prompt

Tone: Second person, specific not vague, questions should make them think not feel interrogated.
Length: 150-350 words (or 150-350 字 for Chinese). Only go longer if asked or journal is very complex.

If they continue the dialogue: Build on what they said, go deeper, ask follow-up questions. Don't repeat yourself.

Remember: You're Backhead. You see what's behind them, what they can't see. Be precise, be kind, be real.`;

const DEFAULT_MODEL = "anthropic/claude-sonnet-4-20250514";

const MODELS = [
  { id: "anthropic/claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.5-flash-preview", label: "Gemini 2.5 Flash" },
  { id: "deepseek/deepseek-chat", label: "DeepSeek V3" },
];

// ── Helpers ──
function loadLocal(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}
function saveLocal(key, val) {
  try { window.localStorage.setItem(key, JSON.stringify(val)); } catch {}
}
function clearLocal(key) {
  try { window.localStorage.removeItem(key); } catch {}
}

// ── Components ──

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, padding: "8px 0", alignItems: "end" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 5, height: 5, borderRadius: "50%",
          background: "#6a5f50",
          animation: `bh-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
        }} />
      ))}
    </div>
  );
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div style={{
      display: "flex",
      justifyContent: isUser ? "flex-end" : "flex-start",
      marginBottom: 20,
      animation: "bh-fadeIn 0.35s ease",
    }}>
      <div style={{
        maxWidth: "82%",
        padding: isUser ? "14px 18px" : "18px 22px",
        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
        background: isUser ? "#3a3228" : "transparent",
        border: isUser ? "none" : "1px solid #2a2520",
        color: isUser ? "#e0d8cc" : "#c8bfb0",
        fontSize: 15,
        lineHeight: 1.75,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {msg.content}
      </div>
    </div>
  );
}

// ── Onboarding Screen ──
function OnboardingScreen({ onComplete }) {
  const [apiKey, setApiKey] = useState(() => loadLocal(STORAGE_KEY_APIKEY, ""));
  const [model, setModel] = useState(() => loadLocal(STORAGE_KEY_MODEL, DEFAULT_MODEL));
  const [storagePref, setStoragePref] = useState(null); // "local" | "none"
  const [step, setStep] = useState(1); // 1=api key, 2=storage choice
  const [showKey, setShowKey] = useState(false);

  const handleNext = () => {
    if (!apiKey.trim()) return;
    setStep(2);
  };

  const handleFinish = (pref) => {
    setStoragePref(pref);
    if (pref === "local") {
      saveLocal(STORAGE_KEY_APIKEY, apiKey.trim());
      saveLocal(STORAGE_KEY_MODEL, model);
      saveLocal(STORAGE_KEY_PREF, pref);
    } else {
      // clear anything previously saved
      clearLocal(STORAGE_KEY_APIKEY);
      clearLocal(STORAGE_KEY_MODEL);
      clearLocal(STORAGE_KEY_PREF);
      clearLocal(STORAGE_KEY_MESSAGES);
    }
    onComplete({ apiKey: apiKey.trim(), model, storagePref: pref });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#141210",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Newsreader', 'Noto Serif SC', Georgia, serif",
      color: "#e0d8cc",
      padding: 24,
    }}>
      <div style={{
        width: "100%",
        maxWidth: 440,
        animation: "bh-fadeIn 0.5s ease",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            border: "1.5px solid #3a332a",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            fontSize: 24,
          }}>
            ◐
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>
            Backhead
          </h1>
          <p style={{
            fontSize: 13, color: "#5a5045", margin: "8px 0 0",
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em",
          }}>
            看见你看不见的自己
          </p>
        </div>

        {step === 1 && (
          <div style={{ animation: "bh-fadeIn 0.4s ease" }}>
            {/* API Key */}
            <label style={{
              display: "block", marginBottom: 8,
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "#6a5f50",
            }}>
              OpenRouter API Key
            </label>
            <div style={{ position: "relative", marginBottom: 20 }}>
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="sk-or-v1-..."
                style={{
                  width: "100%", background: "#1e1b17",
                  border: "1px solid #2a2520", borderRadius: 10,
                  color: "#e0d8cc", padding: "14px 48px 14px 16px",
                  fontSize: 14, fontFamily: "'DM Mono', monospace",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = "#8b7355"}
                onBlur={e => e.target.style.borderColor = "#2a2520"}
                onKeyDown={e => e.key === "Enter" && handleNext()}
              />
              <button onClick={() => setShowKey(!showKey)} style={{
                position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "#5a5045",
                cursor: "pointer", fontSize: 12, fontFamily: "'DM Mono', monospace",
              }}>
                {showKey ? "hide" : "show"}
              </button>
            </div>

            {/* Model */}
            <label style={{
              display: "block", marginBottom: 8,
              fontFamily: "'DM Mono', monospace", fontSize: 10,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "#6a5f50",
            }}>
              Model
            </label>
            <select
              value={model}
              onChange={e => setModel(e.target.value)}
              style={{
                width: "100%", background: "#1e1b17",
                border: "1px solid #2a2520", borderRadius: 10,
                color: "#e0d8cc", padding: "14px 16px",
                fontSize: 14, fontFamily: "'DM Mono', monospace",
                outline: "none", boxSizing: "border-box",
                appearance: "none", cursor: "pointer",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M3 5l3 3 3-3' stroke='%236a5f50' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              {MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>

            <div style={{
              fontSize: 12, color: "#4a4238", marginTop: 10, lineHeight: 1.5,
              fontStyle: "italic",
            }}>
              从 <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener"
                style={{ color: "#8b7355", textDecoration: "none", borderBottom: "1px solid #8b735544" }}>
                openrouter.ai/settings/keys
              </a> 获取你的 API Key
            </div>

            <button
              onClick={handleNext}
              disabled={!apiKey.trim()}
              style={{
                width: "100%", marginTop: 28,
                background: apiKey.trim() ? "#8b7355" : "#3a332a",
                color: apiKey.trim() ? "#141210" : "#6a5f50",
                border: "none", borderRadius: 10, padding: "14px",
                fontFamily: "'DM Mono', monospace", fontSize: 13,
                letterSpacing: "0.06em", textTransform: "uppercase",
                cursor: apiKey.trim() ? "pointer" : "not-allowed",
                transition: "all 0.2s ease",
              }}
            >
              继续 / Continue
            </button>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: "bh-fadeIn 0.4s ease" }}>
            <div style={{
              textAlign: "center", marginBottom: 32,
              fontSize: 15, color: "#a89c8c", lineHeight: 1.7,
            }}>
              你希望对话记录怎么处理？
              <br />
              <span style={{ fontSize: 13, color: "#6a5f50" }}>
                How should your conversations be handled?
              </span>
            </div>

            {/* Option: Save locally */}
            <button
              onClick={() => handleFinish("local")}
              style={{
                width: "100%", textAlign: "left",
                background: "#1e1b17", border: "1px solid #2a2520",
                borderRadius: 12, padding: "20px 22px",
                cursor: "pointer", marginBottom: 12,
                transition: "all 0.25s ease",
                color: "#e0d8cc",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b7355"; e.currentTarget.style.background = "#252119"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2520"; e.currentTarget.style.background = "#1e1b17"; }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
              }}>
                <span style={{ fontSize: 18 }}>◉</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 13,
                  letterSpacing: "0.04em", fontWeight: 400,
                }}>
                  保存到本地 / Save Locally
                </span>
              </div>
              <div style={{
                fontSize: 13, color: "#6a5f50", lineHeight: 1.6,
                paddingLeft: 30,
              }}>
                对话记录、API Key 和设置会保存在浏览器中。下次打开时自动恢复。
                <br />
                Chat history, API key & settings persist in your browser.
              </div>
            </button>

            {/* Option: No save */}
            <button
              onClick={() => handleFinish("none")}
              style={{
                width: "100%", textAlign: "left",
                background: "#1e1b17", border: "1px solid #2a2520",
                borderRadius: 12, padding: "20px 22px",
                cursor: "pointer", marginBottom: 24,
                transition: "all 0.25s ease",
                color: "#e0d8cc",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#8b7355"; e.currentTarget.style.background = "#252119"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2520"; e.currentTarget.style.background = "#1e1b17"; }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 12, marginBottom: 8,
              }}>
                <span style={{ fontSize: 18 }}>○</span>
                <span style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 13,
                  letterSpacing: "0.04em", fontWeight: 400,
                }}>
                  不保存 / Don't Save
                </span>
              </div>
              <div style={{
                fontSize: 13, color: "#6a5f50", lineHeight: 1.6,
                paddingLeft: 30,
              }}>
                关闭页面后一切清空，不留痕迹。每次都是全新开始。
                <br />
                Everything disappears when you close the tab. A clean start every time.
              </div>
            </button>

            <button onClick={() => setStep(1)} style={{
              background: "none", border: "none", color: "#4a4238",
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              cursor: "pointer", letterSpacing: "0.06em",
              display: "block", margin: "0 auto",
            }}>
              ← 返回 / Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ── Settings Drawer ──
function SettingsDrawer({ open, onClose, apiKey, model, storagePref, onUpdate, onClearHistory }) {
  const [key, setKey] = useState(apiKey);
  const [mod, setMod] = useState(model);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => { setKey(apiKey); setMod(model); }, [apiKey, model]);

  if (!open) return null;

  const handleSave = () => {
    onUpdate({ apiKey: key.trim(), model: mod });
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0,
        background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)",
      }} />
      <div style={{
        position: "relative", width: "100%", maxWidth: 360,
        background: "#1a1714", borderLeft: "1px solid #2a2520",
        padding: "28px 24px", overflowY: "auto",
        animation: "bh-slideIn 0.3s ease",
        fontFamily: "'Newsreader', 'Noto Serif SC', Georgia, serif",
        color: "#e0d8cc",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 32,
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, margin: 0 }}>设置 / Settings</h2>
          <button onClick={onClose} style={{
            background: "none", border: "none", color: "#6a5f50",
            fontSize: 20, cursor: "pointer", padding: 4,
          }}>✕</button>
        </div>

        {/* API Key */}
        <label style={{
          display: "block", marginBottom: 8,
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "#6a5f50",
        }}>API Key</label>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={e => setKey(e.target.value)}
            style={{
              width: "100%", background: "#1e1b17",
              border: "1px solid #2a2520", borderRadius: 8,
              color: "#e0d8cc", padding: "12px 44px 12px 14px",
              fontSize: 13, fontFamily: "'DM Mono', monospace",
              outline: "none", boxSizing: "border-box",
            }}
          />
          <button onClick={() => setShowKey(!showKey)} style={{
            position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", color: "#5a5045",
            cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace",
          }}>
            {showKey ? "hide" : "show"}
          </button>
        </div>

        {/* Model */}
        <label style={{
          display: "block", marginBottom: 8,
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          letterSpacing: "0.12em", textTransform: "uppercase", color: "#6a5f50",
        }}>Model</label>
        <select
          value={mod}
          onChange={e => setMod(e.target.value)}
          style={{
            width: "100%", background: "#1e1b17",
            border: "1px solid #2a2520", borderRadius: 8,
            color: "#e0d8cc", padding: "12px 14px",
            fontSize: 13, fontFamily: "'DM Mono', monospace",
            outline: "none", boxSizing: "border-box",
            appearance: "none", cursor: "pointer",
            marginBottom: 20,
          }}
        >
          {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
        </select>

        {/* Storage info */}
        <div style={{
          padding: "14px 16px", background: "#1e1b17",
          border: "1px solid #2a2520", borderRadius: 8,
          marginBottom: 20,
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "#6a5f50", marginBottom: 6,
          }}>
            储存模式 / Storage Mode
          </div>
          <div style={{ fontSize: 13, color: "#a89c8c" }}>
            {storagePref === "local"
              ? "◉ 保存到本地 — 对话和设置会保留"
              : "○ 不保存 — 关闭页面后清空"}
          </div>
        </div>

        <button onClick={handleSave} style={{
          width: "100%", background: "#8b7355", color: "#141210",
          border: "none", borderRadius: 8, padding: "12px",
          fontFamily: "'DM Mono', monospace", fontSize: 12,
          letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: "pointer", marginBottom: 12,
        }}>
          保存 / Save
        </button>

        <button onClick={() => { onClearHistory(); onClose(); }} style={{
          width: "100%", background: "transparent",
          color: "#6a5045", border: "1px solid #3a2a25",
          borderRadius: 8, padding: "12px",
          fontFamily: "'DM Mono', monospace", fontSize: 12,
          letterSpacing: "0.06em", textTransform: "uppercase",
          cursor: "pointer",
        }}>
          清空对话 / Clear History
        </button>
      </div>
    </div>
  );
}


// ── Main Chat ──
const WELCOME_MSG = {
  role: "assistant",
  content: "在这里写下你想说的。\n\n可以是今天发生的事，可以是一直在想的问题，也可以只是一团理不清的情绪。\n\nWrite whatever's on your mind — a journal entry, something you've been sitting with, or just a mess of feelings you can't untangle yet.\n\nI'll read carefully.",
};

export default function BackheadChat() {
  const [ready, setReady] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [storagePref, setStoragePref] = useState("none");
  const [messages, setMessages] = useState([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // On mount: check if we have saved state
  useEffect(() => {
    const savedPref = loadLocal(STORAGE_KEY_PREF, null);
    if (savedPref === "local") {
      const savedKey = loadLocal(STORAGE_KEY_APIKEY, "");
      const savedModel = loadLocal(STORAGE_KEY_MODEL, DEFAULT_MODEL);
      const savedMsgs = loadLocal(STORAGE_KEY_MESSAGES, [WELCOME_MSG]);
      if (savedKey) {
        setApiKey(savedKey);
        setModel(savedModel);
        setStoragePref("local");
        setMessages(savedMsgs.length > 0 ? savedMsgs : [WELCOME_MSG]);
        setReady(true);
      }
    }
  }, []);

  // Persist messages when they change (if local mode)
  useEffect(() => {
    if (ready && storagePref === "local") {
      saveLocal(STORAGE_KEY_MESSAGES, messages);
    }
  }, [messages, ready, storagePref]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  };

  const handleOnboardingComplete = ({ apiKey: k, model: m, storagePref: p }) => {
    setApiKey(k);
    setModel(m);
    setStoragePref(p);
    setReady(true);
  };

  const handleSettingsUpdate = ({ apiKey: k, model: m }) => {
    setApiKey(k);
    setModel(m);
    if (storagePref === "local") {
      saveLocal(STORAGE_KEY_APIKEY, k);
      saveLocal(STORAGE_KEY_MODEL, m);
    }
  };

  const handleClearHistory = () => {
    setMessages([WELCOME_MSG]);
    if (storagePref === "local") {
      saveLocal(STORAGE_KEY_MESSAGES, [WELCOME_MSG]);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    if (textareaRef.current) textareaRef.current.style.height = "auto";

    // Build API messages (skip welcome)
    const apiMessages = next
      .filter((_, i) => i > 0)
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": window.location.href,
          "X-Title": "Backhead Journal Observer",
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...apiMessages,
          ],
          max_tokens: 1200,
          temperature: 0.7,
        }),
      });

      const data = await res.json();

      if (data.error) {
        const errMsg = data.error?.message || JSON.stringify(data.error);
        setMessages(prev => [...prev, { role: "assistant", content: `⚠ ${errMsg}` }]);
      } else {
        const reply = data.choices?.[0]?.message?.content || "…";
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", content: `⚠ 连接失败 / Connection failed: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!ready) {
    return (
      <>
        <GlobalStyles />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#141210",
        fontFamily: "'Newsreader', 'Noto Serif SC', Georgia, serif",
        color: "#e0d8cc",
      }}>
        {/* Header */}
        <div style={{
          padding: "18px 24px 14px",
          borderBottom: "1px solid #1e1c18",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 20, color: "#6a5f50" }}>◐</span>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 400, margin: 0, letterSpacing: "-0.01em" }}>
                Backhead
              </h1>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 9, letterSpacing: "0.1em",
                color: "#3a332a", textTransform: "uppercase", marginTop: 1,
              }}>
                {storagePref === "local" ? "◉ 本地储存" : "○ 不储存"}
                {" · "}
                {MODELS.find(m => m.id === model)?.label || model}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {messages.length > 1 && (
              <button onClick={handleClearHistory} style={{
                background: "none", border: "none", color: "#3a332a",
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                cursor: "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
                padding: "6px 10px", borderRadius: 6,
                transition: "color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "#6a5f50"}
                onMouseLeave={e => e.currentTarget.style.color = "#3a332a"}
              >
                New
              </button>
            )}
            <button onClick={() => setSettingsOpen(true)} style={{
              background: "none", border: "1px solid #2a2520",
              color: "#5a5045", borderRadius: 6, padding: "5px 10px",
              cursor: "pointer", fontFamily: "'DM Mono', monospace",
              fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase",
              transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#5a5045"; e.currentTarget.style.color = "#8b7355"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#2a2520"; e.currentTarget.style.color = "#5a5045"; }}
            >
              设置
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="bh-messages" style={{
          flex: 1, overflowY: "auto", padding: "28px 24px 12px",
        }}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
          {loading && (
            <div style={{
              display: "flex", justifyContent: "flex-start",
              marginBottom: 20, animation: "bh-fadeIn 0.3s ease",
            }}>
              <div style={{
                padding: "14px 22px",
                borderRadius: "18px 18px 18px 4px",
                border: "1px solid #2a2520",
              }}>
                <TypingDots />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: "12px 24px 20px",
          borderTop: "1px solid #1e1c18",
          flexShrink: 0,
        }}>
          <div style={{
            display: "flex", alignItems: "flex-end", gap: 10,
            background: "#1e1b17", border: "1px solid #2a2520",
            borderRadius: 16, padding: "14px 16px",
          }}>
            <textarea
              ref={textareaRef}
              rows={1}
              placeholder="写点什么… / Write here…"
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize(); }}
              onKeyDown={handleKey}
              className="bh-textarea"
            />
            <button
              className={`bh-send ${input.trim() ? "has-text" : ""}`}
              onClick={send}
              disabled={!input.trim() || loading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#8b7355" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
          <div style={{
            textAlign: "center", marginTop: 8,
            fontFamily: "'DM Mono', monospace", fontSize: 9,
            letterSpacing: "0.08em", color: "#282420",
          }}>
            Shift + Enter for new line
          </div>
        </div>

        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          apiKey={apiKey}
          model={model}
          storagePref={storagePref}
          onUpdate={handleSettingsUpdate}
          onClearHistory={handleClearHistory}
        />
      </div>
    </>
  );
}


function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,300;1,6..72,400&family=Noto+Serif+SC:wght@400;600&family=DM+Mono:wght@300;400&display=swap');

      @keyframes bh-bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-6px); }
      }
      @keyframes bh-fadeIn {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bh-slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      .bh-textarea {
        width: 100%;
        background: transparent;
        border: none;
        outline: none;
        color: #e0d8cc;
        font-family: 'Newsreader', 'Noto Serif SC', Georgia, serif;
        font-size: 15px;
        line-height: 1.6;
        resize: none;
        padding: 0;
        box-sizing: border-box;
      }
      .bh-textarea::placeholder {
        color: #4a4238;
      }

      .bh-send {
        background: none;
        border: none;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.3;
        transition: opacity 0.2s ease;
        flex-shrink: 0;
      }
      .bh-send:hover { opacity: 0.8; }
      .bh-send.has-text { opacity: 0.6; }

      .bh-messages::-webkit-scrollbar { width: 3px; }
      .bh-messages::-webkit-scrollbar-track { background: transparent; }
      .bh-messages::-webkit-scrollbar-thumb { background: #2a2520; border-radius: 2px; }

      select option {
        background: #1e1b17;
        color: #e0d8cc;
      }
    `}</style>
  );
}