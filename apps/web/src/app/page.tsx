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

      <main className="relative z-20 min-h-screen pb-40">
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
            <a href="/docs" className="retro-btn">DOCS ↗</a>
            <a href="https://t.me/Mirage4memeBot" target="_blank" rel="noopener noreferrer" className="retro-btn">TELEGRAM ↗</a>
            <a href="#get-started" className="retro-btn retro-btn-primary">
              ANALYZE ↗
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
                {loading ? "SCANNING..." : "SCAN →"}
              </button>
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

          {/* Footer */}
          <div className="text-center pb-8">
            <p className="retro-footer">
              MIRAGE © 2026 • BNB CHAIN • FOUR.MEME
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
