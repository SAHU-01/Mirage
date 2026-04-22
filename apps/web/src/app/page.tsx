"use client";

import { useState } from "react";
import axios from "axios";

const API = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:8000";

export default function Home() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [walletResult, setWalletResult] = useState<any>(null);
  const [tokenResult, setTokenResult] = useState<any>(null);
  const [chatId, setChatId] = useState("");
  const [subscribeMsg, setSubscribeMsg] = useState("");

  const analyze = async () => {
    if (!address) return;
    setLoading(true);
    setWalletResult(null);
    setTokenResult(null);
    setSubscribeMsg("");
    try {
      const response = await axios.post(`${API}/analyze`, { address });
      if (response.data.kind === "token") {
        setTokenResult(response.data.verdict);
      } else {
        setWalletResult(response.data.verdict);
      }
    } catch (error: any) {
      console.error(error);
      const detail = error?.response?.data?.detail;
      alert(detail || "Error analyzing address");
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    if (!chatId || !walletResult) return;
    try {
      await axios.post(`${API}/subscribe`, {
        chat_id: parseInt(chatId),
        wallet_address: walletResult.wallet_address,
      });
      setSubscribeMsg("Subscribed — you'll get exit alerts on Telegram.");
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      setSubscribeMsg(detail || "Subscribe failed.");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "var(--retro-green)";
    if (score >= 40) return "#fbbf24";
    return "#f87171";
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "COPY":
        return "retro-badge retro-badge-copy";
      case "AVOID":
        return "retro-badge retro-badge-avoid";
      default:
        return "retro-badge retro-badge-uncertain";
    }
  };

  return (
    <>
      {/* Floating pixel clouds */}
      <div
        className="pixel-cloud"
        style={{ top: 40, left: "10%", width: 80, height: 24 }}
      />
      <div
        className="pixel-cloud"
        style={{
          top: 80,
          left: "60%",
          width: 120,
          height: 28,
          animationDelay: "3s",
        }}
      />
      <div
        className="pixel-cloud"
        style={{
          top: 30,
          left: "80%",
          width: 60,
          height: 20,
          animationDelay: "5s",
        }}
      />

      <main className="relative z-20 pb-0">
        <div className="max-w-2xl mx-auto px-4 pt-8 space-y-5">
          {/* Header */}
          <header className="text-center space-y-2">
            <div className="inline-block retro-card px-6 py-4">
              <h1 className="text-xl tracking-wider retro-title">
                |MIRAGE
              </h1>
            </div>
            <p className="retro-subtitle">
              Anti-adversarial copy-trading
              <br />
              intelligence layer.
            </p>
          </header>

          {/* Navigation Buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            <a href="/docs" className="retro-btn">DOCS &gt;&gt;</a>
            <a href="https://t.me/Mirage4memeBot" target="_blank" rel="noopener noreferrer" className="retro-btn" style={{ background: "#dbeafe", borderColor: "#1e40af", boxShadow: "3px 3px 0px #1e40af" }}>TELEGRAM &gt;&gt;</a>
            <a href="#get-started" className="retro-btn retro-btn-primary">
              ANALYZE &gt;&gt;
            </a>
          </div>

          {/* Main Card */}
          <div id="get-started" className="retro-card space-y-4">
            <h2 className="retro-heading">|GET STARTED</h2>
            <p className="retro-text-light">
              Paste any BNB wallet or Four.meme token
              <br />
              address — auto-detected.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="0x... wallet or token address"
                className="retro-input flex-1"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && analyze()}
              />
              <button
                onClick={analyze}
                disabled={loading}
                className="retro-btn retro-btn-primary disabled:opacity-50"
              >
                {loading ? "SCANNING..." : "SCAN >>"}
              </button>
            </div>

            {/* Example addresses */}
            <div className="space-y-2">
              <p className="retro-label">Try an example</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Suspicious", addr: "0x9f2b4211f564a44e95cfa4fd6010029037777777", hint: "High bundle coeff (0.94) — likely bot", bg: "#fee2e2", border: "#991b1b" },
                  { label: "Clean Wallet", addr: "0x3a334c6748a437fb4144e72ea88b6a2dec7c5ef1", hint: "Zero bundles, high entropy — normal trader", bg: "#dcfce7", border: "#166534" },
                  { label: "Mixed Signals", addr: "0x5a5bd8dc6eabf5fe04273c1d989570288b6630ef", hint: "Some bundling, low tx count", bg: "#fef9c3", border: "#854d0e" },
                  { label: "CAKE Token", addr: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82", hint: "Token early buyer analysis", bg: "#dbeafe", border: "#1e40af" },
                ].map((ex) => (
                  <button
                    key={ex.addr}
                    onClick={() => setAddress(ex.addr)}
                    className="retro-btn"
                    style={{ fontSize: 7, background: ex.bg, borderColor: ex.border, boxShadow: `3px 3px 0px ${ex.border}` }}
                    title={ex.hint}
                  >
                    {ex.label}: {ex.addr.slice(0, 6)}...{ex.addr.slice(-4)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* How it works */}
          <div className="retro-card space-y-3">
            <h2 className="retro-heading">|HOW IT WORKS</h2>
            <div className="space-y-2">
              {[
                "Auto-detects wallet vs token contract",
                "Three AI agents reason in parallel (Coin, Wallet, Timing)",
                "Evidence-backed citations from on-chain data",
                "Final verdict: COPY, AVOID, or UNCERTAIN",
                "Subscribe for exit-signal alerts on Telegram",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="retro-accent mt-0.5">✦</span>
                  <span className="retro-text">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Wallet Results */}
          {walletResult && (
            <div className="retro-card space-y-4">
              <h2 className="retro-heading">|WALLET SCAN RESULTS</h2>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="space-y-1">
                  <p className="retro-label">Wallet</p>
                  <p className="retro-text break-all">
                    {walletResult.wallet_address}
                  </p>
                </div>
                <div className={getVerdictBadge(walletResult.verdict)}>
                  {walletResult.verdict}
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="retro-label">Trust Score</span>
                  <span className="retro-heading">
                    {walletResult.trust_score}/100
                  </span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${walletResult.trust_score}%`,
                      background: getScoreColor(walletResult.trust_score),
                    }}
                  />
                </div>
              </div>

              {/* Counter Argument */}
              {walletResult.counter_argument && (
                <div className="retro-trace">
                  <p className="retro-label" style={{ marginBottom: 6 }}>Counter Argument</p>
                  <p>&gt; {walletResult.counter_argument}</p>
                </div>
              )}

              {/* Reasoning Traces */}
              <div className="space-y-2">
                <p className="retro-label">Agent Reasoning</p>
                {walletResult.reasoning_trace.map((trace: any, i: number) => (
                  <div key={i} className="retro-trace space-y-2">
                    <p className="retro-label" style={{ color: "var(--retro-green)" }}>
                      {trace.agent.toUpperCase()} AGENT — Score: {trace.score}/100
                    </p>
                    {trace.findings.map((finding: string, j: number) => (
                      <p key={j}>&gt; {finding}</p>
                    ))}
                  </div>
                ))}
              </div>

              {/* Subscribe to exit alerts */}
              <div className="space-y-2">
                <p className="retro-label">Subscribe to Exit Alerts</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Telegram chat ID (use /chatid in bot)"
                    className="retro-input flex-1"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && subscribe()}
                  />
                  <button onClick={subscribe} className="retro-btn">
                    SUBSCRIBE
                  </button>
                </div>
                {subscribeMsg && (
                  <p className="retro-text" style={{ color: "var(--retro-green)" }}>
                    {subscribeMsg}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Token Results */}
          {tokenResult && (
            <div className="retro-card space-y-4">
              <h2 className="retro-heading">|TOKEN SCAN RESULTS</h2>

              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div className="space-y-1">
                  <p className="retro-label">Token</p>
                  <p className="retro-text break-all">
                    {tokenResult.metadata?.symbol
                      ? `${tokenResult.metadata.symbol} — ${tokenResult.token_address}`
                      : tokenResult.token_address}
                  </p>
                </div>
                <div className={getVerdictBadge(tokenResult.verdict)}>
                  {tokenResult.verdict}
                </div>
              </div>

              {/* Trust Score Bar */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="retro-label">Trust Score</span>
                  <span className="retro-heading">
                    {tokenResult.trust_score}/100
                  </span>
                </div>
                <div className="score-bar-bg">
                  <div
                    className="score-bar-fill"
                    style={{
                      width: `${tokenResult.trust_score}%`,
                      background: getScoreColor(tokenResult.trust_score),
                    }}
                  />
                </div>
              </div>

              {/* Token-specific signals */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="retro-trace flex-1">
                  <p className="retro-label" style={{ marginBottom: 6 }}>Bundle Contamination</p>
                  <p style={{ color: tokenResult.bundle_contamination_pct >= 50 ? "#f87171" : tokenResult.bundle_contamination_pct >= 20 ? "#fbbf24" : "var(--retro-green)" }}>
                    {tokenResult.bundle_contamination_pct}%
                  </p>
                </div>
                <div className="retro-trace flex-1">
                  <p className="retro-label" style={{ marginBottom: 6 }}>Graduation Prob.</p>
                  <p style={{ color: "var(--retro-green)" }}>
                    {(tokenResult.graduation_probability * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="retro-trace flex-1">
                  <p className="retro-label" style={{ marginBottom: 6 }}>Early Buyers</p>
                  <p className="retro-text">{tokenResult.total_early_buyers}</p>
                </div>
              </div>

              {/* Counter Argument */}
              {tokenResult.counter_argument && (
                <div className="retro-trace">
                  <p className="retro-label" style={{ marginBottom: 6 }}>Counter Argument</p>
                  <p>&gt; {tokenResult.counter_argument}</p>
                </div>
              )}

              {/* Ranked Buyers Table */}
              {tokenResult.ranked_buyers && tokenResult.ranked_buyers.length > 0 && (
                <div className="space-y-2">
                  <p className="retro-label">Ranked Early Buyers</p>
                  <div className="overflow-x-auto">
                    <table className="w-full" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th className="retro-label text-left" style={{ padding: "8px 6px", borderBottom: "2px solid var(--retro-border)" }}>#</th>
                          <th className="retro-label text-left" style={{ padding: "8px 6px", borderBottom: "2px solid var(--retro-border)" }}>Wallet</th>
                          <th className="retro-label text-left" style={{ padding: "8px 6px", borderBottom: "2px solid var(--retro-border)" }}>Score</th>
                          <th className="retro-label text-left" style={{ padding: "8px 6px", borderBottom: "2px solid var(--retro-border)" }}>Verdict</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tokenResult.ranked_buyers.map((buyer: any, i: number) => (
                          <tr key={i}>
                            <td className="retro-text" style={{ padding: "6px" }}>{i + 1}</td>
                            <td className="retro-text" style={{ padding: "6px" }}>
                              {buyer.wallet_address.slice(0, 6)}...{buyer.wallet_address.slice(-4)}
                            </td>
                            <td style={{ padding: "6px" }}>
                              <span className="retro-text" style={{ color: getScoreColor(buyer.trust_score) }}>
                                {buyer.trust_score}
                              </span>
                            </td>
                            <td style={{ padding: "6px" }}>
                              <span
                                className="retro-label"
                                style={{
                                  color: buyer.verdict === "COPY" ? "#15803d" : buyer.verdict === "AVOID" ? "#dc2626" : "#a16207",
                                  letterSpacing: "1px",
                                }}
                              >
                                {buyer.verdict}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 py-2" style={{ background: "rgba(245,240,232,0.85)", backdropFilter: "blur(4px)", borderTop: "2px solid var(--retro-border)" }}>
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p style={{ fontSize: 8, color: "#1a1a2e", fontWeight: "bold", textShadow: "1px 1px 0px rgba(245,240,232,0.8)" }}>
            MIRAGE &copy; 2026 &bull; BNB CHAIN
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <a href="/docs" style={{ fontSize: 8, color: "#1a1a2e", textDecoration: "none", fontWeight: "bold", textShadow: "1px 1px 0px rgba(245,240,232,0.8)" }}>DOCS</a>
            <a href="https://dorahacks.io/buidl/43379" target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: "#1a1a2e", textDecoration: "none", fontWeight: "bold", textShadow: "1px 1px 0px rgba(245,240,232,0.8)" }}>DORAHACKS</a>
            <a href="https://github.com/SAHU-01/Mirage/blob/main/PRD-2026-04-19.pdf" target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: "#1a1a2e", textDecoration: "none", fontWeight: "bold", textShadow: "1px 1px 0px rgba(245,240,232,0.8)" }}>PRD</a>
            <a href="https://github.com/SAHU-01/Mirage" target="_blank" rel="noopener noreferrer" style={{ fontSize: 8, color: "#1a1a2e", textDecoration: "none", fontWeight: "bold", textShadow: "1px 1px 0px rgba(245,240,232,0.8)" }}>GITHUB</a>
          </div>
          <div className="flex items-center gap-2">
            <a href="https://github.com/SAHU-01/Mirage" target="_blank" rel="noopener noreferrer" title="GitHub" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e", background: "#f5f0e8" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
            </a>
            <a href="https://t.me/Mirage4memeBot" target="_blank" rel="noopener noreferrer" title="Telegram Bot" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e", background: "#d4edda" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            </a>
            <a href="https://x.com/asahu_dev" target="_blank" rel="noopener noreferrer" title="Ankita on X" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e", background: "#f5f0e8" }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://www.linkedin.com/in/nikhil-kumar-18067a196/" target="_blank" rel="noopener noreferrer" title="Nikhil on LinkedIn" style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid #1a1a2e", background: "#dbeafe" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#1a1a2e"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
