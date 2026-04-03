"use client";
import { useState, useEffect, useRef } from "react";

type Algorithm = "token" | "sliding" | "fixed";

export default function RateLimiter() {
  const [algo, setAlgo] = useState<Algorithm>("token");
  const [tokens, setTokens] = useState(10);
  const [fixedCount, setFixedCount] = useState(0);
  const [fixedReset, setFixedReset] = useState(10);
  const [log, setLog] = useState<{ id: number; status: "allowed" | "blocked" }[]>([]);
  const [firing, setFiring] = useState(false);
  const [allowed, setAllowed] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [slidingCount, setSlidingCount] = useState(0);
  const [speed, setSpeed] = useState(300);
  const [paused, setPaused] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [expStatus, setExpStatus] = useState<"allowed" | "blocked" | "">("");

  const tokensRef = useRef(10);
  const slidingRef = useRef<number[]>([]);
  const fixedCountRef = useRef(0);
  const fixedStartRef = useRef(Date.now());
  const reqIdRef = useRef(0);
  const pausedRef = useRef(false);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tokensRef.current < 10) {
        tokensRef.current = Math.min(10, tokensRef.current + 0.1);
        setTokens(Math.floor(tokensRef.current));
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - fixedStartRef.current) / 1000);
      const remaining = 10 - (elapsed % 10);
      setFixedReset(remaining);
      if (remaining === 10) { fixedCountRef.current = 0; setFixedCount(0); }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      slidingRef.current = slidingRef.current.filter(t => now - t < 10000);
      setSlidingCount(slidingRef.current.length);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const processRequest = () => {
    let ok = false;
    const id = ++reqIdRef.current;

    if (algo === "token") {
      if (tokensRef.current >= 1) {
        tokensRef.current -= 1;
        setTokens(Math.floor(tokensRef.current));
        ok = true;
        setExplanation("Request #" + id + " allowed — 1 token consumed. " + Math.floor(tokensRef.current) + " tokens left. Refilling at 2/sec.");
      } else {
        setExplanation("Request #" + id + " blocked — bucket empty! No tokens available. Wait for refill.");
      }
    } else if (algo === "sliding") {
      const now = Date.now();
      slidingRef.current = slidingRef.current.filter(t => now - t < 10000);
      if (slidingRef.current.length < 5) {
        slidingRef.current.push(now);
        setSlidingCount(slidingRef.current.length);
        ok = true;
        setExplanation("Request #" + id + " allowed — " + slidingRef.current.length + "/5 in last 10s. Dots slide left and disappear over time.");
      } else {
        setExplanation("Request #" + id + " blocked — 5/5 used in this window! Wait for oldest dot to slide off the left edge.");
      }
    } else {
      if (fixedCountRef.current < 5) {
        fixedCountRef.current++;
        setFixedCount(fixedCountRef.current);
        ok = true;
        setExplanation("Request #" + id + " allowed — " + fixedCountRef.current + "/5 slots used. Resets in " + fixedReset + "s.");
      } else {
        setExplanation("Request #" + id + " blocked — all 5 slots used! Resets in " + fixedReset + "s. Try firing right after reset!");
      }
    }

    setExpStatus(ok ? "allowed" : "blocked");
    if (ok) setAllowed(p => p + 1);
    else setBlocked(p => p + 1);
   setLog((prev: { id: number; status: "allowed" | "blocked" }[]) => [{ id, status: (ok ? "allowed" : "blocked") as "allowed" | "blocked" }, ...prev].slice(0, 20));
  };

  const fireBurst = async (): Promise<void> => {
    setFiring(true);
    for (let i = 0; i < 8; i++) {
      if (!pausedRef.current) processRequest();
      else i--;
      await new Promise(r => setTimeout(r, speed));
    }
    setFiring(false);
  };

  const reset = () => {
    tokensRef.current = 10; slidingRef.current = [];
    fixedCountRef.current = 0; fixedStartRef.current = Date.now();
    setTokens(10); setSlidingCount(0); setFixedCount(0);
    setLog([]); setAllowed(0); setBlocked(0);
    setExplanation(""); setExpStatus("");
  };

  const algoMeta = {
    token: { label: "Token Bucket", emoji: "🪣", tagline: "Allows bursts, limits sustained traffic" },
    sliding: { label: "Sliding Window", emoji: "🪟", tagline: "Rolling window, most accurate" },
    fixed: { label: "Fixed Window", emoji: "🗓️", tagline: "Simple blocks, has a boundary flaw" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c14", color: "white", fontFamily: "system-ui, sans-serif" }}>

      {/* NAVBAR */}
      <div style={{ borderBottom: "1px solid #1e2a3a", padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#3b82f6", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 4 }}>Interactive Visualizer</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>API Rate Limiter Visualizer</h1>
        </div>
        <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#4ade80", lineHeight: 1 }}>{allowed}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>ALLOWED</div>
          </div>
          <div style={{ width: 1, height: 50, background: "#1e2a3a" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#f87171", lineHeight: 1 }}>{blocked}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>BLOCKED</div>
          </div>
          <div style={{ width: 1, height: 50, background: "#1e2a3a" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: "#60a5fa", lineHeight: 1 }}>{allowed + blocked}</div>
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>TOTAL</div>
          </div>
        </div>
      </div>

      {/* ALGO TABS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", borderBottom: "1px solid #1e2a3a" }}>
        {(["token", "sliding", "fixed"] as Algorithm[]).map((a) => (
          <button key={a} onClick={() => { setAlgo(a); setExplanation(""); setExpStatus(""); }} style={{
            padding: "24px 32px", background: algo === a ? "#0f1f3d" : "transparent",
            border: "none", borderRight: "1px solid #1e2a3a",
            borderBottom: algo === a ? "3px solid #3b82f6" : "3px solid transparent",
            cursor: "pointer", textAlign: "left", transition: "all 0.2s",
          }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>{algoMeta[a].emoji}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: algo === a ? "white" : "#94a3b8", marginBottom: 4 }}>{algoMeta[a].label}</div>
            <div style={{ fontSize: 13, color: "#4b5563" }}>{algoMeta[a].tagline}</div>
            {algo === a && <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6", fontWeight: 700, letterSpacing: 1 }}>ACTIVE</div>}
          </button>
        ))}
      </div>

      {/* EXPLANATION BAR */}
      {explanation && (
        <div style={{
          padding: "16px 40px",
          background: expStatus === "blocked" ? "#1a0a0a" : "#0a1a0a",
          borderBottom: "1px solid #1e2a3a",
          fontSize: 15, fontWeight: 500,
          color: expStatus === "blocked" ? "#fca5a5" : "#86efac",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{expStatus === "blocked" ? "❌" : "✅"}</span>
          {explanation}
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", minHeight: "calc(100vh - 220px)" }}>

        {/* LEFT */}
        <div style={{ padding: "40px 48px", borderRight: "1px solid #1e2a3a" }}>

          {/* TOKEN BUCKET */}
          {algo === "token" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, alignItems: "center" }}>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <svg viewBox="0 0 200 220" style={{ width: "100%", maxWidth: 300, height: "auto" }}>
                    <path d="M 15 55 L 185 55 L 162 200 L 38 200 Z" fill="#0d1b2e" stroke="#1e3a5f" strokeWidth="2" />
                    <clipPath id="bc">
                      <path d="M 15 55 L 185 55 L 162 200 L 38 200 Z" />
                    </clipPath>
                    <rect x="0" y={55 + (145 * (1 - tokens / 10))} width="200" height="145"
                      fill={tokens > 5 ? "#1d4ed8" : tokens > 2 ? "#d97706" : "#dc2626"}
                      clipPath="url(#bc)" opacity="0.85" />
                    <path d="M 15 55 L 185 55 L 162 200 L 38 200 Z" fill="none"
                      stroke={tokens > 5 ? "#3b82f6" : tokens > 2 ? "#f59e0b" : "#ef4444"} strokeWidth="3" />
                    <path d="M 60 55 Q 100 18 140 55" fill="none" stroke="#475569" strokeWidth="3" strokeLinecap="round" />
                    <text x="100" y="135" textAnchor="middle" fill="white" fontSize="58" fontWeight="900">{tokens}</text>
                    <text x="100" y="162" textAnchor="middle" fill="#93c5fd" fontSize="15">tokens remaining</text>
                  </svg>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>Refill rate</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>2 tokens / sec</div>
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Token Bucket</h2>
                  <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                    Imagine a bucket filled with coins. Every API request spends one coin. Coins slowly refill automatically over time. Run out of coins — you are blocked until they refill!
                  </p>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                    <span>Empty</span>
                    <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{tokens}/10</span>
                    <span>Full</span>
                  </div>
                  <div style={{ background: "#1e2a3a", borderRadius: 10, height: 20, marginBottom: 20 }}>
                    <div style={{
                      height: 20, borderRadius: 10, transition: "width 0.3s",
                      background: tokens > 5 ? "#3b82f6" : tokens > 2 ? "#f59e0b" : "#ef4444",
                      width: (tokens / 10 * 100) + "%"
                    }} />
                  </div>
                  <div style={{
                    padding: "14px 18px", borderRadius: 12,
                    background: tokens > 5 ? "#0f2a1e" : tokens > 2 ? "#1a1205" : "#1a0505",
                    border: "1px solid " + (tokens > 5 ? "#14532d" : tokens > 2 ? "#78350f" : "#7f1d1d"),
                    fontSize: 15, fontWeight: 700,
                    color: tokens > 5 ? "#4ade80" : tokens > 2 ? "#fbbf24" : "#f87171",
                  }}>
                    {tokens > 5 ? "Healthy — requests allowed" : tokens > 2 ? "Low — use carefully" : tokens > 0 ? "Critical — almost empty!" : "Empty — all blocked!"}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { icon: "🪣", title: "Max Capacity", text: "Bucket holds 10 tokens maximum at any time", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🚀", title: "Cost Per Request", text: "Every API request consumes exactly 1 token", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "⏱️", title: "Auto Refill", text: "Tokens refill at 2 per second automatically", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "💥", title: "Burst Friendly", text: "Allows sudden bursts up to bucket capacity", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🚫", title: "When Blocked", text: "Empty bucket means request is instantly blocked", color: "#1a0505", border: "#7f1d1d" },
                  { icon: "📱", title: "Real World", text: "Like a mobile data plan — use it, wait for refill", color: "#0f2a1e", border: "#14532d" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "18px 20px", background: item.color, border: "1px solid " + item.border, borderRadius: 14 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDING WINDOW */}
          {algo === "sliding" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, alignItems: "center" }}>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 180, height: 180, borderRadius: "50%",
                    background: slidingCount >= 5 ? "#1a0505" : "#0f2a1e",
                    border: "4px solid " + (slidingCount >= 5 ? "#ef4444" : "#4ade80"),
                    display: "flex", flexDirection: "column",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ fontSize: 64, fontWeight: 900, color: slidingCount >= 5 ? "#f87171" : "#4ade80", lineHeight: 1 }}>{slidingCount}</div>
                    <div style={{ fontSize: 14, color: "#6b7280", marginTop: 4 }}>of 5 used</div>
                  </div>
                  <div style={{ marginTop: 16, fontSize: 14, color: "#6b7280", textAlign: "center" }}>
                    {5 - slidingCount > 0 ? (5 - slidingCount) + " slots available" : "Window full!"}
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Sliding Window</h2>
                  <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                    A 10-second window slides forward in real time. Each dot is a request. As time passes, dots slide left and fall off — automatically freeing up slots for new requests!
                  </p>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#6b7280", marginBottom: 10 }}>
                    <span>Empty</span>
                    <span style={{ color: "white", fontWeight: 700 }}>{slidingCount}/5</span>
                    <span>Full</span>
                  </div>
                  <div style={{ background: "#1e2a3a", borderRadius: 10, height: 20, marginBottom: 20 }}>
                    <div style={{
                      height: 20, borderRadius: 10, transition: "width 0.3s",
                      background: slidingCount >= 5 ? "#ef4444" : "#3b82f6",
                      width: (slidingCount / 5 * 100) + "%"
                    }} />
                  </div>
                  <div style={{
                    padding: "14px 18px", borderRadius: 12,
                    background: slidingCount >= 5 ? "#1a0505" : "#0f2a1e",
                    border: "1px solid " + (slidingCount >= 5 ? "#7f1d1d" : "#14532d"),
                    fontSize: 15, fontWeight: 700,
                    color: slidingCount >= 5 ? "#f87171" : "#4ade80",
                  }}>
                    {slidingCount >= 5 ? "Window full — blocked!" : "Requests allowed"}
                  </div>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#4b5563", marginBottom: 8 }}>
                  <span>10 seconds ago</span>
                  <span>RIGHT NOW</span>
                </div>
                <div style={{
                  background: "#0d1b2e", borderRadius: 20, height: 100,
                  position: "relative", overflow: "hidden",
                  border: "2px solid #1e3a5f", marginBottom: 16,
                }}>
                  <div style={{ position: "absolute", top: 10, left: 16, fontSize: 11, color: "#3b82f6", fontWeight: 600, letterSpacing: 1 }}>ACTIVE WINDOW</div>
                  {slidingRef.current.length === 0 && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151", fontSize: 14 }}>
                      Fire requests to see them appear here
                    </div>
                  )}
                  {slidingRef.current.map((t, i) => {
                    const age = (Date.now() - t) / 10000;
                    const x = 100 - age * 100;
                    return (
                      <div key={i} style={{
                        position: "absolute", top: "50%", transform: "translateY(-50%)",
                        left: Math.max(2, Math.min(90, x)) + "%",
                        width: 44, height: 44, borderRadius: "50%",
                        background: "#1d4ed8", border: "2px solid #3b82f6",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 15, fontWeight: 900, color: "white",
                        transition: "left 0.5s ease",
                      }}>
                        {i + 1}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { icon: "🪟", title: "Window Size", text: "Tracks requests in a rolling 10-second window", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🎯", title: "Max Requests", text: "Only 5 requests allowed per 10-second period", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "⏰", title: "Auto Expire", text: "Old requests drop off automatically as time passes", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🛡️", title: "No Boundary Bug", text: "Prevents burst attacks at window boundaries", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "💾", title: "Memory Cost", text: "Stores all timestamps — uses more memory than fixed", color: "#1a0f05", border: "#78350f" },
                  { icon: "📡", title: "Used By", text: "Stripe, AWS API Gateway, Cloudflare, Akamai", color: "#0f2a1e", border: "#14532d" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "18px 20px", background: item.color, border: "1px solid " + item.border, borderRadius: 14 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FIXED WINDOW */}
          {algo === "fixed" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32, alignItems: "center" }}>

                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <svg viewBox="0 0 100 100" style={{ width: 220, height: 220 }}>
                    <circle cx="50" cy="50" r="46" fill="#0d1b2e" stroke="#1e3a5f" strokeWidth="1.5" />
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#1e2a3a" strokeWidth="1" strokeDasharray="3 3" />
                    <circle cx="50" cy="50" r="46" fill="none" stroke="#1d4ed8"
                      strokeWidth="8"
                      strokeDasharray={(fixedReset / 10 * 289) + " 289"}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                    <text x="50" y="44" textAnchor="middle" fill="white" fontSize="26" fontWeight="900">{fixedReset}s</text>
                    <text x="50" y="62" textAnchor="middle" fill="#64748b" fontSize="10">until reset</text>
                  </svg>
                  <div style={{ textAlign: "center", marginTop: 12 }}>
                    <div style={{ fontSize: 13, color: "#6b7280" }}>Window size</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: "#60a5fa" }}>10 seconds</div>
                  </div>
                </div>

                <div>
                  <h2 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>Fixed Window</h2>
                  <p style={{ color: "#94a3b8", fontSize: 15, lineHeight: 1.8, margin: 0 }}>
                    5 requests allowed per 10-second block. When the clock hits zero, the counter resets completely. Simple and fast — but has a critical vulnerability at the boundary!
                  </p>
                </div>

                <div>
                  <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 12 }}>Slots used: {fixedCount}/5</div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 56, borderRadius: 10,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, fontWeight: 900, transition: "all 0.3s",
                        background: i <= fixedCount ? "#1d4ed8" : "#0d1b2e",
                        border: "2px solid " + (i <= fixedCount ? "#3b82f6" : "#1e2a3a"),
                        color: i <= fixedCount ? "white" : "#374151",
                      }}>
                        {i <= fixedCount ? "✓" : i}
                      </div>
                    ))}
                  </div>
                  <div style={{ background: "#1e2a3a", borderRadius: 10, height: 16, marginBottom: 14 }}>
                    <div style={{
                      height: 16, borderRadius: 10, transition: "width 0.3s",
                      background: fixedCount >= 5 ? "#ef4444" : "#3b82f6",
                      width: (fixedCount / 5 * 100) + "%"
                    }} />
                  </div>
                  <div style={{
                    padding: "14px 18px", borderRadius: 12,
                    background: fixedCount >= 5 ? "#1a0505" : "#0f2a1e",
                    border: "1px solid " + (fixedCount >= 5 ? "#7f1d1d" : "#14532d"),
                    fontSize: 15, fontWeight: 700,
                    color: fixedCount >= 5 ? "#f87171" : "#4ade80",
                  }}>
                    {fixedCount >= 5 ? "Blocked! Resets in " + fixedReset + "s" : "Requests allowed"}
                  </div>
                </div>
              </div>

              <div style={{ background: "#1a0505", border: "2px solid #7f1d1d", borderRadius: 20, padding: 28 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#fca5a5", marginBottom: 12 }}>The Boundary Vulnerability</div>
                <p style={{ fontSize: 15, color: "#fecaca", lineHeight: 1.7, margin: 0 }}>
                  Fire 5 requests at second 9, then 5 more at second 11 = <strong style={{ color: "#f87171" }}>10 requests in just 2 seconds!</strong> The window resets without knowing what happened right before it. This is exactly why sliding window was invented.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                {[
                  { icon: "🗓️", title: "Window Size", text: "Fixed 10-second blocks that reset on schedule", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🔢", title: "Request Limit", text: "Maximum 5 requests allowed per window block", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "🔄", title: "Hard Reset", text: "Counter resets to zero at end of each block", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "⚡", title: "Very Fast", text: "Just a counter — minimal memory and CPU usage", color: "#0f1f3d", border: "#1e3a5f" },
                  { icon: "⚠️", title: "Boundary Bug", text: "5 at second 9 + 5 at second 11 = 10 in 2 seconds!", color: "#1a0505", border: "#7f1d1d" },
                  { icon: "📖", title: "Why It Exists", text: "Simpler predecessor to sliding window algorithm", color: "#1a0f05", border: "#78350f" },
                ].map((item, i) => (
                  <div key={i} style={{ padding: "18px 20px", background: item.color, border: "1px solid " + item.border, borderRadius: 14 }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{item.icon}</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "white", marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.6 }}>{item.text}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column" }}>

          <div style={{ padding: 24, borderBottom: "1px solid #1e2a3a" }}>
            <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 2, marginBottom: 16, textTransform: "uppercase" }}>Fire Requests</div>

            <button onClick={processRequest} style={{
              width: "100%", padding: "16px", background: "#1d4ed8",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 16, fontWeight: 800, cursor: "pointer", marginBottom: 10,
            }}>
              Fire One Request
            </button>

            <button onClick={fireBurst} disabled={firing} style={{
              width: "100%", padding: "16px",
              background: firing ? "#4c1d95" : "#7c3aed",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 16, fontWeight: 800,
              cursor: firing ? "not-allowed" : "pointer", marginBottom: 16,
            }}>
              {firing ? "Firing..." : "Burst (8 requests)"}
            </button>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "#4b5563", letterSpacing: 1, marginBottom: 8, textTransform: "uppercase" }}>Burst Speed</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ label: "Slow", value: 800 }, { label: "Normal", value: 300 }, { label: "Fast", value: 80 }].map((s) => (
                  <button key={s.label} onClick={() => setSpeed(s.value)} style={{
                    flex: 1, padding: "8px 0", borderRadius: 8, border: "none",
                    background: speed === s.value ? "#1d4ed8" : "#0d1b2e",
                    color: speed === s.value ? "white" : "#6b7280",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setPaused(p => !p)} style={{
              width: "100%", padding: "12px", marginBottom: 8,
              background: paused ? "#065f46" : "#78350f",
              border: "none", borderRadius: 12, color: "white",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              {paused ? "Resume" : "Pause Burst"}
            </button>

            <button onClick={reset} style={{
              width: "100%", padding: "12px",
              background: "#0d1b2e", border: "1px solid #1e2a3a",
              borderRadius: 12, color: "#6b7280",
              fontSize: 14, fontWeight: 700, cursor: "pointer",
            }}>
              Reset Everything
            </button>
          </div>

          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 24px", borderBottom: "1px solid #1e2a3a", fontSize: 11, color: "#4b5563", letterSpacing: 2, textTransform: "uppercase" }}>
              Request Log
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {log.length === 0 && (
                <div style={{ textAlign: "center", color: "#374151", fontSize: 13, marginTop: 32 }}>No requests yet</div>
              )}
              {log.map((r) => (
                <div key={r.id} style={{
                  padding: "10px 14px", borderRadius: 10,
                  display: "flex", justifyContent: "space-between",
                  background: r.status === "allowed" ? "#052e16" : "#1a0505",
                  border: "1px solid " + (r.status === "allowed" ? "#14532d" : "#7f1d1d"),
                  color: r.status === "allowed" ? "#4ade80" : "#f87171",
                  fontSize: 13, fontWeight: 600,
                }}>
                  <span>#{r.id} — {r.status === "allowed" ? "ALLOWED" : "BLOCKED"}</span>
                  <span style={{ fontSize: 16 }}>{r.status === "allowed" ? "✅" : "❌"}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: 20, borderTop: "1px solid #1e2a3a", background: "#0d1b2e" }}>
            <div style={{ fontSize: 11, color: "#3b82f6", letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>Akamai Uses This For</div>
            {[
              { icon: "🛡️", text: "DDoS attack mitigation" },
              { icon: "⚡", text: "Edge API protection (4,000+ PoPs)" },
              { icon: "🔒", text: "Bot and credential stuffing prevention" },
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, fontSize: 13, color: "#94a3b8" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}